import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Height & padding tokens: sm = 32px, md = 36px, lg = 40px
    const sizeClasses = {
      sm: "h-8 px-2.5 text-xs gap-1.5",
      md: "h-9 px-3.5 text-sm gap-2",
      lg: "h-10 px-4 text-base gap-2.5",
    }[size];

    // Minimal Linear/Notion variants
    const variantClasses = {
      primary:
        "bg-primary text-primary-text border border-primary hover:opacity-90 active:translate-y-px",
      secondary:
        "bg-surface text-text border border-border hover:bg-surface-hover active:translate-y-px",
      ghost:
        "bg-transparent text-text border border-transparent hover:bg-surface-hover active:translate-y-px",
      danger:
        "bg-danger-bg text-danger border border-danger/30 hover:bg-danger hover:text-white active:translate-y-px",
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.5} />
        ) : icon ? (
          <span className="shrink-0 flex items-center">{icon}</span>
        ) : null}
        {children ? <span>{children}</span> : null}
      </button>
    );
  }
);

Button.displayName = "Button";
