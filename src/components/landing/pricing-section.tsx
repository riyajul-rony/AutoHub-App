"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  cta: string;
  popular?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Ideal for solo founders and freelancers launching outbound pipeline.",
    monthlyPrice: 29,
    yearlyPrice: 24,
    features: [
      "1,000 Verified Leads / month",
      "Google Maps & Meta Ads scraping",
      "1 Connected Email Account (SMTP/IMAP)",
      "Smart 25/hr rate throttling & jitter",
      "3 Social Media Accounts",
      "IMAP Automated Stop-on-Reply",
      "Single user workspace",
    ],
    cta: "Start 14-Day Free Trial",
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Most Popular",
    popular: true,
    description: "Built for scaling agencies and sales teams demanding high volume.",
    monthlyPrice: 79,
    yearlyPrice: 64,
    features: [
      "10,000 Verified Leads / month",
      "Full Bright Data Enrichment (LinkedIn, Meta, Maps)",
      "5 Connected Email Accounts with Auto-Rotation",
      "AI Personalized Intro generator (OpenAI)",
      "10 Social Media Accounts (FB, IG, LinkedIn)",
      "Multi-step automated drip sequences",
      "Team collaboration (up to 5 members)",
      "Priority customer support",
    ],
    cta: "Scale With Growth",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "Maximum Throughput",
    description: "Dedicated infrastructure, custom proxies, and high-volume limits.",
    monthlyPrice: 199,
    yearlyPrice: 159,
    features: [
      "50,000+ Verified Leads / month",
      "Bring Your Own Proxy (Bright Data / Residential)",
      "25+ Connected Email Accounts with Warmup Jitter",
      "Unlimited Social Accounts & Custom Review Modes",
      "Custom Webhook & API integrations",
      "Role-Based Access Control (Admin / Staff / Member)",
      "Dedicated account manager & 99.9% uptime SLA",
    ],
    cta: "Contact Enterprise",
  },
];

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="px-6 py-20 border-t border-border bg-bgSubtle">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="neutral" className="mb-3">
            Predictable Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">
            Transparent plans for high-growth teams
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted">
            Start free for 14 days. No surprise fees. Upgrade or cancel anytime with one click.
          </p>

          {/* Billing Interval Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-full border border-border bg-surface text-xs">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                !isYearly
                  ? "bg-primary text-primaryText shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`rounded-full px-4 py-1.5 font-medium transition-all flex items-center gap-1.5 ${
                isYearly
                  ? "bg-primary text-primaryText shadow-sm"
                  : "text-muted hover:text-fg"
              }`}
            >
              <span>Annual billing</span>
              <span className="text-[10px] font-semibold text-success bg-successBg px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {PLANS.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between p-6 sm:p-8 bg-surface ${
                  plan.popular
                    ? "border-primary shadow-lg ring-1 ring-primary"
                    : "border-border hover:border-borderStrong"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-fg">{plan.name}</h3>
                    {plan.badge && (
                      <Badge
                        variant={plan.popular ? "accent" : "neutral"}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        {plan.popular && <Sparkles size={11} />}
                        {plan.badge}
                      </Badge>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-muted leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1 pb-6 border-b border-border">
                    <span className="text-4xl font-extrabold tracking-tight text-fg">
                      ${price}
                    </span>
                    <span className="text-xs text-muted">/ month</span>
                    {isYearly && (
                      <span className="ml-2 text-[11px] text-muted font-normal">
                        billed annually
                      </span>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-semibold text-fg uppercase tracking-wider">
                      Included with {plan.name}:
                    </p>
                    <ul className="space-y-2.5 text-xs text-muted">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check size={14} className="text-success shrink-0 mt-0.5" />
                          <span className="text-fg">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <Link
                    href={`/signup?plan=${plan.id}`}
                    className="block w-full"
                  >
                    <Button
                      variant={plan.popular ? "primary" : "secondary"}
                      className="w-full flex items-center justify-center gap-1.5"
                    >
                      <span>{plan.cta}</span>
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Callout */}
        <div className="mt-12 rounded-xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm sm:text-base font-bold text-fg">
              Need custom volume, white-labeling, or dedicated scraping proxies?
            </h4>
            <p className="text-xs text-muted">
              We offer bespoke plans with custom rate limits, on-premise workers, and tailored SLA agreements.
            </p>
          </div>
          <Link href="/login">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">
              Talk to Sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
