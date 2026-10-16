"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProfileFormProps {
  initialValues?: {
    name?: string | null;
    businessName?: string | null;
  };
}

export function ProfileForm({ initialValues }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialValues?.name || "Riyajul Islam Rony");
  const [businessName, setBusinessName] = useState(initialValues?.businessName || "AutoHub Studio");
  const [timezone, setTimezone] = useState("Asia/Dhaka");
  const [senderLegalName, setSenderLegalName] = useState("AutoHub Studio Ltd.");
  const [senderAddress, setSenderAddress] = useState("Road 11, Banani, Dhaka-1213, Bangladesh");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    }, 400);
  };

  return (
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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Business Name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Timezone (IANA)"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <Input
              label="Sender Legal Name"
              type="text"
              value={senderLegalName}
              onChange={(e) => setSenderLegalName(e.target.value)}
            />
          </div>

          <Input
            label="Sender Physical Address"
            type="text"
            value={senderAddress}
            onChange={(e) => setSenderAddress(e.target.value)}
          />

          {/* Theme Mode Selector */}
          <div className="border-t border-border pt-5 space-y-2">
            <label className="block text-xs font-medium text-text-muted">Interface Theme</label>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-xs text-muted">
                Switch between Dark Mode and Light Mode. Your preference is automatically remembered.
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
