"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Menu, X, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md px-6 py-3.5 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primaryText font-bold shadow-sm group-hover:opacity-90 transition-opacity">
            <Zap size={18} />
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-fg">AutoHub</span>
            <span className="rounded border border-border bg-bgSubtle px-1.5 py-0.2 text-[10px] font-mono font-medium text-muted">
              2.0
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-muted">
          <a href="#features" className="hover:text-fg transition-colors">
            Features
          </a>
          <a href="#workflow" className="hover:text-fg transition-colors">
            Workflow
          </a>
          <a href="#security" className="hover:text-fg transition-colors">
            Security
          </a>
          <a href="#pricing" className="hover:text-fg transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-fg transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right CTA Group */}
        <div className="hidden sm:flex items-center gap-2.5">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              variant="primary"
              size="sm"
              className="text-xs"
              rightIcon={<ArrowRight size={13} />}
            >
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md border border-border text-muted hover:text-fg hover:bg-bgSubtle"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden mt-3 pt-3 border-t border-border space-y-3 pb-2 text-xs">
          <nav className="flex flex-col space-y-2 text-muted font-medium">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-bgSubtle hover:text-fg"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-bgSubtle hover:text-fg"
            >
              Workflow
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-bgSubtle hover:text-fg"
            >
              Security
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-bgSubtle hover:text-fg"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-bgSubtle hover:text-fg"
            >
              FAQ
            </a>
          </nav>
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="secondary" size="sm" className="w-full text-xs">
                Log in
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="sm" className="w-full text-xs">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
