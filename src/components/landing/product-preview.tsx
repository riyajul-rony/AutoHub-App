"use client";

import {
  Users,
  Send,
  Share2,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Search,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Subtle outer glow / shadow for frame focus */}
      <div className="relative rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden transition-all duration-300">
        {/* Mock Window Titlebar */}
        <div className="flex items-center justify-between border-b border-border bg-bgSubtle px-4 py-3 select-none">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-borderStrong/60 inline-block" />
            <span className="h-3 w-3 rounded-full bg-borderStrong/40 inline-block" />
            <span className="h-3 w-3 rounded-full bg-borderStrong/40 inline-block" />
            <div className="ml-3 hidden sm:flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1 text-xs text-muted">
              <Search size={12} className="text-subtle" />
              <span className="font-mono text-[11px]">leadreachai.cerkitlabs.tech/app/dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] font-mono text-muted">Tenant: acme-corp • Isolated</span>
          </div>
        </div>

        {/* Mock Application Body */}
        <div className="p-4 sm:p-6 bg-surface space-y-6">
          {/* Top Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-border bg-bgSubtle p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Total Leads</span>
                <Users size={14} className="text-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-fg">2,840</span>
                <span className="text-[11px] font-medium text-success">+18% this wk</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bgSubtle p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Active Sequences</span>
                <Send size={14} className="text-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-fg">12</span>
                <span className="text-[11px] text-muted">25/hr limit safe</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bgSubtle p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Open & Reply</span>
                <RotateCcw size={14} className="text-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-fg">64.2%</span>
                <span className="text-[11px] font-medium text-success">Top tier</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bgSubtle p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Queued Posts</span>
                <Share2 size={14} className="text-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-fg">18</span>
                <span className="text-[11px] text-muted">FB, IG, LI</span>
              </div>
            </div>
          </div>

          {/* Interactive Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7 cols: Live Scraper & Enrichment stream */}
            <div className="lg:col-span-7 rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-bgSubtle text-fg">
                    <Sparkles size={13} />
                  </span>
                  <span className="text-xs font-semibold text-fg">Real-Time Lead Scraping Stream</span>
                </div>
                <Badge variant="success" size="sm">
                  Live Sync
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bgSubtle">
                  <div className="space-y-0.5">
                    <div className="font-medium text-fg flex items-center gap-1.5">
                      Apex Dynamics Studio
                      <span className="text-[10px] text-muted font-normal">• Austin, TX</span>
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-2">
                      <Mail size={11} className="text-subtle" /> contact@apexdynamics.io
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">Google Maps</Badge>
                    <Badge variant="success" size="sm">Verified</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bgSubtle">
                  <div className="space-y-0.5">
                    <div className="font-medium text-fg flex items-center gap-1.5">
                      Vanguard Health Tech
                      <span className="text-[10px] text-muted font-normal">• San Francisco, CA</span>
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-2">
                      <Mail size={11} className="text-subtle" /> ceo@vanguardhealth.co
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">LinkedIn</Badge>
                    <Badge variant="success" size="sm">Verified</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bgSubtle">
                  <div className="space-y-0.5">
                    <div className="font-medium text-fg flex items-center gap-1.5">
                      CloudScale Media
                      <span className="text-[10px] text-muted font-normal">• London, UK</span>
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-2">
                      <Mail size={11} className="text-subtle" /> info@cloudscale.uk
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">Meta Ads</Badge>
                    <Badge variant="success" size="sm">Enriched</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-success" /> Cloud Scraping Network active
                </span>
                <span className="font-mono text-fg font-medium">100% deduplicated</span>
              </div>
            </div>

            {/* Right 5 cols: Cold Outreach Sequence & IMAP Stop */}
            <div className="lg:col-span-5 rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-bgSubtle text-fg">
                    <Send size={13} />
                  </span>
                  <span className="text-xs font-semibold text-fg">Sequence Engine</span>
                </div>
                <span className="text-[11px] text-muted font-mono">25/hr smart jitter</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg border border-border bg-bgSubtle space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-fg">Step 1: AI Personalized Intro</span>
                    <Badge variant="neutral" size="sm">Sent (420)</Badge>
                  </div>
                  <div className="text-[11px] text-muted">
                    Variables: <code className="font-mono text-fg">{"{{company}}"}</code>, <code className="font-mono text-fg">{"{{city}}"}</code>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-bgSubtle space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-fg flex items-center gap-1.5">
                      <Clock size={12} className="text-muted" /> Step 2: Drip Follow-up
                    </span>
                    <Badge variant="neutral" size="sm">+3 Days</Badge>
                  </div>
                  <div className="text-[11px] text-muted">
                    Smart auto-stop on reply enabled
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-success/30 bg-successBg p-2.5 flex items-center gap-2 text-[11px] text-success">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>IMAP auto-detected 14 prospect replies — campaigns paused instantly.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
