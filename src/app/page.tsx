import Link from "next/link";
import {
  Zap,
  Share2,
  Users,
  Send,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Server,
  Sparkles,
  Layers,
  ArrowUpRight,
  Check,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { ProductPreview } from "@/components/landing/product-preview";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQSection } from "@/components/landing/faq-section";
import { getSiteBranding } from "@/server/branding";

export async function generateMetadata() {
  const branding = await getSiteBranding();
  return {
    title: branding.seo_title || `${branding.site_name} — ${branding.tagline}`,
    description: branding.seo_description,
  };
}

export default async function HomePage() {
  const branding = await getSiteBranding();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg selection:bg-primary selection:text-primaryText">
      {/* Sticky Top Navigation */}
      <LandingHeader siteName={branding.site_name} logoUrl={branding.logo_url} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Pill Announcement */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-medium text-muted hover:text-fg transition-colors mb-6 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-success" />
              <span className="text-fg font-semibold">{branding.site_name}</span>
              <span className="text-subtle">•</span>
              <span>{branding.tagline}</span>
              <ArrowRight size={12} className="text-muted" />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-fg leading-[1.1]">
              {branding.hero_title}
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
              {branding.hero_subtitle}
            </p>

            {/* Dual CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto text-sm px-6 py-2.5"
                  rightIcon={<ArrowRight size={15} />}
                >
                  Start 14-Day Free Trial
                </Button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto text-sm px-6 py-2.5">
                  Explore Architecture
                </Button>
              </a>
            </div>

            {/* Trust Points */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-success" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-success" /> 5-minute setup
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-success" /> 100% Tenant Isolation
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-success" /> AES-256-GCM Encrypted
              </span>
            </div>
          </div>

          {/* Product UI Showcase */}
          <div className="mt-14 px-2 sm:px-4">
            <ProductPreview />
          </div>
        </section>

        {/* Metrics & Social Proof Bar */}
        <section className="border-y border-border bg-bgSubtle px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                  500,000+
                </div>
                <div className="text-xs text-muted font-medium">Verified Leads Extracted</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                  99.4%
                </div>
                <div className="text-xs text-muted font-medium">Primary Inbox Placement</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                  4-in-1
                </div>
                <div className="text-xs text-muted font-medium">Consolidated Revenue Stack</div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                  100%
                </div>
                <div className="text-xs text-muted font-medium">Cryptographically Isolated</div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features Grid (4 Modules) */}
        <section id="features" className="px-6 py-20 bg-surface">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="neutral" className="mb-3">
                Unified Modules
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">
                Four enterprise modules, zero duct tape
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted">
                Replace 4 separate subscription tools. Lead Reach AI connects each stage of your sales
                pipeline into a continuous automated loop.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Module 1: Lead Gen */}
              <div className="rounded-2xl border border-border bg-bgSubtle p-6 flex flex-col justify-between hover:border-borderStrong transition-all group">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface border border-border text-fg mb-5 group-hover:scale-105 transition-transform">
                    <Users size={20} />
                  </div>
                  <Badge variant="neutral" size="sm" className="mb-2">Module 01</Badge>
                  <h3 className="text-lg font-bold text-fg">Lead Discovery & Enrichment</h3>
                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    Extract fresh business contacts across Google Maps, LinkedIn company profiles,
                    and Meta Ads Library with automatic email verification and CSV/Sheets export.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-medium text-fg">
                  <span>Cloud Scraping Engine</span>
                  <ArrowUpRight size={14} className="text-muted group-hover:text-fg transition-colors" />
                </div>
              </div>

              {/* Module 2: Cold Outreach */}
              <div className="rounded-2xl border border-border bg-bgSubtle p-6 flex flex-col justify-between hover:border-borderStrong transition-all group">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface border border-border text-fg mb-5 group-hover:scale-105 transition-transform">
                    <Send size={20} />
                  </div>
                  <Badge variant="neutral" size="sm" className="mb-2">Module 02</Badge>
                  <h3 className="text-lg font-bold text-fg">Cold Email Engine</h3>
                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    Safeguard domain reputation with strict 25/hour rate limits, randomized jitter delays,
                    mailbox rotation, and custom variables rendered per recipient.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-medium text-fg">
                  <span>Deliverability Armor</span>
                  <ArrowUpRight size={14} className="text-muted group-hover:text-fg transition-colors" />
                </div>
              </div>

              {/* Module 3: Social Hub */}
              <div className="rounded-2xl border border-border bg-bgSubtle p-6 flex flex-col justify-between hover:border-borderStrong transition-all group">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface border border-border text-fg mb-5 group-hover:scale-105 transition-transform">
                    <Share2 size={20} />
                  </div>
                  <Badge variant="neutral" size="sm" className="mb-2">Module 03</Badge>
                  <h3 className="text-lg font-bold text-fg">Multi-Channel Social</h3>
                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    Cross-publish and schedule campaigns to Facebook Pages, Instagram, and LinkedIn.
                    Preview live cards and enable optional manual approvals.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-medium text-fg">
                  <span>OAuth 2.0 Accounts</span>
                  <ArrowUpRight size={14} className="text-muted group-hover:text-fg transition-colors" />
                </div>
              </div>

              {/* Module 4: Intelligent Follow-up */}
              <div className="rounded-2xl border border-border bg-bgSubtle p-6 flex flex-col justify-between hover:border-borderStrong transition-all group">
                <div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface border border-border text-fg mb-5 group-hover:scale-105 transition-transform">
                    <RotateCcw size={20} />
                  </div>
                  <Badge variant="neutral" size="sm" className="mb-2">Module 04</Badge>
                  <h3 className="text-lg font-bold text-fg">Smart Stop-on-Reply</h3>
                  <p className="mt-2 text-xs text-muted leading-relaxed">
                    Background IMAP worker constantly polls connected mailboxes. When a prospect
                    responds, campaigns halt immediately to protect authenticity.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-medium text-fg">
                  <span>Automated Drip Rules</span>
                  <ArrowUpRight size={14} className="text-muted group-hover:text-fg transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Interactive Workflow */}
        <section id="workflow" className="px-6 py-20 border-t border-border bg-bgSubtle">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="neutral" className="mb-3">
                How It Works
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">
                From zero to qualified pipeline in 3 steps
              </h2>
              <p className="mt-3 text-sm text-muted">
                Engineered for speed and minimal cognitive overhead.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-4">
                <div className="h-8 w-8 rounded-lg border border-border bg-bgSubtle text-xs font-bold grid place-items-center text-fg">
                  01
                </div>
                <h3 className="text-lg font-bold text-fg">Target & Connect</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Connect your sending SMTP/IMAP inboxes and social channels. Configure target industry,
                  keywords, or geographic search areas.
                </p>
                <div className="pt-2 text-[11px] font-mono text-muted">
                  ✓ OAuth 2.0 & encrypted credentials
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-4">
                <div className="h-8 w-8 rounded-lg border border-border bg-bgSubtle text-xs font-bold grid place-items-center text-fg">
                  02
                </div>
                <h3 className="text-lg font-bold text-fg">Scrape & Personalize</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Lead Reach AI pulls verified company websites and emails. AI dynamically renders
                  customized opening icebreakers based on live prospect data.
                </p>
                <div className="pt-2 text-[11px] font-mono text-muted">
                  ✓ OpenAI dynamic hook generation
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 space-y-4">
                <div className="h-8 w-8 rounded-lg border border-border bg-bgSubtle text-xs font-bold grid place-items-center text-fg">
                  03
                </div>
                <h3 className="text-lg font-bold text-fg">Automate & Convert</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Sequences dispatch at randomized intervals within safe thresholds. Responses are
                  intercepted in real-time, instantly notifying your team.
                </p>
                <div className="pt-2 text-[11px] font-mono text-muted">
                  ✓ 25/hr rate cap & instant IMAP sync
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Multi-Tenant Isolation */}
        <section id="security" className="px-6 py-20 border-t border-border bg-surface">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-border bg-bgSubtle p-8 md:p-12">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <Badge variant="neutral" className="mb-4 flex items-center gap-1.5 w-fit">
                    <ShieldCheck size={14} className="text-success" /> Strict Multi-Tenant Isolation
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">
                    Enterprise-grade security and cryptographic data segregation
                  </h2>
                  <p className="mt-4 text-sm text-muted leading-relaxed">
                    Every account operates in its own isolated database scope. User credentials, API keys,
                    lead records, and campaign metrics are partition-verified at both the Prisma and
                    API layer.
                  </p>

                  <div className="mt-8 space-y-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface border border-border text-fg shrink-0">
                        <Lock size={16} />
                      </div>
                      <div>
                        <strong className="text-fg font-semibold block text-sm">
                          Zero-Knowledge Key Storage
                        </strong>
                        <span className="text-muted">
                          Your third-party service credentials are encrypted at rest with AES-256-GCM.
                          Decrypted keys are never returned in public payloads.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface border border-border text-fg shrink-0">
                        <Database size={16} />
                      </div>
                      <div>
                        <strong className="text-fg font-semibold block text-sm">
                          Tenant-Scoped Queries
                        </strong>
                        <span className="text-muted">
                          Every single read, write, and mutation query strictly validates tenant ownership
                          with automated test coverage. Cross-tenant access is impossible.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-surface border border-border text-fg shrink-0">
                        <Server size={16} />
                      </div>
                      <div>
                        <strong className="text-fg font-semibold block text-sm">
                          Decoupled BullMQ Worker Pools
                        </strong>
                        <span className="text-muted">
                          High-volume web scraping and email dispatching run asynchronously in Redis-backed
                          queues, ensuring sub-100ms web response times.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Tenant Security Verification Spec Matrix */}
                <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-muted" />
                      <span className="text-xs font-bold text-fg">Isolation Spec Matrix</span>
                    </div>
                    <Badge variant="success" size="sm">Audited & Verified</Badge>
                  </div>

                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="p-3 rounded-lg border border-border bg-bgSubtle flex items-center justify-between">
                      <span className="text-muted">User A → User B Leads</span>
                      <span className="text-success font-bold">404 NOT FOUND</span>
                    </div>

                    <div className="p-3 rounded-lg border border-border bg-bgSubtle flex items-center justify-between">
                      <span className="text-muted">User A → User B Campaigns</span>
                      <span className="text-success font-bold">404 NOT FOUND</span>
                    </div>

                    <div className="p-3 rounded-lg border border-border bg-bgSubtle flex items-center justify-between">
                      <span className="text-muted">User A → User B API Keys</span>
                      <span className="text-success font-bold">404 NOT FOUND</span>
                    </div>

                    <div className="p-3 rounded-lg border border-border bg-bgSubtle flex items-center justify-between">
                      <span className="text-muted">Unauthenticated API Call</span>
                      <span className="text-danger font-bold">401 UNAUTHORIZED</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted pt-2 border-t border-border leading-relaxed">
                    Automated tenant boundary tests run on every pull request to ensure zero data leakage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ Accordion Section */}
        <FAQSection />

        {/* Final Conversion CTA Banner */}
        <section className="px-6 py-20 border-t border-border bg-surface text-center">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-bgSubtle p-10 sm:p-14 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
              Ready to put your growth on autopilot?
            </h2>
            <p className="mx-auto max-w-xl text-sm sm:text-base text-muted leading-relaxed">
              Join high-performing teams using Lead Reach AI to extract verified leads, send personalized
              outreach, and scale social presence from a single dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto text-sm px-7 py-3"
                  rightIcon={<ArrowRight size={15} />}
                >
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto text-sm px-7 py-3">
                  Sign In to Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-border bg-surface px-6 py-12 text-xs text-muted">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand Col */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                {branding.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logo_url}
                    alt={branding.site_name}
                    className="h-7 w-7 object-contain rounded-lg"
                  />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primaryText font-bold shadow-sm">
                    <Zap size={15} />
                  </span>
                )}
                <span className="font-bold text-base text-fg">{branding.site_name}</span>
              </div>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                {branding.tagline}
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="flex h-2 w-2 rounded-full bg-success" />
                <span className="text-[11px] font-medium text-fg">All systems operational</span>
              </div>
              {branding.support_email && (
                <div className="pt-1 text-xs text-muted">
                  Support:{" "}
                  <a
                    href={`mailto:${branding.support_email}`}
                    className="text-fg hover:underline font-mono"
                  >
                    {branding.support_email}
                  </a>
                </div>
              )}
            </div>

            {/* Col 1: Product */}
            <div className="space-y-2.5">
              <div className="font-semibold text-fg">Product</div>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-fg transition-colors">Lead Finder</a></li>
                <li><a href="#features" className="hover:text-fg transition-colors">Outreach Sequencer</a></li>
                <li><a href="#features" className="hover:text-fg transition-colors">Social Scheduler</a></li>
                <li><a href="#features" className="hover:text-fg transition-colors">IMAP Stop-on-Reply</a></li>
              </ul>
            </div>

            {/* Col 2: Platform */}
            <div className="space-y-2.5">
              <div className="font-semibold text-fg">Platform</div>
              <ul className="space-y-2">
                <li><a href="#security" className="hover:text-fg transition-colors">Security Architecture</a></li>
                <li><a href="#workflow" className="hover:text-fg transition-colors">Automation Workflow</a></li>
                <li><a href="#pricing" className="hover:text-fg transition-colors">Pricing Plans</a></li>
                <li><a href="#faq" className="hover:text-fg transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Col 3: Legal & Auth */}
            <div className="space-y-2.5">
              <div className="font-semibold text-fg">Legal & Account</div>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="hover:text-fg transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-fg transition-colors">Terms of Service</Link></li>
                <li><Link href="/login" className="hover:text-fg transition-colors">Sign In</Link></li>
                <li><Link href="/signup" className="hover:text-fg transition-colors">Create Account</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>{branding.footer_copyright}</div>
            <div className="flex items-center gap-4 text-muted">
              {branding.twitter_url && (
                <a
                  href={branding.twitter_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fg transition-colors"
                >
                  Twitter
                </a>
              )}
              {branding.linkedin_url && (
                <a
                  href={branding.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fg transition-colors"
                >
                  LinkedIn
                </a>
              )}
              {branding.github_url && (
                <a
                  href={branding.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-fg transition-colors"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
