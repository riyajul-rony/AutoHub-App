import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      label,
      error,
      helperText,
      icon,
      endAdornment,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = error && inputId ? `${inputId}-error` : undefined;
    const helperId = helperText && inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full space-y-1">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-text-muted"
          >
            {label}
          </label>
        ) : null}

        <div className="relative flex items-center">
          {icon ? (
            <div className="absolute left-2.5 text-text-subtle pointer-events-none flex items-center">
              {icon}
            </div>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={`w-full h-9 rounded-[6px] bg-surface text-text text-sm transition-colors outline-none placeholder:text-text-subtle disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-subtle ${
              icon ? "pl-8" : "pl-3"
            } ${endAdornment ? "pr-8" : "pr-3"} ${
              error
                ? "border border-danger focus:ring-2 focus:ring-danger/20"
                : "border border-border-input hover:border-text-muted focus:border-focus-ring focus:ring-2 focus:ring-focus-ring/20"
            } ${className}`}
            {...props}
          />

          {endAdornment ? (
            <div className="absolute right-2.5 text-text-subtle flex items-center">
              {endAdornment}
            </div>
          ) : null}
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

Input.displayName = "Input";
