import { Share2, Search, Mail, Repeat2, type LucideIcon } from "lucide-react";

export type ModuleConfig = {
  id: "social" | "leads" | "outreach" | "followup";
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  glow: string;
  phase: string;
  options: { label: string; href: string }[];
};

/** Hub cards. Adding a new module/platform = adding an entry here. */
export const MODULES: ModuleConfig[] = [
  {
    id: "social",
    title: "Social Media Auto Post",
    description: "AI creates images & captions and posts on schedule to Facebook, Instagram and LinkedIn.",
    href: "/app/social",
    icon: Share2,
    glow: "hsl(258 90% 66% / 0.35)",
    phase: "P1",
    options: [
      { label: "Facebook", href: "/app/social/facebook" },
      { label: "Instagram", href: "/app/social/instagram" },
      { label: "LinkedIn", href: "/app/social/linkedin" },
    ],
  },
  {
    id: "leads",
    title: "Lead Generation",
    description: "Collect leads from Google Maps, Meta Ads Library and LinkedIn. Export to CSV or Google Sheets.",
    href: "/app/leads",
    icon: Search,
    glow: "hsl(199 95% 60% / 0.32)",
    phase: "P2",
    options: [
      { label: "Google Map", href: "/app/leads/google_maps" },
      { label: "Meta Ads Library", href: "/app/leads/meta_ads" },
      { label: "LinkedIn", href: "/app/leads/linkedin" },
    ],
  },
  {
    id: "outreach",
    title: "Outreach",
    description: "Send AI-written or custom emails to your leads, rotating across multiple accounts safely.",
    href: "/app/outreach",
    icon: Mail,
    glow: "hsl(328 86% 64% / 0.3)",
    phase: "P3",
    options: [
      { label: "AI Message", href: "/app/outreach/new?mode=ai" },
      { label: "Custom Message", href: "/app/outreach/new?mode=custom" },
    ],
  },
  {
    id: "followup",
    title: "Followup",
    description: "Automatically follow up with people who haven't replied, in the same thread.",
    href: "/app/followup",
    icon: Repeat2,
    glow: "hsl(152 70% 52% / 0.28)",
    phase: "P3",
    options: [{ label: "Sequences", href: "/app/followup" }],
  },
];
