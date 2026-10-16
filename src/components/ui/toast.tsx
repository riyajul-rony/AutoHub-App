"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (options: { title: string; description?: string; type?: ToastType }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type = "info" }: { title: string; description?: string; type?: ToastType }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((title: string, description?: string) => addToast({ title, description, type: "success" }), [addToast]);
  const error = useCallback((title: string, description?: string) => addToast({ title, description, type: "error" }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-[6px] border border-border bg-surface text-text shadow-lg animate-in slide-in-from-bottom-2 duration-120"
          >
            {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" strokeWidth={1.5} />}
            {t.type === "error" && <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" strokeWidth={1.5} />}
            {t.type === "warning" && <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />}
            {t.type === "info" && <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={1.5} />}

            <div className="flex-1 text-xs">
              <p className="font-semibold text-text leading-tight">{t.title}</p>
              {t.description ? <p className="text-text-muted mt-0.5 leading-normal">{t.description}</p> : null}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-text-subtle hover:text-text p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
    };
  }
  return context;
}
