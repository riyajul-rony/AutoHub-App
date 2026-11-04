import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  dot?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "neutral",
  size = "md",
  dot = false,
  icon,
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: "h-5 px-1.5 text-[11px] gap-1",
    md: "h-6 px-2 text-xs gap-1.5",
  }[size];

  const variantClasses = {
    neutral: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] border border-[var(--badge-neutral-border)]",
    accent: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-border)]",
    success: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-border)]",
    warning: "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-border)]",
    danger: "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--badge-danger-border)]",
  }[variant];

  const dotClasses = {
    neutral: "bg-[var(--badge-neutral-dot)]",
    accent: "bg-[var(--badge-success-dot)]",
    success: "bg-[var(--badge-success-dot)]",
    warning: "bg-[var(--badge-warning-dot)]",
    danger: "bg-[var(--badge-danger-dot)]",
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-[4px] whitespace-nowrap select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {dot ? <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses}`} /> : null}
      {icon ? <span className="shrink-0 flex items-center">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
};

Badge.displayName = "Badge";
