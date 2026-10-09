import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MODULES } from "@/lib/modules";

export const metadata = { title: "Hub — AutoHub", description: "Choose an automation to get started." };

export default function HubPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <section className="float-in py-8">
        <span className="badge">Welcome back</span>
        <h1 className="mt-3 text-4xl font-bold md:text-5xl">
          What do you want to <span className="gradient-text">automate</span> today?
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Four automations, one hub. Start any task in three clicks.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2" aria-label="Automation modules">
        {MODULES.map((m, i) => (
          <Link
            key={m.id}
            id={`hub-card-${m.id}`}
            href={m.href}
            className="hub-card glass float-in block"
            style={{ ["--glow" as string]: m.glow, animationDelay: `${i * 90}ms` }}
          >
            <div className="relative z-10 flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-brand-2">
                <m.icon size={24} />
              </span>
              <ArrowUpRight className="text-muted" />
            </div>
            <h2 className="relative z-10 mt-5 text-xl font-semibold">{m.title}</h2>
            <p className="relative z-10 mt-2 text-sm text-muted">{m.description}</p>
            <div className="relative z-10 mt-5 flex flex-wrap gap-2">
              {m.options.map((o) => (
                <span key={o.href} className="badge">{o.label}</span>
              ))}
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Quick stats">
        {[
          ["Posts today", "0"],
          ["Leads collected", "0"],
          ["Emails sent today", "0"],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-5">
            <div className="text-sm text-muted">{k}</div>
            <div className="mt-1 text-3xl font-bold">{v}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
