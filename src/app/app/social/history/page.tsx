import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostHistoryManager } from "@/components/social/post-history-manager";
import { requireUser } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Post History & Approval Queue — AutoHub",
  description: "Review, approve, and track published social media posts.",
};

export default async function SocialHistoryPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link
          href="/app/social"
          className="hover:text-fg transition-colors flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft size={14} /> Back to Social Hub
        </Link>
      </div>

      <PageHeader
        title="Post History & Approval Queue"
        description="Review, approve, or generate AI posts across all connected Facebook, Instagram, and LinkedIn accounts."
      />

      {/* Dynamic Interactive Manager */}
      <PostHistoryManager />
    </div>
  );
}
