"use client";

import React from "react";
import { Plus, Trash2, Clock, CornerDownRight, MessageSquare, Sparkles } from "lucide-react";

export interface FollowupStepData {
  step_no: number;
  delay_days: number;
  subject: string;
  body: string;
  same_thread: boolean;
}

interface FollowupStepBuilderProps {
  steps: FollowupStepData[];
  onChange: (steps: FollowupStepData[]) => void;
  originalSubject?: string;
}

const PRESET_TEMPLATES = [
  {
    label: "Quick Bump (3 Days)",
    delay: 3,
    sameThread: true,
    body: "Hi {{first_name|there}},\n\nJust bumping this to the top of your inbox in case it got buried.\n\nWould love to know your thoughts on this when you have a moment!\n\nBest,\nAlex",
  },
  {
    label: "Value Add / Proof (5 Days)",
    delay: 5,
    sameThread: true,
    body: "Hi {{first_name|there}},\n\nWanted to share a quick case study: We helped a team similar to {{company_name|yours}} increase their appointment bookings by 35% in 30 days using automated outreach.\n\nAre you free for 5 minutes this Thursday or Friday to see how we did it?\n\nBest,\nAlex",
  },
  {
    label: "Polite Break-up (7 Days)",
    delay: 7,
    sameThread: true,
    body: "Hi {{first_name|there}},\n\nI haven't heard back, so I assume this isn't a priority for {{company_name|your team}} right now. Completely understand!\n\nI won't reach out again, but feel free to keep my contact info handy if your goals change down the line.\n\nWishing you all the best,\nAlex",
  },
];

export function FollowupStepBuilder({ steps, onChange, originalSubject = "" }: FollowupStepBuilderProps) {
  const handleAddStep = (preset?: typeof PRESET_TEMPLATES[0]) => {
    const nextStepNo = steps.length + 1;
    const newStep: FollowupStepData = {
      step_no: nextStepNo,
      delay_days: preset?.delay || 3,
      same_thread: preset?.sameThread ?? true,
      subject: preset?.sameThread ? `Re: ${originalSubject || "Our chat"}` : `Quick followup for {{company_name}}`,
      body:
        preset?.body ||
        "Hi {{first_name|there}},\n\nJust following up on my previous message. Would you have 5 minutes for a quick chat this week?\n\nBest,\nAlex",
    };
    onChange([...steps, newStep]);
  };

  const handleUpdateStep = (index: number, updates: Partial<FollowupStepData>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleRemoveStep = (index: number) => {
    const filtered = steps.filter((_, i) => i !== index);
    // Renumber remaining steps
    const renumbered = filtered.map((s, i) => ({ ...s, step_no: i + 1 }));
    onChange(renumbered);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CornerDownRight className="w-3.5 h-3.5 text-brand" />
            <span>Automated Follow-up Sequence ({steps.length} {steps.length === 1 ? "step" : "steps"})</span>
          </h4>
          <p className="text-[11px] text-muted">
            Follow-ups automatically STOP if the recipient replies or unsubscribes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_TEMPLATES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddStep(preset)}
              className="btn btn-ghost text-[10px] py-1 px-2 text-muted hover:text-foreground"
            >
              + {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleAddStep()}
            className="btn btn-primary text-xs py-1 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Follow-up
          </button>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="p-6 rounded-2xl bg-surface/30 border border-border/60 text-center space-y-2">
          <Clock className="w-8 h-8 mx-auto text-muted/60" />
          <div className="text-xs font-medium text-foreground">No Follow-up Steps Added</div>
          <p className="text-[11px] text-muted max-w-sm mx-auto">
            Adding 1-3 follow-ups increases response rates by up to 250%. Use the preset buttons above to add follow-up steps.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="border border-border/80 rounded-2xl p-4 bg-surface/40 space-y-3 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge text-[10px] border-brand/40 text-brand font-semibold">
                    Follow-up Step #{step.step_no}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="w-3 h-3" />
                    <span>Send</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={step.delay_days}
                      onChange={(e) =>
                        handleUpdateStep(idx, { delay_days: Math.max(1, Number(e.target.value)) })
                      }
                      className="input py-0.5 px-2 w-14 text-center font-mono text-xs"
                    />
                    <span>days after {idx === 0 ? "initial email" : `Step #${idx}`}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={step.same_thread}
                      onChange={(e) =>
                        handleUpdateStep(idx, { same_thread: e.target.checked })
                      }
                      className="checkbox checkbox-xs"
                    />
                    <span>Send in same thread (Re:)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Remove follow-up step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {!step.same_thread && (
                <div>
                  <label className="text-[11px] font-semibold text-muted block mb-1">
                    Separate Subject Line
                  </label>
                  <input
                    type="text"
                    value={step.subject}
                    onChange={(e) => handleUpdateStep(idx, { subject: e.target.value })}
                    className="input w-full text-xs"
                    placeholder="e.g. Quick question regarding {{company_name}}"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-muted block mb-1">
                  Follow-up Message Body
                </label>
                <textarea
                  rows={4}
                  value={step.body}
                  onChange={(e) => handleUpdateStep(idx, { body: e.target.value })}
                  className="input w-full font-mono text-xs"
                  placeholder="Hi {{first_name}}, following up on my previous note..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
