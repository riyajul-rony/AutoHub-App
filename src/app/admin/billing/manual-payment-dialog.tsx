"use client";

import React, { useState } from "react";
import { Plus, X, Check, Loader2, DollarSign } from "lucide-react";
import { recordManualPaymentAction } from "./billing-actions";
import { Button } from "@/components/ui/button";

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  currency: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
  plan: string;
}

interface ManualPaymentDialogProps {
  users: UserOption[];
  plans: PlanOption[];
}

export function ManualPaymentDialog({ users, plans }: ManualPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
  const [selectedPlanId, setSelectedPlanId] = useState(
    plans.find((p) => p.slug !== "free")?.id || plans[0]?.id || ""
  );
  const [amount, setAmount] = useState<number>(() => {
    const p = plans.find((pl) => pl.slug !== "free") || plans[0];
    return p ? Number(p.price_monthly) : 29;
  });
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState("bKash");
  const [transactionId, setTransactionId] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);
  const [note, setNote] = useState("");

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const p = plans.find((pl) => pl.id === planId);
    if (p) {
      setAmount(Number(p.price_monthly) * durationMonths);
      setCurrency(p.currency || "USD");
    }
  };

  const handleMonthsChange = (months: number) => {
    setDurationMonths(months);
    const p = plans.find((pl) => pl.id === selectedPlanId);
    if (p) {
      setAmount(Number(p.price_monthly) * months);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await recordManualPaymentAction({
        userId: selectedUserId,
        planId: selectedPlanId,
        amount: Number(amount),
        currency,
        method,
        transactionId: transactionId.trim() || undefined,
        durationMonths,
        note: note.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to record payment.");
      } else {
        setSuccess(`Payment recorded successfully! Invoice #${res.invoiceNumber}`);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="primary"
        size="sm"
        className="inline-flex items-center gap-1.5"
      >
        <Plus size={14} /> Record Payment
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-fg flex items-center gap-2">
                  <DollarSign size={18} className="text-brand" />
                  Record Manual Payment
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Credit a tenant subscription manually for bKash, bank, or crypto transfers.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-bgSubtle transition"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Check size={16} /> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* User Selector */}
              <div>
                <label className="block font-medium text-muted mb-1">Target Tenant / User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || "User"} — {u.email} (Current: {u.plan})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted mb-1">Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    required
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.price_monthly}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-muted mb-1">Duration</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => handleMonthsChange(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                  </select>
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-muted mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="BDT">BDT (Tk)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Payment Method & Trx ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Crypto (USDT)">Crypto (USDT)</option>
                    <option value="Cash / Other">Cash / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-muted mb-1">Trx / Reference ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 9H7B3ZX12..."
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>

              {/* Internal Note */}
              <div>
                <label className="block font-medium text-muted mb-1">Internal Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via WhatsApp support confirmation"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                >
                  {loading && <Loader2 size={13} className="animate-spin mr-1.5" />}
                  Confirm &amp; Activate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
