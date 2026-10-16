"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export interface FollowupStep {
  step_no: number;
  delay_days: number;
  mode: "custom" | "ai";
  subject_template: string;
  body_template: string;
  ai_instruction?: string;
}

export function FollowupEditor({
  campaignId,
  initialSequenceName,
  initialSteps,
}: {
  campaignId: string;
  initialSequenceName: string;
  initialSteps: FollowupStep[];
}) {
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sequenceName, setSequenceName] = useState(initialSequenceName || "Campaign Followup Sequence");
  const [steps, setSteps] = useState<FollowupStep[]>(initialSteps || []);

  const handleAddStep = () => {
    if (steps.length >= 5) return;
    const newStepNo = steps.length + 1;
    setSteps([
      ...steps,
      {
        step_no: newStepNo,
        delay_days: newStepNo === 1 ? 3 : 4,
        mode: "custom",
        subject_template: "Re: {{previous_subject}}",
        body_template:
          "Hi {{first_name|there}},\n\nWanted to check back in regarding {{company_name|your business}}. Did you have any questions?\n\nBest,\nAlex",
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, idx) => ({
      ...s,
      step_no: idx + 1,
    }));
    setSteps(updated);
  };

  const handleUpdateStep = (index: number, updates: Partial<FollowupStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updates };
    setSteps(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/v1/outreach/campaigns/${campaignId}/sequence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sequenceName,
          steps,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save sequence");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving sequence");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href={`/app/outreach/${campaignId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Back to Campaign
          </Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
        >
          <Save size={14} className="mr-1.5" /> {saving ? "Saving..." : "Save Sequence"}
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} /> Sequence updated successfully!
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Sequence Name */}
      <Card>
        <CardContent className="p-5 space-y-2">
          <Input
            label="Sequence Name"
            type="text"
            value={sequenceName}
            onChange={(e) => setSequenceName(e.target.value)}
            className="w-full text-sm font-medium"
          />
        </CardContent>
      </Card>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <Card key={idx}>
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Step Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand font-semibold text-sm">
                    {step.step_no}
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm text-fg">Followup Step #{step.step_no}</h3>
                    <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> Dispatched {step.delay_days} days after previous email
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStep(idx)}
                  className="text-muted hover:text-red-500"
                  title="Remove step"
                >
                  <Trash2 size={15} />
                </Button>
              </div>

              {/* Delay & Mode Controls */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">
                    Delay After Previous Email (Days)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={step.delay_days}
                    onChange={(e) => handleUpdateStep(idx, { delay_days: Number(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted block mb-1.5">Step Mode</label>
                  <select
                    value={step.mode}
                    onChange={(e) => handleUpdateStep(idx, { mode: e.target.value as any })}
                    className="w-full h-9 rounded-[6px] border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  >
                    <option value="custom">Custom Template (Recommended for Threading)</option>
                    <option value="ai">AI Dynamic Bump</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <Input
                  label="Subject Line"
                  type="text"
                  value={step.subject_template}
                  onChange={(e) => handleUpdateStep(idx, { subject_template: e.target.value })}
                  className="font-mono text-xs"
                  placeholder="Re: {{previous_subject}}"
                  helperText="Keep as Re: {{previous_subject}} to nest inside the original Gmail/Outlook thread."
                />
              </div>

              {/* Body */}
              <div>
                <Textarea
                  label="Email Body"
                  value={step.body_template}
                  onChange={(e) => handleUpdateStep(idx, { body_template: e.target.value })}
                  rows={5}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="Hi {{first_name|there}},&#10;&#10;Just bumping this..."
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Step Button */}
      {steps.length < 5 && (
        <button
          onClick={handleAddStep}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border hover:border-brand/60 text-muted hover:text-fg bg-surface hover:bg-surfaceHover transition text-xs font-medium"
        >
          <Plus size={15} /> Add Followup Step ({steps.length}/5)
        </button>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={14} className="mr-1.5" /> {saving ? "Saving..." : "Save Sequence Changes"}
        </Button>
      </div>
    </div>
  );
}
