import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function SocialHistoryPage() {
  const posts = [
    {
      id: "1",
      platform: "Facebook",
      caption: "5 Interior design hacks to transform small modern apartments into cozy sanctuaries. Which one is your favorite?",
      status: "published",
      time: "Today, 10:00 AM",
      link: "https://facebook.com",
    },
    {
      id: "2",
      platform: "Facebook",
      caption: "Prime commercial office space now available in Gulshan-2. High foot traffic, dedicated parking, and full power backup.",
      status: "pending_approval",
      time: "Scheduled for 06:00 PM",
      link: null,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/app/social" className="hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Social Hub
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Post History & Approval Queue</h1>
        <p className="mt-1 text-sm text-muted">Review, approve, or regenerate AI posts across all social accounts.</p>
      </div>

      <div className="space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="glass rounded-3xl p-6 flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="badge font-bold">{p.platform}</span>
                {p.status === "published" ? (
                  <span className="badge border-accent-green/40 text-accent-green flex items-center gap-1">
                    <CheckCircle2 size={12} /> Published
                  </span>
                ) : (
                  <span className="badge border-accent-amber/40 text-accent-amber flex items-center gap-1">
                    <AlertCircle size={12} /> Pending Approval
                  </span>
                )}
                <span className="text-xs text-muted">{p.time}</span>
              </div>
              <p className="text-sm text-fg leading-relaxed">{p.caption}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {p.status === "pending_approval" ? (
                <>
                  <button className="btn btn-primary text-xs !py-1.5">Approve & Post</button>
                  <button className="btn btn-ghost text-xs !py-1.5" title="Regenerate">
                    <RefreshCw size={14} />
                  </button>
                </>
              ) : (
                <a href={p.link || "#"} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs !py-1.5">
                  View Live Post
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
