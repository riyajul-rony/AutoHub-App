"use client";

import React from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      buttonVariant: "danger" as const,
      icon: <AlertCircle className="text-red-500" size={20} />,
      bg: "bg-red-500/10 border-red-500/20",
    },
    warning: {
      buttonVariant: "secondary" as const,
      icon: <AlertTriangle className="text-amber-500" size={20} />,
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    primary: {
      buttonVariant: "primary" as const,
      icon: <Info className="text-brand" size={20} />,
      bg: "bg-brand/10 border-brand/20",
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-surface rounded-xl border border-border w-full max-w-md p-6 shadow-2xl relative space-y-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className={`grid h-9 w-9 place-items-center rounded-lg border ${variantStyles.bg}`}>
              {variantStyles.icon}
            </span>
            <div>
              <h3 className="text-base font-semibold text-fg">{title}</h3>
              <p className="text-xs text-muted mt-0.5">Please confirm this administrative action.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-muted hover:text-fg p-1 rounded-md transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted leading-relaxed border-t border-b border-border py-3">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variantStyles.buttonVariant}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
