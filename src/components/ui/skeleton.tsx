import React from "react";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className = "", ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-[4px] bg-surface-hover/80 ${className}`}
      {...props}
    />
  );
};

Skeleton.displayName = "Skeleton";
