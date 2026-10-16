import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode; // backwards compatibility alias for leftIcon
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
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

    // Minimal Linear/Notion variants with strict WCAG AA contrast in both themes
    const variantClasses = {
      primary:
        "bg-primary text-primary-foreground border border-primary hover:opacity-90 active:translate-y-px",
      secondary:
        "bg-surface text-text border border-border hover:bg-surface-hover hover:border-border-strong active:translate-y-px",
      outline:
        "bg-transparent text-text border border-border hover:bg-surface-hover hover:border-border-strong active:translate-y-px",
      ghost:
        "bg-transparent text-text border border-transparent hover:bg-surface-hover active:translate-y-px",
      destructive:
        "bg-danger text-white border border-danger hover:bg-danger/90 active:translate-y-px",
      danger:
        "bg-danger text-white border border-danger hover:bg-danger/90 active:translate-y-px",
    }[variant];

    const effectiveLeftIcon = leftIcon || icon;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 select-none cursor-pointer whitespace-nowrap [&>svg]:shrink-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.5} />
        ) : effectiveLeftIcon ? (
          <span className="shrink-0 inline-flex items-center">{effectiveLeftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon ? (
          <span className="shrink-0 inline-flex items-center">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";
