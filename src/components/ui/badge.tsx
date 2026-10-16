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
    neutral: "bg-bg-subtle text-text-muted border border-border",
    accent: "bg-accent-subtle text-accent-text border border-accent/25",
    success: "bg-success-bg text-success border border-success/25",
    warning: "bg-warning-bg text-warning border border-warning/25",
    danger: "bg-danger-bg text-danger border border-danger/25",
  }[variant];

  const dotClasses = {
    neutral: "bg-text-muted",
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
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
