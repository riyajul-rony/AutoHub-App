import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostHistoryManager } from "@/components/social/post-history-manager";

export const metadata = {
  title: "Post History & Approval Queue — AutoHub",
  description: "Review, approve, and track published social media posts.",
};

export default function SocialHistoryPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/app/social" className="hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Social Hub
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Post History & Approval Queue</h1>
        <p className="mt-1 text-sm text-muted">
          Review, approve, or generate AI posts across all connected Facebook, Instagram, and LinkedIn accounts.
        </p>
      </div>

      {/* Dynamic Interactive Manager */}
      <PostHistoryManager />
    </div>
  );
}
