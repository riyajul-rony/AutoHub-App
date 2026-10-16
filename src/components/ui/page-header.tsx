import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border/60 ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-text leading-tight">{title}</h1>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </div>
        {description ? (
          <p className="text-xs text-text-muted leading-normal max-w-2xl">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
};

PageHeader.displayName = "PageHeader";
