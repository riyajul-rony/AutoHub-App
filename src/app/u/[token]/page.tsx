import { CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { db } from "@/server/db";

export const metadata = {
  title: "Unsubscribe Confirmation — AutoHub",
  description: "You have been successfully removed from future outreach emails.",
};

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Find recipient by unguessable unsubscribe token
  const recipient = await db.campaign_recipients.findFirst({
    where: { unsubscribe_token: token },
  });

  const email = recipient?.email;
  let alreadyUnsubscribed = false;

  if (recipient) {
    // 1. Mark recipient status as unsubscribed and cancel any scheduled followups
    await db.campaign_recipients.update({
      where: { id: recipient.id },
      data: { status: "unsubscribed", next_followup_at: null },
    });

    // 2. Add to suppressions list so NO future campaigns can ever email them
    const existingSuppression = await db.suppressions.findFirst({
      where: {
        user_id: recipient.user_id,
        email: recipient.email.toLowerCase(),
      },
    });

    if (!existingSuppression) {
      await db.suppressions.create({
        data: {
          user_id: recipient.user_id,
          email: recipient.email.toLowerCase(),
          reason: "unsubscribed",
          source_campaign_id: recipient.campaign_id,
        },
      });
    } else {
      alreadyUnsubscribed = true;
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center space-y-6 shadow-sm">
        {recipient ? (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-fg">Unsubscribed Successfully</h1>
              <p className="text-xs text-muted leading-relaxed">
                Your email address <strong className="text-fg">{email}</strong> has been permanently removed from this sender&apos;s contact list.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-bgSubtle border border-border text-xs text-muted space-y-2 text-left">
              <div className="flex items-center gap-2 text-fg font-semibold">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" /> Compliance Guarantee
              </div>
              <p className="text-[11px] leading-relaxed">
                Your email is now permanently registered on the suppression exclusion list. You will not receive further automated followups or outreach campaigns from this sender.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 mx-auto">
              <AlertCircle size={36} />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-fg">Unsubscribe Link Expired</h1>
              <p className="text-xs text-muted leading-relaxed">
                This unsubscribe request link is invalid or has already been processed. If you are still receiving emails, please reply with &quot;Unsubscribe&quot; directly.
              </p>
            </div>
          </>
        )}

        <div className="pt-2 text-[11px] text-muted">
          Powered by AutoHub &bull; Safe &amp; Compliant Cold Outreach
        </div>
      </div>
    </div>
  );
}
