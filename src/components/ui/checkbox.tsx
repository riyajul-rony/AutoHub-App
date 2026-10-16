import React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, description, id, disabled, checked, ...props }, ref) => {
    const inputId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            disabled={disabled}
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div className="w-4 h-4 rounded-[4px] border border-border-input bg-surface transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring peer-focus-visible:ring-offset-1 peer-checked:bg-primary peer-checked:border-primary group-hover:border-text-muted flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-text opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={2.5} />
          </div>
        </div>

        {label || description ? (
          <div className="text-sm leading-tight">
            {label ? <span className="font-medium text-text">{label}</span> : null}
            {description ? <p className="text-xs text-text-muted mt-0.5">{description}</p> : null}
          </div>
        ) : null}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
