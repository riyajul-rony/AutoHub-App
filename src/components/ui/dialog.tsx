"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  confirmVariant = "primary",
  loading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-description" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-[8px] border border-border bg-surface text-text p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="dialog-title" className="text-base font-semibold leading-snug text-text">
              {title}
            </h3>
            {description ? (
              <p id="dialog-description" className="text-xs text-text-muted mt-1 leading-normal">
                {description}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-text-subtle hover:text-text p-1 rounded hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {children ? <div className="text-sm">{children}</div> : null}

        {onConfirm || confirmLabel ? (
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/50">
            <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            {onConfirm && confirmLabel ? (
              <Button
                variant={confirmVariant}
                size="md"
                onClick={onConfirm}
                loading={loading}
              >
                {confirmLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

Dialog.displayName = "Dialog";
