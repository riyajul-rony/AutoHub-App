"use client";

import React, { useState, useActionState } from "react";
import { submitOnboardingAction } from "@/server/onboarding/actions";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  Checkbox,
  ThemeToggle,
} from "@/components/ui";

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
  { id: "outreach", label: "Cold Outreach", desc: "Cold email campaigns with sender account rotation" },
  { id: "followup", label: "Smart Follow-up", desc: "Automated sequence replies until response received" },
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
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Top Header with Brand & Theme Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-text text-sm tracking-tight select-none">
          <span className="w-6 h-6 rounded-[5px] bg-primary text-primary-text flex items-center justify-center text-xs font-mono font-bold">
            A
          </span>
          <span>AutoHub Workspace Setup</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-1">
        {[
          { num: 1, label: "Profile" },
          { num: 2, label: "Goals" },
          { num: 3, label: "Configuration" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            {idx > 0 ? (
              <div
                className={`h-px w-10 transition-colors ${
                  step >= s.num ? "bg-primary" : "bg-border"
                }`}
              />
            ) : null}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step > s.num
                    ? "bg-primary text-primary-text"
                    : step === s.num
                    ? "bg-primary text-primary-text"
                    : "border border-border-input bg-surface text-text-subtle"
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : s.num}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  step === s.num ? "font-semibold text-text" : "text-text-subtle"
                }`}
              >
                {s.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Main Wizard Card */}
      <Card>
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
            <>
              <CardHeader>
                <CardTitle>1. Business Profile</CardTitle>
                <CardDescription>
                  This informs AI content generation and automated scheduling timezones.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Business or Project Name"
                  placeholder="e.g. Acme Studio"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />

                <Select
                  label="Industry Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States"
                  />
                  <Input
                    label="Timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. America/New_York"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (!businessName.trim()) {
                        alert("Please enter your business or project name.");
                        return;
                      }
                      setStep(2);
                    }}
                    icon={<ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
                  >
                    Continue to Goals
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* STEP 2: Goals */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>2. Primary Automation Goals</CardTitle>
                <CardDescription>
                  Select the engines you plan to use first. You can always adjust this later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {MODULE_OPTIONS.map((m) => {
                    const isSelected = selectedGoals.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleGoal(m.id)}
                        className={`p-3.5 rounded-[6px] border cursor-pointer select-none transition-colors ${
                          isSelected
                            ? "border-primary bg-bg-subtle text-text"
                            : "border-border bg-surface hover:bg-surface-hover text-text-muted"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-text leading-tight">{m.label}</p>
                            <p className="text-[11px] text-text-muted mt-1 leading-normal">{m.desc}</p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-[4px] border shrink-0 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-primary border-primary text-primary-text"
                                : "border-border-input bg-surface"
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3" strokeWidth={2.5} /> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/50">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setStep(1)}
                    icon={<ArrowLeft className="w-4 h-4" strokeWidth={1.5} />}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => setStep(3)}
                    icon={<ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
                  >
                    Continue to Configuration
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* STEP 3: Configuration */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>3. Final Configuration</CardTitle>
                <CardDescription>
                  Optionally provide your OpenAI API key for AI generation, or connect it later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="OpenAI API Key (Optional)"
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  helperText="Your key is encrypted with AES-256-GCM. If omitted, platform limits apply."
                />

                {state?.error ? (
                  <div
                    role="alert"
                    className="rounded-[6px] border border-danger/30 bg-danger-bg p-2.5 text-xs text-danger font-medium"
                  >
                    {state.error}
                  </div>
                ) : null}

                <div className="pt-2 flex items-center justify-between border-t border-border/50">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={pending}
                    onClick={() => setStep(2)}
                    icon={<ArrowLeft className="w-4 h-4" strokeWidth={1.5} />}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={pending}
                    icon={<Check className="w-4 h-4" strokeWidth={1.5} />}
                  >
                    Finish Setup & Enter Hub
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
