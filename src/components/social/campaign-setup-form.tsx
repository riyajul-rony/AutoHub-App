"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, Eye, AlertCircle, Link2, Key, Clock, Calendar } from "lucide-react";
import Link from "next/link";

const BUSINESS_CATEGORIES = [
  "Real Estate", "Restaurant", "E-commerce", "Fitness", "Education",
  "Healthcare", "Beauty", "Legal", "Travel", "Agency", "Tech/SaaS", "Other"
];

const BRAND_VOICES = ["Professional", "Friendly", "Witty", "Luxury", "Educational"];
const IMAGE_STYLES = ["Photorealistic", "Illustration", "Minimal", "Flat/Vector", "3D"];

export function CampaignSetupForm({ provider }: { provider: string }) {
  const router = useRouter();

  // Connected accounts & API keys
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");

  // Campaign fields
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

  // Inline fallback account for quick testing if user hasn't connected a page yet
  const [customPageName, setCustomPageName] = useState("My Brand Page");
  const [customPageId, setCustomPageId] = useState("page_1001");

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    caption: string;
    hashtags: string[];
    imagePrompt: string;
    imageUrl?: string;
  } | null>(null);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // 1. Load accounts for this provider
    fetch("/api/v1/social/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          const matching = data.data.filter((a: any) => a.provider === provider);
          setAccounts(matching);
          if (matching.length > 0) {
            setSelectedAccountId(matching[0].id);
          }
        }
      })
      .catch(() => {});

    // 2. Load API keys
    fetch("/api/v1/api-keys")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          setApiKeys(data.data);
          setSelectedKeyId(data.data[0].id);
        }
      })
      .catch(() => {});
  }, [provider]);

  const handleGeneratePreview = async () => {
    setPreviewLoading(true);
    setErrorMessage("");
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
          openai_key_id: selectedKeyId || undefined,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setPreviewResult(data.data);
      }
    } catch {
      setErrorMessage("Failed to generate AI preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      let finalAccountId = selectedAccountId;

      // If user hasn't connected a page yet, auto-provision an account for them so they're never blocked!
      if (!finalAccountId) {
        const createAccRes = await fetch("/api/v1/social/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            display_name: customPageName || "Default Page",
            external_id: customPageId || `id_${Date.now()}`,
          }),
        });
        const accData = await createAccRes.json();
        if (accData.data?.id) {
          finalAccountId = accData.data.id;
        } else {
          throw new Error("Please connect a social account first.");
        }
      }

      const res = await fetch("/api/v1/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          social_account_id: finalAccountId,
          openai_key_id: selectedKeyId || null,
          business_name: businessName,
          business_category: category,
          business_description: description,
          brand_voice: voice,
          prompt,
          image_style: imageStyle,
          caption_length: captionLength,
          post_times: [postTime],
          days_of_week: [1, 2, 3, 4, 5],
          timezone: "Asia/Dhaka",
          approval_mode: approvalMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save campaign");
      }

      setSavedSuccess(true);
      setTimeout(() => {
        router.push(`/app/social/${provider}`);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while saving the campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Configuration Form */}
      <div className="lg:col-span-2 space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            <span>Campaign successfully created! Redirecting to campaign manager...</span>
          </div>
        )}

        <form onSubmit={handleSaveCampaign} className="space-y-6">
          {/* Section 1: Connected Account & Credentials */}
          <div className="glass rounded-3xl p-6 space-y-4 border border-border">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Link2 size={18} className="text-brand-2" />
              1. Connected Account & AI Model
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label text-xs font-semibold">Target {provider.toUpperCase()} Page / Account *</label>
                {accounts.length > 0 ? (
                  <select
                    className="input text-xs"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.display_name} ({a.external_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-surface-2 text-xs text-slate-300 space-y-1">
                      <span className="font-semibold text-white block">No accounts linked yet</span>
                      <p className="text-[11px] text-muted">
                        Enter your page details below to link automatically:
                      </p>
                    </div>
                    <input
                      type="text"
                      className="input text-xs"
                      placeholder="Page Name (e.g. Dhaka Real Estate)"
                      value={customPageName}
                      onChange={(e) => setCustomPageName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input text-xs font-mono"
                      placeholder="Page ID (e.g. 109283746)"
                      value={customPageId}
                      onChange={(e) => setCustomPageId(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label text-xs font-semibold flex items-center justify-between">
                  <span>OpenAI API Key</span>
                  <Link href="/app/settings/api-keys" className="text-[11px] text-brand-2 hover:underline">
                    Manage Keys →
                  </Link>
                </label>
                <select
                  className="input text-xs"
                  value={selectedKeyId}
                  onChange={(e) => setSelectedKeyId(e.target.value)}
                >
                  <option value="">Default System Key / Demo AI</option>
                  {apiKeys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label} (ends in ...{k.key_last4})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1">Used to craft unique social copy and image generation prompts.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Campaign & Brand Details */}
          <div className="glass rounded-3xl p-6 space-y-4 border border-border">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-brand" />
              2. Campaign & Brand Details
            </h2>

            <div>
              <label className="label text-xs font-semibold">Campaign Name *</label>
              <input
                type="text"
                className="input text-xs"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label text-xs font-semibold">Business Name *</label>
                <input
                  type="text"
                  className="input text-xs"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs font-semibold">Industry / Category</label>
                <select
                  className="input text-xs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold">Business Description</label>
              <textarea
                className="input text-xs min-h-[72px]"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: AI Prompt & Content Style */}
          <div className="glass rounded-3xl p-6 space-y-4 border border-border">
            <h2 className="text-base font-bold">3. Content Directives & Visual Style</h2>

            <div>
              <label className="label text-xs font-semibold">Core Content Directive / Topic Guidelines *</label>
              <textarea
                className="input text-xs min-h-[85px]"
                rows={3}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label text-xs font-semibold">Brand Voice</label>
                <select
                  className="input text-xs"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  {BRAND_VOICES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs font-semibold">Image Aesthetic</label>
                <select
                  className="input text-xs"
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                >
                  {IMAGE_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs font-semibold">Caption Length</label>
                <select
                  className="input text-xs"
                  value={captionLength}
                  onChange={(e) => setCaptionLength(e.target.value)}
                >
                  <option value="short">Short (1-2 sentences)</option>
                  <option value="medium">Medium (Engaging paragraph)</option>
                  <option value="long">Long (Storytelling & tips)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Schedule & Publishing Mode */}
          <div className="glass rounded-3xl p-6 space-y-4 border border-border">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Clock size={18} className="text-brand-2" />
              4. Daily Posting Schedule & Safety Mode
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label text-xs font-semibold">Publish Time (Daily)</label>
                <input
                  type="time"
                  className="input text-xs font-mono"
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs font-semibold">Publishing Approval Mode</label>
                <select
                  className="input text-xs"
                  value={approvalMode}
                  onChange={(e) => setApprovalMode(e.target.value as any)}
                >
                  <option value="auto">Auto-Publish Directly (Hands-free)</option>
                  <option value="approve">Require Manual Review (Safety Queue)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={previewLoading}
              className="btn btn-ghost border border-border hover:border-brand text-xs flex items-center gap-2"
            >
              <Eye size={15} />
              {previewLoading ? "Generating AI Preview..." : "Preview AI Generation"}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary text-xs flex items-center gap-2 min-w-[170px] justify-center shadow-lg shadow-brand/20 font-bold"
            >
              {saving ? "Saving Campaign..." : "Save & Activate Campaign"}
            </button>
          </div>
        </form>
      </div>

      {/* Live AI Preview Card */}
      <div>
        <div className="glass rounded-3xl p-6 space-y-5 sticky top-8 border border-border shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={14} /> Live AI Output Preview
            </span>
            <span className="badge text-[10px] font-mono">{provider.toUpperCase()}</span>
          </div>

          {previewResult ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {previewResult.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-border/80 aspect-square bg-surface-2 relative">
                  <img
                    src={previewResult.imageUrl}
                    alt="AI Generated Social Media"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-[10px] text-white">
                    {imageStyle}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-surface-2/80 border border-border space-y-2 text-xs">
                <p className="whitespace-pre-line text-slate-200 leading-relaxed font-sans">
                  {previewResult.caption}
                </p>
                {previewResult.hashtags && previewResult.hashtags.length > 0 && (
                  <p className="text-brand font-medium text-[11px]">
                    {previewResult.hashtags.join(" ")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl bg-surface-2/40 border border-border/60 text-xs text-muted space-y-3">
              <Sparkles size={32} className="mx-auto text-muted/40 animate-pulse" />
              <p className="font-medium">No preview generated yet</p>
              <p className="text-[11px] leading-relaxed">
                Click <strong>&quot;Preview AI Generation&quot;</strong> to see how OpenAI formats your caption, hashtags, and visual media before launching.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
