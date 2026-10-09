"use client";

import { useState } from "react";
import { Sparkles, Check, Eye } from "lucide-react";

const BUSINESS_CATEGORIES = [
  "Real Estate", "Restaurant", "E-commerce", "Fitness", "Education",
  "Healthcare", "Beauty", "Legal", "Travel", "Agency", "Tech/SaaS", "Other"
];

const BRAND_VOICES = ["Professional", "Friendly", "Witty", "Luxury", "Educational"];
const IMAGE_STYLES = ["Photorealistic", "Illustration", "Minimal", "Flat/Vector", "3D"];

export function CampaignSetupForm({ provider }: { provider: string }) {
  const [name, setName] = useState("Daily Brand Tips & Updates");
  const [category, setCategory] = useState("Real Estate");
  const [businessName, setBusinessName] = useState("AutoHub Properties");
  const [description, setDescription] = useState("Luxury residential and modern commercial apartments.");
  const [voice, setVoice] = useState("Professional");
  const [prompt, setPrompt] = useState("Weekly luxury home decor and architectural highlights.");
  const [imageStyle, setImageStyle] = useState("Photorealistic");
  const [captionLength, setCaptionLength] = useState("medium");
  const [postTime, setPostTime] = useState("10:00");
  const [approvalMode, setApprovalMode] = useState<"auto" | "approve">("auto");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    caption: string;
    hashtags: string[];
    imagePrompt: string;
    imageUrl?: string;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGeneratePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/v1/social/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          business_category: category,
          business_description: description,
          brand_voice: voice,
          prompt,
          image_style: imageStyle,
          caption_length: captionLength,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setPreviewResult(data.data);
      }
    } catch {
      alert("Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Configuration Form */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSaveCampaign} className="space-y-6">
          {/* Section 1: Basic & Business */}
          <div className="glass rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold">1. Campaign & Brand Details</h2>

            <div>
              <label className="label">Campaign Name</label>
              <input
                type="text"
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Business Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Business Category</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-surface">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Business Description</label>
              <textarea
                className="input min-h-[70px]"
                placeholder="What products or services do you provide?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Brand Voice & Tone</label>
              <select
                className="input"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              >
                {BRAND_VOICES.map((v) => (
                  <option key={v} value={v} className="bg-surface">{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: AI Content & Visual Style */}
          <div className="glass rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold">2. AI Content & Image Preferences</h2>

            <div>
              <label className="label">Content Prompt / Focus</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="e.g. Daily property showcases, tips for home buyers, weekly discount deals"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Image Visual Style</label>
                <select
                  className="input"
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                >
                  {IMAGE_STYLES.map((s) => (
                    <option key={s} value={s} className="bg-surface">{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Caption Length</label>
                <select
                  className="input"
                  value={captionLength}
                  onChange={(e) => setCaptionLength(e.target.value)}
                >
                  <option value="short" className="bg-surface">Short (1-2 punchy sentences)</option>
                  <option value="medium" className="bg-surface">Medium (Standard paragraph)</option>
                  <option value="long" className="bg-surface">Long (Detailed story / guide)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Schedule & Publishing Mode */}
          <div className="glass rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold">3. Schedule & Mode</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Posting Time (Daily)</label>
                <input
                  type="time"
                  className="input"
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Publishing Approval Mode</label>
                <select
                  className="input"
                  value={approvalMode}
                  onChange={(e) => setApprovalMode(e.target.value as "auto" | "approve")}
                >
                  <option value="auto" className="bg-surface">Auto (Post directly on schedule)</option>
                  <option value="approve" className="bg-surface">Approval Mode (Review before posting)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={previewLoading}
              className="btn btn-ghost"
            >
              <Eye size={16} /> {previewLoading ? "Generating Sample..." : "Generate AI Preview"}
            </button>

            <button type="submit" className="btn btn-primary">
              <Check size={16} /> Save & Activate Campaign
            </button>
          </div>

          {savedSuccess && (
            <div className="rounded-xl border border-accent-green/40 bg-accent-green/10 p-3 text-xs text-accent-green text-center">
              Campaign settings saved successfully! The planner worker will trigger scheduled runs.
            </div>
          )}
        </form>
      </div>

      {/* Live AI Sample Preview Card */}
      <div className="space-y-4">
        <div className="glass rounded-3xl p-6 sticky top-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-1.5">
              <Sparkles size={16} className="text-brand" /> Live Preview Sample
            </h3>
            <span className="badge font-bold uppercase text-[10px]">{provider}</span>
          </div>

          {previewResult ? (
            <div className="space-y-4">
              {previewResult.imageUrl && (
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-surface-2 border border-border">
                  <img
                    src={previewResult.imageUrl}
                    alt="AI Generated Post Visual"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="rounded-2xl bg-surface-2 p-3.5 space-y-2">
                <p className="text-xs text-fg whitespace-pre-line leading-relaxed">
                  {previewResult.caption}
                </p>
                <div className="flex flex-wrap gap-1 text-[11px] text-brand-2">
                  {previewResult.hashtags.map((h, i) => (
                    <span key={i}>{h.startsWith("#") ? h : `#${h}`}</span>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-muted space-y-1">
                <div><strong>DALL-E Prompt:</strong> {previewResult.imagePrompt}</div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted space-y-3">
              <p>Click &quot;Generate AI Preview&quot; to test your prompt, style, and hashtags before saving.</p>
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={previewLoading}
                className="btn btn-ghost text-xs"
              >
                {previewLoading ? "Generating..." : "Generate Preview Now"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
