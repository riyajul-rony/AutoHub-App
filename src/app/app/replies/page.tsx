import Link from "next/link";
import { MessageSquare, Mail, Calendar, ArrowRight, ShieldCheck, Inbox } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/pagination";

export const metadata = {
  title: "Replies Inbox — Lead Reach AI",
  description: "Track responses from cold outreach leads with stop-on-reply detection.",
};

export default async function RepliesInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const userId = user.id;

  const sp = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  // Fetch incoming replies with pagination and ordered latest first
  const [replies, totalRepliesCount] = await Promise.all([
    db.email_messages.findMany({
      where: {
        user_id: userId,
        direction: "in",
      },
      take: pageSize,
      skip,
      orderBy: { sent_at: "desc" },
      select: {
        id: true,
        subject: true,
        snippet: true,
        in_reply_to: true,
        sent_at: true,
        recipient_id: true,
        recipient: {
          select: {
            email: true,
            name: true,
            company: true,
          },
        },
      },
    }),
    db.email_messages.count({
      where: {
        user_id: userId,
        direction: "in",
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <PageHeader
        title="Replies & Inbound Leads"
        description="Incoming responses detected via IMAP. Stop-on-reply protection automatically halts followups."
        actions={
          <Link href="/app/outreach">
            <Button variant="secondary" size="sm">
              View Campaigns
            </Button>
          </Link>
        }
      />

      {replies.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Inbox size={20} />}
            title="No Replies Yet"
            description="When prospective leads reply to your cold emails, our background IMAP poller captures them automatically and surfaces them here."
            actionLabel="Launch an Outreach Campaign"
            actionHref="/app/outreach/new"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-muted flex items-center justify-between">
            <span>Showing recent responses ({replies.length})</span>
            <span className="flex items-center gap-1.5 text-[var(--badge-success-text)] font-medium">
              <ShieldCheck size={14} /> Stop-On-Reply Active
            </span>
          </div>

          <Card className="divide-y divide-border overflow-hidden transition-colors duration-150 hover:border-borderStrong">
            {replies.map((reply: any) => (
              <div
                key={reply.id}
                className="p-5 hover:bg-surface-hover transition-colors duration-150 flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-fg truncate">
                      {reply.subject || "Reply to outreach"}
                    </span>
                    <Badge variant="success" size="sm" dot>
                      Replied
                    </Badge>
                  </div>

                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {reply.snippet || "No message body preview"}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {reply.sent_at ? new Date(reply.sent_at).toLocaleString() : "Recently"}
                    </span>
                    {reply.in_reply_to && (
                      <span className="font-mono text-xs text-muted truncate max-w-[200px]">
                        Ref: {reply.in_reply_to}
                      </span>
                    )}
                  </div>
                </div>

                {reply.recipient_id && (
                  <Link
                    href={`/app/outreach`}
                    className="self-end sm:self-center shrink-0"
                  >
                    <Button variant="ghost" size="sm">
                      View Lead <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </Card>

          <Pagination
            currentPage={currentPage}
            totalCount={totalRepliesCount}
            pageSize={pageSize}
            basePath="/app/replies"
            searchParams={sp}
          />
        </div>
      )}
    </div>
  );
}
