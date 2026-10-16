"use client";

import React, { useState } from "react";
import { cancelSubscriptionAction, markPaymentRefundAction } from "./billing-actions";
import { Ban, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this subscription? The user will revert to Free once expired.")) {
      return;
    }
    setLoading(true);
    try {
      await cancelSubscriptionAction(subscriptionId);
    } catch (err: any) {
      alert(err.message || "Failed to cancel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCancel}
      disabled={loading}
      variant="ghost"
      size="sm"
      className="!p-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
      title="Cancel Subscription"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
    </Button>
  );
}

export function RefundPaymentButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    const reason = prompt("Enter reason for marking this payment as refunded:");
    if (reason === null) return;

    setLoading(true);
    try {
      await markPaymentRefundAction(paymentId, reason || "Administrative refund");
    } catch (err: any) {
      alert(err.message || "Failed to refund");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRefund}
      disabled={loading}
      variant="ghost"
      size="sm"
      className="!p-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
      title="Mark as Refunded"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
    </Button>
  );
}
