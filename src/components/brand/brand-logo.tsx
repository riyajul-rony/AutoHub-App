"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";

interface BrandLogoProps {
  siteName?: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  showText?: boolean;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  fallbackIcon?: React.ReactNode;
}

const SIZE_MAP = {
  xs: { box: "h-5 w-5", icon: 12, imgH: "h-5 max-w-[80px]", text: "text-xs" },
  sm: { box: "h-6 w-6", icon: 14, imgH: "h-6 max-w-[120px]", text: "text-xs" },
  md: { box: "h-8 w-8", icon: 18, imgH: "h-8 max-w-[160px]", text: "text-sm font-semibold" },
  lg: { box: "h-10 w-10", icon: 22, imgH: "h-10 max-w-[200px]", text: "text-base font-bold" },
  xl: { box: "h-12 w-12", icon: 26, imgH: "h-12 max-w-[240px]", text: "text-lg font-bold" },
};

export function BrandLogo({
  siteName = "Lead Reach AI",
  logoUrl,
  logoDarkUrl,
  size = "md",
  showText = true,
  className = "",
  imageClassName = "",
  textClassName = "",
  fallbackIcon,
}: BrandLogoProps) {
  const [lightFailed, setLightFailed] = useState(false);
  const [darkFailed, setDarkFailed] = useState(false);

  const sizeConfig = typeof size === "string" ? SIZE_MAP[size] || SIZE_MAP.md : SIZE_MAP.md;
  const hasDarkLogo = Boolean(logoDarkUrl && !darkFailed);
  const hasLightLogo = Boolean(logoUrl && !lightFailed);

  // Default SVG mark when no logo is set or image fails
  const renderFallbackMark = () => (
    <span
      className={`grid ${sizeConfig.box} place-items-center rounded-lg bg-primary text-primary-text font-bold shadow-xs shrink-0 select-none`}
      aria-hidden="true"
    >
      {fallbackIcon || <Zap size={sizeConfig.icon} />}
    </span>
  );

  return (
    <div className={`inline-flex items-center gap-2.5 overflow-hidden ${className}`}>
      {/* 1. Both Light and Dark logos uploaded */}
      {hasLightLogo && hasDarkLogo ? (
        <>
          {/* Light Logo shown in light mode */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl!}
            alt={siteName}
            onError={() => setLightFailed(true)}
            className={`${sizeConfig.imgH} object-contain rounded shrink-0 dark:hidden block [data-theme='dark']_&:hidden ${imageClassName}`}
          />
          {/* Dark Logo shown in dark mode */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDarkUrl!}
            alt={siteName}
            onError={() => setDarkFailed(true)}
            className={`${sizeConfig.imgH} object-contain rounded shrink-0 hidden dark:block [data-theme='dark']_&:block ${imageClassName}`}
          />
        </>
      ) : hasLightLogo ? (
        /* 2. Only Light logo uploaded: used in both light and dark modes */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt={siteName}
          onError={() => setLightFailed(true)}
          className={`${sizeConfig.imgH} object-contain rounded shrink-0 ${imageClassName}`}
        />
      ) : hasDarkLogo ? (
        /* 3. Only Dark logo uploaded */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoDarkUrl!}
          alt={siteName}
          onError={() => setDarkFailed(true)}
          className={`${sizeConfig.imgH} object-contain rounded shrink-0 ${imageClassName}`}
        />
      ) : (
        /* 4. Default Brand Icon */
        renderFallbackMark()
      )}

      {/* Brand Text */}
      {showText && (
        <span
          className={`tracking-tight text-fg truncate leading-tight select-none ${sizeConfig.text} ${textClassName}`}
        >
          {siteName}
        </span>
      )}
    </div>
  );
}
