
export const metadata = {
  title: "Replies & Inbound — AutoHub",
  description: "Track incoming responses, unsubscribes, and bounces detected from your inboxes.",
};

export default function RepliesPage() {
  const replies = [
    { from: "dr.rahim@apexdental.com", name: "Dr. Rahim", subject: "Re: Quick inquiry regarding your dental clinic", time: "Today, 11:20 AM", snippet: "Hello, sounds interesting. Can you send over a pricing brochure for your software?" },
    { from: "karim@dhakabraces.com", name: "Karim Chowdhury", subject: "Re: Partnership opportunity", time: "Yesterday, 04:15 PM", snippet: "Thanks for reaching out! Let's arrange a 15-minute call next Tuesday at 3 PM." },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Replies & Inbound Activity</h1>
        <p className="mt-1 text-sm text-muted">
          Auto-detected via IMAP / Gmail poller. Followup sequences are immediately stopped for prospects who reply.
        </p>
      </div>

      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="text-lg font-bold">Recent Prospect Responses</h2>

        <div className="divide-y divide-border">
          {replies.map((r, i) => (
            <div key={i} className="py-4 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{r.name}</span>
                  <span className="badge text-xs font-mono">{r.from}</span>
                </div>
                <span className="text-xs text-muted">{r.time}</span>
              </div>
              <div className="text-xs font-medium text-brand-2">{r.subject}</div>
              <p className="text-xs text-muted line-clamp-2 italic bg-surface-2 p-2.5 rounded-xl mt-1">
                &ldquo;{r.snippet}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
