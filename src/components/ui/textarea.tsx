import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, helperText, id, disabled, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = error && textareaId ? `${textareaId}-error` : undefined;
    const helperId = helperText && textareaId ? `${textareaId}-helper` : undefined;

    return (
      <div className="w-full space-y-1">
        {label ? (
          <label htmlFor={textareaId} className="block text-xs font-medium text-text-muted">
            {label}
          </label>
        ) : null}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helperId}
          className={`w-full p-2.5 rounded-[6px] bg-surface text-text text-sm transition-colors outline-none placeholder:text-text-subtle disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-subtle resize-y ${
            error
              ? "border border-danger focus:ring-2 focus:ring-danger/20"
              : "border border-border-input hover:border-text-muted focus:border-focus-ring focus:ring-2 focus:ring-focus-ring/20"
          } ${className}`}
          {...props}
        />

        {error ? (
          <p id={errorId} className="text-xs text-danger font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-text-subtle">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
