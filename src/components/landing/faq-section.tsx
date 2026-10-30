"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How does Lead Reach AI protect cold emails from landing in spam?",
    answer:
      "Lead Reach AI employs a multi-tiered deliverability architecture: strict 25 email/hour sending caps per mailbox, randomized delay jitter between dispatches, automatic inbox rotation across multiple connected SMTP accounts, and custom unsubscribe headers to keep your sender reputation pristine.",
  },
  {
    question: "Are my third-party API keys and credentials safe?",
    answer:
      "Yes. All sensitive credentials—including OpenAI keys, Apify credentials, and SMTP/IMAP passwords—are encrypted at rest using AES-256-GCM. We never expose decrypted keys in API payloads or browser responses, and your data is cryptographically isolated within your tenant.",
  },
  {
    question: "How does the automated Stop-on-Reply mechanism work?",
    answer:
      "Lead Reach AI's background IMAP poller checks your connected inboxes for replies to outgoing campaign threads. When a prospect responds, the system immediately flags the lead as 'Replied' and halts all remaining drip sequence steps for that recipient, ensuring you never send an awkward follow-up.",
  },
  {
    question: "Can I extract leads from Google Maps, LinkedIn, and Meta Ads?",
    answer:
      "Yes. Lead Reach AI connects with high-speed cloud scrapers and deep web enrichment algorithms to pull live businesses, websites, contact names, and verified email addresses across Google Maps, LinkedIn decision-makers, and Meta Ads Library with automatic deduplication.",
  },
  {
    question: "Can I export scraped leads to Google Sheets or CSV?",
    answer:
      "Absolutely. With a single click from the Leads Finder, you can export your filtered and enriched prospect lists as clean CSV files or sync them directly to your connected Google Sheets spreadsheet.",
  },
  {
    question: "What social media platforms are supported for auto-posting?",
    answer:
      "Lead Reach AI currently supports direct multi-channel publishing to Facebook Pages, Instagram Professional Accounts, and LinkedIn Personal & Company pages, complete with media attachments, scheduling, and optional manual review workflows.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="px-6 py-20 border-t border-border bg-surface">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="neutral" className="mb-3">
            Got Questions?
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted">
            Everything you need to know about Lead Reach AI features, deliverability, and security.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-bgSubtle transition-colors overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm sm:text-base font-semibold text-fg hover:text-primary transition-colors focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-muted transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-fg" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-muted leading-relaxed border-t border-border/50">
                    <p className="pt-3">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
