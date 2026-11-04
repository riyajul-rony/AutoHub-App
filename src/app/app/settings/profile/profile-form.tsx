"use client";

import { useState, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CheckCircle2, AlertCircle, Trash2, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "./actions";

interface ProfileFormProps {
  initialValues?: {
    name?: string | null;
    businessName?: string | null;
    timezone?: string | null;
    senderLegalName?: string | null;
    senderAddress?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
  };
}

export function ProfileForm({ initialValues }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialValues?.name || "");
  const [businessName, setBusinessName] = useState(initialValues?.businessName || "");
  const [timezone, setTimezone] = useState(initialValues?.timezone || "UTC");
  const [senderLegalName, setSenderLegalName] = useState(initialValues?.senderLegalName || "");
  const [senderAddress, setSenderAddress] = useState(initialValues?.senderAddress || "");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialValues?.avatarUrl || null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userInitial = (fullName || initialValues?.email || "U").charAt(0).toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(null);

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("File size exceeds 2MB limit. Please choose a smaller image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAvatarLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/user/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAvatarError(data.error || "Failed to upload avatar.");
      } else {
        setAvatarUrl(data.avatar_url);
        setAvatarSuccess("Avatar updated successfully! Refreshing view...");
        setTimeout(() => {
          setAvatarSuccess(null);
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      setAvatarError(err?.message || "An unexpected error occurred while uploading.");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm("Are you sure you want to remove your avatar photo?")) return;

    setAvatarError(null);
    setAvatarSuccess(null);
    setAvatarLoading(true);

    try {
      const res = await fetch("/api/v1/user/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAvatarError(data.error || "Failed to remove avatar.");
      } else {
        setAvatarUrl(null);
        setAvatarSuccess("Avatar removed successfully.");
        setTimeout(() => {
          setAvatarSuccess(null);
          window.location.reload();
        }, 1000);
      }
    } catch (err: any) {
      setAvatarError(err?.message || "Failed to remove avatar.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const result = await updateProfileAction({
        name: fullName,
        business_name: businessName,
        timezone,
        sender_legal_name: senderLegalName,
        sender_address: senderAddress,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch (err: any) {
      setError(err?.message || "Could not save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Profile Picture & Avatar Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>
            Your avatar appears in the topbar and workspace communications. JPG, PNG or WEBP up to 2MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {avatarError && (
            <div className="rounded-lg border border-danger/30 bg-danger-bg p-3 text-xs text-danger flex items-center gap-2">
              <AlertCircle size={15} /> {avatarError}
            </div>
          )}
          {avatarSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={15} /> {avatarSuccess}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative w-20 h-20 rounded-[10px] border border-border bg-bg-subtle overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={fullName || "User Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold font-mono text-primary">
                  {userInitial}
                </span>
              )}
              {avatarLoading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-medium">
                  Saving...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={avatarLoading}
              />
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  icon={<Camera className="w-3.5 h-3.5" />}
                >
                  {avatarUrl ? "Change Photo" : "Upload Photo"}
                </Button>

                {avatarUrl && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleAvatarDelete}
                    disabled={avatarLoading}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                Images are automatically cropped to 256x256 square WebP and stored securely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Business & Legal Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business &amp; Legal Information</CardTitle>
          <CardDescription>
            Your sender legal name and physical address are required by CAN-SPAM regulations and will appear in email footers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {saved && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} /> Profile settings saved successfully!
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-bg p-3.5 text-xs text-danger flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
              />
              <Input
                label="Business Name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Studio"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Timezone (IANA)"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York or Asia/Dhaka"
              />
              <Input
                label="Sender Legal Name"
                type="text"
                value={senderLegalName}
                onChange={(e) => setSenderLegalName(e.target.value)}
                placeholder="e.g. Acme Corporation LLC"
              />
            </div>

            <Input
              label="Sender Physical Address"
              type="text"
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Suite 400, New York, NY 10001"
            />

            {/* Theme Mode Selector */}
            <div className="border-t border-border pt-5 space-y-2">
              <label className="block text-xs font-medium text-text-muted">Interface Theme</label>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <span className="text-xs text-text-muted">
                  Switch between Dark Mode and Light Mode. Your preference is automatically remembered.
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving Changes..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
