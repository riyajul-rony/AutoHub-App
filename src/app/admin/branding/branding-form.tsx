"use client";

import React, { useState } from "react";
import { SiteBranding, DEFAULT_BRANDING } from "@/types/branding";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Sparkles, Globe, Layout, Shield, ArrowRight, Sun, Moon } from "lucide-react";
import { BrandingImageUploader } from "@/components/admin/branding-image-uploader";
import { BrandLogo } from "@/components/brand/brand-logo";

export function BrandingForm({ initialBranding }: { initialBranding: SiteBranding }) {
  const [branding, setBranding] = useState<SiteBranding>(initialBranding);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("dark");

  const handleChange = (field: keyof SiteBranding, value: string) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/v1/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update branding");
      }

      setSuccess("Branding and site content updated successfully!");
      setBranding(data.data);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset all branding to default Lead Reach AI content?")) {
      setBranding(DEFAULT_BRANDING);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form Column (7 cols on lg) */}
      <div className="lg:col-span-7 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-bg p-3.5 text-xs text-danger flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* 1. Core Brand Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> Core Brand Identity
              </CardTitle>
              <CardDescription>
                Application name, tagline, and optional logo image displayed on headers and emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Input
                label="Site / App Name"
                value={branding.site_name}
                onChange={(e) => handleChange("site_name", e.target.value)}
                placeholder="Lead Reach AI"
                required
              />

              <Input
                label="Tagline"
                value={branding.tagline}
                onChange={(e) => handleChange("tagline", e.target.value)}
                placeholder="Modern B2B Growth Engine"
              />

              {/* Primary Logo (Light Theme) */}
              <BrandingImageUploader
                label="Primary Logo (Light Theme)"
                description="Main application logo. Used on light backgrounds, auth pages, and emails. If no dark logo is provided, this logo will be used in both themes."
                targetType="logo_light"
                value={branding.logo_url}
                onChange={(val) => handleChange("logo_url", val || "")}
                maxSizeMb={2}
              />

              {/* Dark Mode Logo (Optional) */}
              <BrandingImageUploader
                label="Dark Mode Logo (Optional)"
                description="Custom inverted/contrasting logo variant displayed when dark theme is active. If omitted, the primary logo is used automatically."
                targetType="logo_dark"
                value={branding.logo_dark_url}
                onChange={(val) => handleChange("logo_dark_url", val || "")}
                maxSizeMb={2}
              />

              {/* Browser Tab Favicon */}
              <BrandingImageUploader
                label="Browser Tab Favicon (Optional)"
                description="Icon displayed in browser tab headers and bookmarks (PNG, ICO, or SVG, max 512KB)."
                targetType="favicon"
                value={branding.favicon_url}
                onChange={(val) => handleChange("favicon_url", val || "")}
                maxSizeMb={0.5}
                previewHeight="h-10"
              />
            </CardContent>
          </Card>

          {/* 2. Hero Section Copy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layout size={16} className="text-primary" /> Hero Section Copy
              </CardTitle>
              <CardDescription>
                Primary headlines shown to visitors on the landing page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Input
                label="Hero Title (Main Headline)"
                value={branding.hero_title}
                onChange={(e) => handleChange("hero_title", e.target.value)}
                placeholder="Automate your growth pipeline without the chaos."
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-subtle">
                  Hero Subtitle (Paragraph)
                </label>
                <textarea
                  value={branding.hero_subtitle}
                  onChange={(e) => handleChange("hero_subtitle", e.target.value)}
                  rows={3}
                  className="input w-full p-2.5 text-xs leading-relaxed"
                  placeholder="Describe your platform value proposition..."
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Footer, Social & Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield size={16} className="text-primary" /> Footer, Support &amp; Social Links
              </CardTitle>
              <CardDescription>
                Footer copyright text, customer support address, and external social channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Support Email"
                  type="email"
                  value={branding.support_email}
                  onChange={(e) => handleChange("support_email", e.target.value)}
                  placeholder="support@domain.com"
                />

                <Input
                  label="Footer Copyright"
                  value={branding.footer_copyright}
                  onChange={(e) => handleChange("footer_copyright", e.target.value)}
                  placeholder="© 2026 Lead Reach AI. All rights reserved."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Twitter / X URL"
                  value={branding.twitter_url || ""}
                  onChange={(e) => handleChange("twitter_url", e.target.value)}
                  placeholder="https://x.com/..."
                />
                <Input
                  label="LinkedIn URL"
                  value={branding.linkedin_url || ""}
                  onChange={(e) => handleChange("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/..."
                />
                <Input
                  label="GitHub URL"
                  value={branding.github_url || ""}
                  onChange={(e) => handleChange("github_url", e.target.value)}
                  placeholder="https://github.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. SEO & Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe size={16} className="text-primary" /> SEO &amp; Meta Tags
              </CardTitle>
              <CardDescription>
                Search engine title and Open Graph meta description.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Input
                label="Default SEO Title"
                value={branding.seo_title}
                onChange={(e) => handleChange("seo_title", e.target.value)}
                placeholder="Lead Reach AI — Modern B2B Marketing Engine"
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-subtle">
                  Meta Description
                </label>
                <textarea
                  value={branding.seo_description}
                  onChange={(e) => handleChange("seo_description", e.target.value)}
                  rows={2}
                  className="input w-full p-2.5 text-xs"
                  placeholder="High-precision lead generation, multi-account cold email outreach..."
                />
              </div>

              {/* Social Share / OG Image */}
              <BrandingImageUploader
                label="Social Share / OG Image (1200x630)"
                description="Preview image displayed when links to your site are shared on LinkedIn, Twitter, Facebook, or chat apps."
                targetType="og_image"
                value={branding.og_image}
                onChange={(val) => handleChange("og_image", val || "")}
                maxSizeMb={2}
                previewHeight="h-20"
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {saving ? "Saving Changes..." : "Publish Branding Changes"}
            </Button>
          </div>
        </form>
      </div>

      {/* Live Preview Column (5 cols on lg) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="sticky top-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
              Live Preview
            </h3>
            {/* Theme simulator toggle */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-bgSubtle p-0.5">
              <button
                type="button"
                onClick={() => setPreviewTheme("light")}
                className={`p-1 rounded text-xs flex items-center gap-1 cursor-pointer transition ${
                  previewTheme === "light"
                    ? "bg-surface text-fg shadow-xs font-semibold"
                    : "text-muted hover:text-fg"
                }`}
                title="Preview Light Theme"
              >
                <Sun size={12} /> <span className="text-[10px]">Light</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme("dark")}
                className={`p-1 rounded text-xs flex items-center gap-1 cursor-pointer transition ${
                  previewTheme === "dark"
                    ? "bg-surface text-fg shadow-xs font-semibold"
                    : "text-muted hover:text-fg"
                }`}
                title="Preview Dark Theme"
              >
                <Moon size={12} /> <span className="text-[10px]">Dark</span>
              </button>
            </div>
          </div>

          {/* Browser Tab Simulator */}
          <div className="rounded-[8px] border border-border bg-surface p-2 shadow-xs">
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-bgSubtle border border-border/60 max-w-[200px]">
              {branding.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.favicon_url}
                  alt="Favicon"
                  className="h-3.5 w-3.5 object-contain rounded-xs shrink-0"
                />
              ) : (
                <div className="h-3.5 w-3.5 rounded-xs bg-primary text-primary-text grid place-items-center text-[8px] font-bold">
                  {branding.site_name.charAt(0)}
                </div>
              )}
              <span className="text-[11px] text-fg truncate font-medium">
                {branding.site_name}
              </span>
            </div>
          </div>

          {/* Mini Header & Hero Preview (with data-theme simulator) */}
          <div
            data-theme={previewTheme}
            className={`rounded-[8px] border border-border p-4 shadow-sm space-y-4 transition-colors ${
              previewTheme === "dark" ? "bg-neutral-950 text-neutral-100" : "bg-white text-neutral-900"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <BrandLogo
                siteName={branding.site_name}
                logoUrl={branding.logo_url}
                logoDarkUrl={branding.logo_dark_url}
                size="sm"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted px-2 py-0.5 rounded border border-border">
                  Sign In
                </span>
                <span className="text-[10px] bg-primary text-primary-text px-2 py-0.5 rounded font-medium">
                  Get Started
                </span>
              </div>
            </div>

            {/* Mini Hero Preview */}
            <div className="py-4 text-center space-y-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bgSubtle px-2.5 py-0.5 text-[10px] font-medium text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{branding.site_name}</span>
                <span>•</span>
                <span>{branding.tagline}</span>
              </div>

              <h2 className="text-lg font-bold leading-tight px-2">
                {branding.hero_title}
              </h2>

              <p className="text-xs text-muted leading-relaxed line-clamp-3 px-2">
                {branding.hero_subtitle}
              </p>

              <div className="pt-2 flex justify-center gap-2">
                <div className="text-[11px] bg-primary text-primary-text px-3 py-1 rounded font-medium flex items-center gap-1">
                  Start Free Trial <ArrowRight size={11} />
                </div>
              </div>
            </div>

            {/* Mini Footer Preview */}
            <div className="border-t border-border/50 pt-3 text-[11px] text-muted flex items-center justify-between">
              <span>{branding.footer_copyright}</span>
              <span>{branding.support_email}</span>
            </div>
          </div>

          {/* Social Share Preview Card (if OG image exists) */}
          {branding.og_image && (
            <div className="rounded-[8px] border border-border bg-surface p-3 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Social Share Preview (Open Graph)
              </div>
              <div className="rounded border border-border overflow-hidden bg-bgSubtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.og_image}
                  alt="OG Preview"
                  className="w-full h-32 object-cover"
                />
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-bold text-fg truncate">
                    {branding.seo_title || branding.site_name}
                  </p>
                  <p className="text-[11px] text-muted line-clamp-2 leading-snug">
                    {branding.seo_description || branding.tagline}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[8px] border border-border/50 bg-bg-subtle p-3 text-[11px] text-text-muted">
            <p className="font-semibold text-text mb-0.5">Instant Reflection</p>
            Changes take effect immediately across all public routes, sidebar, browser tab favicon, and layout headers without needing a server restart.
          </div>
        </div>
      </div>
    </div>
  );
}
