import React from "react";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = "", label, description, id, disabled, checked, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        } ${className}`}
      >
        {label || description ? (
          <div className="text-sm">
            {label ? <span className="font-medium text-text">{label}</span> : null}
            {description ? <p className="text-xs text-text-muted mt-0.5">{description}</p> : null}
          </div>
        ) : null}

        <div className="relative inline-flex items-center shrink-0">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div className="w-9 h-5 bg-border rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring peer-focus-visible:ring-offset-1 peer-checked:bg-primary" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-xs" />
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";
