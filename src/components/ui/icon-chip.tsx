import React from "react";

export interface IconChipProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  variant?: "emerald" | "neutral" | "amber" | "red" | "blue" | "instagram";
  size?: "sm" | "md" | "lg";
}

export const IconChip: React.FC<IconChipProps> = ({
  icon,
  variant = "neutral",
  size = "md",
  className = "",
  ...props
}) => {
  const sizeClasses = {
    sm: "w-7 h-7 text-xs rounded-[6px]",
    md: "w-9 h-9 text-sm rounded-[8px]",
    lg: "w-11 h-11 text-base rounded-[10px]",
  }[size];

  const variantClasses = {
    emerald:
      "bg-[var(--brand-emerald-subtle)] text-[var(--badge-success-text)] border border-[var(--brand-emerald-border)]",
    neutral:
      "bg-bg-subtle text-text-muted border border-border",
    amber:
      "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-border)]",
    red:
      "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--badge-danger-border)]",
    blue:
      "bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/20",
    instagram:
      "bg-[#E4405F]/10 text-[#E4405F] border border-[#E4405F]/20",
  }[variant];

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 transition-colors ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {icon}
    </div>
  );
};

IconChip.displayName = "IconChip";
