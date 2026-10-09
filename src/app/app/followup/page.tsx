import { Plus } from "lucide-react";

export const metadata = {
  title: "Followup Sequences — AutoHub",
  description: "Automate sequence followup emails in the same thread until the prospect replies.",
};

export default function FollowupOverviewPage() {
  const sequences = [
    {
      id: "1",
      name: "Dhaka Dentists 3-Step Sequence",
      campaign: "Dhaka Dentists Automation Pitch",
      steps: 3,
      status: "Active",
      stats: "Step 1: 120 sent | Step 2: 78 sent | Step 3: 42 sent",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Followup Sequences</h1>
          <p className="mt-1 text-sm text-muted">
            Automatically sends follow-ups in the same email thread with In-Reply-To headers. Stops immediately when a reply is detected.
          </p>
        </div>
        <button className="btn btn-primary self-start">
          <Plus size={16} /> New Sequence
        </button>
      </div>

      <div className="glass rounded-3xl p-6 divide-y divide-border">
        {sequences.map((s) => (
          <div key={s.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{s.name}</span>
                <span className="badge border-accent-green/40 text-accent-green">{s.status}</span>
                <span className="badge">{s.steps} Steps</span>
              </div>
              <div className="text-xs text-muted mt-1">
                Linked Campaign: {s.campaign} • {s.stats}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-ghost text-xs !py-1.5">Configure Steps</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
