"use client";

import { useState, useActionState } from "react";
import { submitOnboardingAction } from "@/server/onboarding/actions";
import { Zap, Check, ArrowRight, ArrowLeft } from "lucide-react";

const CATEGORIES = [
  "Real Estate",
  "Restaurant & Food",
  "E-commerce & Retail",
  "Fitness & Wellness",
  "Education & Coaching",
  "Healthcare & Clinic",
  "Beauty & Salon",
  "Legal & Finance",
  "Travel & Hospitality",
  "Agency & Marketing",
  "Tech & SaaS",
  "Other",
];

const MODULE_OPTIONS = [
  { id: "social", label: "Social Media Auto Post", desc: "AI image & caption generation posted on schedule" },
  { id: "leads", label: "Lead Generation", desc: "Find qualified business leads and export to Sheet/CSV" },
  { id: "outreach", label: "Outreach", desc: "Cold email campaigns with sender account rotation" },
  { id: "followup", label: "Followup", desc: "Automated sequence replies until response received" },
];

export function OnboardingWizard({
  initialTimezone,
  userEmail: _userEmail,
}: {
  initialTimezone: string;
  userEmail: string;
}) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [country, setCountry] = useState("Bangladesh");
  const [timezone, setTimezone] = useState(initialTimezone || "Asia/Dhaka");
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["social", "leads"]);
  const [openaiKey, setOpenaiKey] = useState("");

  const [state, formAction, pending] = useActionState(submitOnboardingAction, undefined);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2">
          <Zap size={24} />
        </div>
        <h1 className="text-3xl font-bold">Welcome to AutoHub</h1>
        <p className="mt-2 text-sm text-muted">Complete these 3 quick steps to set up your workspace.</p>

        {/* Steps indicator */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-brand text-white shadow-lg shadow-brand/30"
                    : step > s
                    ? "bg-accent-green text-white"
                    : "bg-surface-2 text-muted border border-border"
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-10 ${step > s ? "bg-accent-green" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-8">
        <form action={formAction}>
          {/* Hidden inputs to preserve step state on submit */}
          <input type="hidden" name="business_name" value={businessName} />
          <input type="hidden" name="business_category" value={category} />
          <input type="hidden" name="country" value={country} />
          <input type="hidden" name="timezone" value={timezone} />
          {selectedGoals.map((g) => (
            <input key={g} type="hidden" name="goals" value={g} />
          ))}
          <input type="hidden" name="openai_key" value={openaiKey} />

          {/* STEP 1: Profile */}
          {step === 1 && (
            <div className="space-y-4 float-in">
              <h2 className="text-xl font-semibold">1. Business Profile</h2>
              <p className="text-xs text-muted">This informs AI generation and your automated scheduling timezone.</p>

              <div>
                <label className="label">Business / Brand Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Acme Studio"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-surface-2 text-fg">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Country</label>
                  <input
                    type="text"
                    className="input"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Timezone (MUST)</label>
                  <input
                    type="text"
                    className="input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  disabled={!businessName.trim()}
                  onClick={() => setStep(2)}
                >
                  Next: Goals <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Goals */}
          {step === 2 && (
            <div className="space-y-4 float-in">
              <h2 className="text-xl font-semibold">2. What are your main goals?</h2>
              <p className="text-xs text-muted">Select the modules you plan to use. All modules remain fully accessible.</p>

              <div className="space-y-3">
                {MODULE_OPTIONS.map((m) => {
                  const active = selectedGoals.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleGoal(m.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        active
                          ? "border-brand bg-brand/10 shadow-sm"
                          : "border-border bg-surface hover:border-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">{m.label}</div>
                          <div className="text-xs text-muted">{m.desc}</div>
                        </div>
                        <div
                          className={`grid h-5 w-5 place-items-center rounded-md border ${
                            active ? "border-brand bg-brand text-white" : "border-border"
                          }`}
                        >
                          {active && <Check size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  onClick={() => setStep(3)}
                >
                  Next: API Key <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BYOK (Optional) */}
          {step === 3 && (
            <div className="space-y-4 float-in">
              <h2 className="text-xl font-semibold">3. OpenAI API Key (BYOK)</h2>
              <p className="text-xs text-muted">
                Bring Your Own Key. Text & image generation costs are billed to your OpenAI account. You can skip this and add it later in Settings.
              </p>

              <div>
                <label className="label">OpenAI Key (Optional)</label>
                <input
                  type="password"
                  className="input font-mono text-xs"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
              </div>

              {state?.error && (
                <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setStep(2)}
                  disabled={pending}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={pending}
                >
                  {pending ? "Finishing..." : "Complete & Enter Hub →"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
