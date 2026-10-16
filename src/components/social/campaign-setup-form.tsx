"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, Eye, AlertCircle, Link2, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

    // 2. Load API keys (filter for OpenAI provider)
    fetch("/api/v1/api-keys")
      .then((res) => res.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          const openaiKeys = data.data.filter((k: any) => k.provider === "openai");
          const keysToUse = openaiKeys.length > 0 ? openaiKeys : data.data;
          setApiKeys(keysToUse);
          setSelectedKeyId(keysToUse[0].id);
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
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate AI preview");
      }

      setPreviewResult(data.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to preview");
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

      // If user has no accounts connected yet, create an inline fallback account automatically
      if (!finalAccountId && accounts.length === 0) {
        const createAccRes = await fetch("/api/v1/social/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            display_name: customPageName,
            external_id: customPageId,
            access_token: "mock_token_dev",
          }),
        });
        const accData = await createAccRes.json();
        if (accData.data?.id) {
          finalAccountId = accData.data.id;
        }
      }

      const res = await fetch("/api/v1/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          social_account_id: finalAccountId,
          name,
          business_category: category,
          business_name: businessName,
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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Configuration Form */}
      <div className="lg:col-span-2 space-y-6">
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-dangerBg border border-danger/30 text-xs text-danger flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="p-3.5 rounded-lg bg-successBg border border-success/30 text-xs text-success flex items-center gap-2">
            <Check size={15} className="shrink-0" />
            <span>Campaign successfully created! Redirecting to campaign manager...</span>
          </div>
        )}

        <form onSubmit={handleSaveCampaign} className="space-y-5">
          {/* Section 1: Connected Account & Credentials */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
              <Link2 size={16} className="text-muted" />
              1. Connected Account & AI Model
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-fg block mb-1">
                  Target {provider.toUpperCase()} Page / Account *
                </label>
                {accounts.length > 0 ? (
                  <select
                    className="input text-xs h-9 w-full"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id} className="bg-surface">
                        {a.display_name} ({a.external_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-bgSubtle border border-border text-xs text-muted space-y-0.5">
                      <span className="font-medium text-fg block">No accounts linked yet</span>
                      <p className="text-[11px]">Enter details below to link automatically:</p>
                    </div>
                    <input
                      type="text"
                      className="input text-xs h-9 w-full"
                      placeholder="Page Name (e.g. Dhaka Real Estate)"
                      value={customPageName}
                      onChange={(e) => setCustomPageName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input text-xs font-mono h-9 w-full"
                      placeholder="Page ID (e.g. 109283746)"
                      value={customPageId}
                      onChange={(e) => setCustomPageId(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-fg flex items-center justify-between mb-1">
                  <span>OpenAI API Key</span>
                  <Link href="/app/settings/api-keys" className="text-[11px] text-fg hover:underline">
                    Manage Keys →
                  </Link>
                </label>
                <select
                  className="input text-xs h-9 w-full"
                  value={selectedKeyId}
                  onChange={(e) => setSelectedKeyId(e.target.value)}
                >
                  <option value="" className="bg-surface">Default System Key / Demo AI</option>
                  {apiKeys.map((k) => (
                    <option key={k.id} value={k.id} className="bg-surface">
                      {k.label} (ends in ...{k.key_last4})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1">Used to craft unique social copy and image prompts.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Campaign & Brand Details */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
              <Sparkles size={16} className="text-muted" />
              2. Campaign & Brand Details
            </h2>

            <div>
              <label className="text-xs font-medium text-fg block mb-1">Campaign Name *</label>
              <input
                type="text"
                className="input text-xs h-9 w-full"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-fg block mb-1">Business Name *</label>
                <input
                  type="text"
                  className="input text-xs h-9 w-full"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-fg block mb-1">Industry / Category</label>
                <select
                  className="input text-xs h-9 w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-surface">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-fg block mb-1">Business Description</label>
              <textarea
                className="input text-xs min-h-[64px] w-full"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: AI Prompt & Content Style */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h2 className="text-sm font-semibold text-fg">3. Content Directives & Visual Style</h2>

            <div>
              <label className="text-xs font-medium text-fg block mb-1">
                Core Content Directive / Topic Guidelines *
              </label>
              <textarea
                className="input text-xs min-h-[75px] w-full"
                rows={3}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-fg block mb-1">Brand Voice</label>
                <select
                  className="input text-xs h-9 w-full"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  {BRAND_VOICES.map((v) => (
                    <option key={v} value={v} className="bg-surface">
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-fg block mb-1">Image Aesthetic</label>
                <select
                  className="input text-xs h-9 w-full"
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                >
                  {IMAGE_STYLES.map((s) => (
                    <option key={s} value={s} className="bg-surface">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-fg block mb-1">Caption Length</label>
                <select
                  className="input text-xs h-9 w-full"
                  value={captionLength}
                  onChange={(e) => setCaptionLength(e.target.value)}
                >
                  <option value="short" className="bg-surface">Short (1-2 sentences)</option>
                  <option value="medium" className="bg-surface">Medium (Engaging paragraph)</option>
                  <option value="long" className="bg-surface">Long (Storytelling & tips)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Schedule & Publishing Mode */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
              <Clock size={16} className="text-muted" />
              4. Daily Posting Schedule & Safety Mode
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-fg block mb-1">Publish Time (Daily)</label>
                <input
                  type="time"
                  className="input text-xs font-mono h-9 w-full"
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-fg block mb-1">Publishing Approval Mode</label>
                <select
                  className="input text-xs h-9 w-full"
                  value={approvalMode}
                  onChange={(e) => setApprovalMode(e.target.value as any)}
                >
                  <option value="auto" className="bg-surface">Auto-Publish Directly (Hands-free)</option>
                  <option value="approve" className="bg-surface">Require Manual Review (Safety Queue)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGeneratePreview}
              disabled={previewLoading}
              icon={<Eye size={14} />}
            >
              {previewLoading ? "Generating AI Preview..." : "Preview AI Generation"}
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
            >
              {saving ? "Saving Campaign..." : "Save & Activate Campaign"}
            </Button>
          </div>
        </form>
      </div>

      {/* Live AI Preview Card */}
      <div>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={13} className="text-primary" /> Live AI Preview
            </span>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              {provider.toUpperCase()}
            </Badge>
          </div>

          {previewResult ? (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {previewResult.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-border aspect-square bg-bgSubtle relative">
                  <img
                    src={previewResult.imageUrl}
                    alt="AI Generated Social Media"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] text-white">
                    {imageStyle}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-bgSubtle border border-border space-y-2 text-xs">
                <p className="whitespace-pre-line text-fg leading-relaxed font-sans">
                  {previewResult.caption}
                </p>
                {previewResult.hashtags && previewResult.hashtags.length > 0 && (
                  <p className="text-muted font-medium text-[11px]">
                    {previewResult.hashtags.join(" ")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4 rounded-lg bg-bgSubtle border border-border text-xs text-muted space-y-2.5">
              <Sparkles size={24} className="mx-auto text-muted/60" />
              <p className="font-medium text-fg">No preview generated yet</p>
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
