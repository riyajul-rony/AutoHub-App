import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, helperText, id, disabled, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = error && selectId ? `${selectId}-error` : undefined;
    const helperId = helperText && selectId ? `${selectId}-helper` : undefined;

    return (
      <div className="w-full space-y-1">
        {label ? (
          <label htmlFor={selectId} className="block text-xs font-medium text-text-muted">
            {label}
          </label>
        ) : null}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={`w-full h-9 pl-3 pr-8 rounded-[6px] bg-surface text-text text-sm transition-colors outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-subtle cursor-pointer ${
              error
                ? "border border-danger focus:ring-2 focus:ring-danger/20"
                : "border border-border-input hover:border-text-muted focus:border-focus-ring focus:ring-2 focus:ring-focus-ring/20"
            } ${className}`}
            {...props}
          >
            {children}
          </select>

          <ChevronDown
            className="absolute right-2.5 w-4 h-4 text-text-subtle pointer-events-none shrink-0"
            strokeWidth={1.5}
          />
        </div>

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

Select.displayName = "Select";
