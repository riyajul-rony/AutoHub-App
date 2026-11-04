"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Check, Image as ImageIcon, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandingImageUploaderProps {
  label: string;
  description?: string;
  targetType: "logo_light" | "logo_dark" | "favicon" | "og_image";
  value?: string | null;
  onChange: (url: string | null) => void;
  maxSizeMb?: number;
  previewHeight?: string;
}

export function BrandingImageUploader({
  label,
  description,
  targetType,
  value,
  onChange,
  maxSizeMb = 2,
  previewHeight = "h-16",
}: BrandingImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);

    // Client-side quick check
    if (file.size > maxSizeMb * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size allowed is ${maxSizeMb}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", targetType);

      const res = await fetch("/api/v1/admin/branding/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      onChange(data.url);
      setUploadError(null);
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-fg flex items-center gap-1.5">
            <ImageIcon size={14} className="text-primary" /> {label}
          </label>
          {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-muted hover:text-fg underline cursor-pointer"
          >
            {showUrlInput ? "Hide URL input" : "Edit as URL"}
          </button>
        </div>
      </div>

      {/* Current Preview Card */}
      {value ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-bgSubtle">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`grid ${previewHeight} min-w-[64px] max-w-[140px] place-items-center rounded border border-border/80 bg-neutral-900/40 p-1.5`}
              style={{
                backgroundImage:
                  "repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt={label}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <Check size={12} /> Active asset
              </span>
              <p className="text-[11px] text-muted truncate max-w-[280px]" title={value}>
                {value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <RefreshCw size={12} className="mr-1" /> Replace
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isUploading}
              onClick={() => onChange(null)}
              className="text-xs"
              title="Remove asset and reset to default"
            >
              <X size={12} className="mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        /* Drag & Drop Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex flex-col items-center justify-center p-5 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-center ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-bgSubtle"
          } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary mb-2 group-hover:scale-105 transition-transform">
            <Upload size={16} />
          </div>
          <p className="text-xs font-medium text-fg">
            {isUploading ? "Uploading & optimizing asset..." : "Drop image here or click to browse"}
          </p>
          <p className="text-[10px] text-muted mt-1">
            PNG, JPG, WEBP, SVG {targetType === "favicon" ? "or ICO" : ""} (Max {maxSizeMb}MB)
          </p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={
          targetType === "favicon"
            ? "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,.png,.jpg,.jpeg,.webp,.svg"
            : "image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
        }
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Optional Manual URL Fallback Input */}
      {showUrlInput && (
        <div className="pt-1.5 space-y-1">
          <label className="text-[11px] text-muted flex items-center gap-1">
            <ExternalLink size={10} /> Direct Image URL Fallback:
          </label>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value.trim() || null)}
            placeholder="https://... or /api/v1/uploads/..."
            className="w-full h-8 rounded-md border border-border-input bg-surface px-2.5 text-xs text-fg focus:border-focus-ring focus:outline-none"
          />
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-300 p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
