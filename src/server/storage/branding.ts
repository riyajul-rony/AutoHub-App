import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import { logger } from "@/server/logger";

export type BrandingImageType = "logo_light" | "logo_dark" | "favicon" | "og_image";

/**
 * Returns the absolute directory where branding assets are saved.
 * Defaults to `/data/uploads/branding` in Docker (appdata volume)
 * or local `<project>/data/uploads/branding` on Windows / local dev.
 */
export function getBrandingDir(): string {
  if (process.env.STORAGE_PATH) {
    return path.join(process.env.STORAGE_PATH, "branding");
  }
  // In CI runners (e.g. GitHub Actions Linux), test runs, or local Windows dev:
  if (process.env.NODE_ENV === "test" || process.env.CI || process.platform === "win32") {
    return path.join(process.cwd(), "data", "uploads", "branding");
  }
  // In Docker production container with /data volume mounted:
  if (fs.existsSync("/data")) {
    return "/data/uploads/branding";
  }
  return path.join(process.cwd(), "data", "uploads", "branding");
}

export const MAX_BRANDING_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_FAVICON_FILE_BYTES = 512 * 1024; // 512 KB

/**
 * Inspects initial buffer bytes or string content to verify real MIME format.
 */
export function detectRealMimeType(
  buffer: Buffer
): { mime: string; ext: string } | null {
  if (buffer.length < 4) return null;

  // PNG magic bytes: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // WebP magic bytes: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // ICO magic bytes: 00 00 01 00
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return { mime: "image/x-icon", ext: "ico" };
  }

  // Check SVG (text based: starts with <?xml or <svg)
  const headerSlice = buffer.slice(0, Math.min(buffer.length, 1024)).toString("utf8").trim();
  if (
    headerSlice.startsWith("<svg") ||
    (headerSlice.startsWith("<?xml") && headerSlice.includes("<svg")) ||
    headerSlice.includes("<svg")
  ) {
    return { mime: "image/svg+xml", ext: "svg" };
  }

  return null;
}

/**
 * Thoroughly sanitizes SVG content and rejects dangerous executable scripts,
 * event handlers, and remote embedded frames to prevent Stored XSS.
 */
export function sanitizeAndValidateSvg(svgText: string): { safe: boolean; error?: string } {
  const lower = svgText.toLowerCase();

  // 1. Script tag check
  if (/<script[\s\S]*?>[\s\S]*?<\/script>/i.test(svgText) || lower.includes("<script")) {
    return { safe: false, error: "SVG contains <script> tags and was rejected for security." };
  }

  // 2. JavaScript protocol check (e.g. href="javascript:...")
  if (/href\s*=\s*['"]\s*javascript:/i.test(svgText) || lower.includes("javascript:")) {
    return { safe: false, error: "SVG contains javascript: protocol URI and was rejected for security." };
  }

  // 3. Inline event handlers (onload, onerror, onclick, etc.)
  if (/\bon\w+\s*=/i.test(svgText)) {
    return { safe: false, error: "SVG contains inline event handlers (on* attributes) and was rejected for security." };
  }

  // 4. Embedded foreign objects / frames / embeds
  if (
    lower.includes("<foreignobject") ||
    lower.includes("<iframe") ||
    lower.includes("<embed") ||
    lower.includes("<object")
  ) {
    return { safe: false, error: "SVG contains dangerous embedded objects (<foreignObject>, <iframe>, <embed>) and was rejected." };
  }

  return { safe: true };
}

/**
 * Validates, sanitizes, optimizes and stores a branding image to disk.
 * Returns public URL with timestamp cache-buster.
 */
export async function saveBrandingImage(
  fileBuffer: Buffer,
  targetType: BrandingImageType
): Promise<{ url: string; error?: string }> {
  const maxBytes = targetType === "favicon" ? MAX_FAVICON_FILE_BYTES : MAX_BRANDING_FILE_BYTES;
  const maxMb = maxBytes / (1024 * 1024);

  if (fileBuffer.byteLength > maxBytes) {
    return {
      url: "",
      error: `File exceeds maximum allowed size of ${maxMb}MB for this asset.`,
    };
  }

  const detected = detectRealMimeType(fileBuffer);
  if (!detected) {
    return {
      url: "",
      error: "Unsupported file format. Please upload a valid PNG, JPG, WEBP, SVG, or ICO image.",
    };
  }

  try {
    const dir = getBrandingDir();
    await fs.promises.mkdir(dir, { recursive: true });

    const hash = crypto.randomBytes(6).toString("hex");
    const timestamp = Date.now();
    let finalBuffer: Buffer = fileBuffer;
    let finalExt = detected.ext;

    // A. SVG Handling
    if (detected.mime === "image/svg+xml") {
      const svgText = fileBuffer.toString("utf8");
      const validation = sanitizeAndValidateSvg(svgText);
      if (!validation.safe) {
        return { url: "", error: validation.error || "Dangerous SVG rejected." };
      }
      finalBuffer = Buffer.from(svgText, "utf8");
      finalExt = "svg";
    }
    // B. Raster Image Handling (PNG / JPEG / WebP / ICO)
    else {
      if (targetType === "favicon") {
        // Optimize favicon to 128x128 square PNG (broad browser support)
        finalBuffer = await sharp(fileBuffer)
          .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ quality: 90 })
          .toBuffer();
        finalExt = "png";
      } else if (targetType === "og_image") {
        // Standard OG image: 1200x630
        finalBuffer = await sharp(fileBuffer)
          .resize(1200, 630, { fit: "cover", position: "center" })
          .webp({ quality: 85 })
          .toBuffer();
        finalExt = "webp";
      } else {
        // Logos: resize preserving aspect ratio, max width 512, transparent WebP
        finalBuffer = await sharp(fileBuffer)
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 90 })
          .toBuffer();
        finalExt = "webp";
      }
    }

    const filename = `branding-${targetType}-${timestamp}-${hash}.${finalExt}`;
    const fullPath = path.join(dir, filename);
    await fs.promises.writeFile(fullPath, finalBuffer);

    logger.info(
      { targetType, filename, sizeBytes: finalBuffer.length },
      "Branding asset saved successfully"
    );

    // Return URL with timestamp cache-buster
    return {
      url: `/api/v1/uploads/branding/${filename}?v=${timestamp}`,
    };
  } catch (err: any) {
    logger.error({ err: err?.message, targetType }, "Failed to process and save branding image");
    return {
      url: "",
      error: "Failed to process image. Please try a different file.",
    };
  }
}

/**
 * Safely reads a branding file from disk preventing directory traversal.
 */
export async function getBrandingFile(
  filename: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeName = path.basename(filename);
  if (!safeName || safeName.includes("..") || !/^[a-zA-Z0-9_\-\.]+$/.test(safeName)) {
    return null;
  }

  const fullPath = path.join(getBrandingDir(), safeName);
  try {
    const buffer = await fs.promises.readFile(fullPath);
    let contentType = "application/octet-stream";
    const ext = path.extname(safeName).toLowerCase();
    if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".ico") contentType = "image/x-icon";

    return { buffer, contentType };
  } catch {
    return null;
  }
}

/**
 * Removes an existing branding image from disk when replaced or deleted.
 */
export async function removeBrandingFile(fileUrl?: string | null): Promise<void> {
  if (!fileUrl) return;
  try {
    // Strip query parameters (?v=...)
    const cleanUrl = fileUrl.split("?")[0];
    if (!cleanUrl.startsWith("/api/v1/uploads/branding/")) return;

    const filename = path.basename(cleanUrl);
    if (!filename || filename.includes("..") || !/^[a-zA-Z0-9_\-\.]+$/.test(filename)) return;

    const fullPath = path.join(getBrandingDir(), filename);
    await fs.promises.unlink(fullPath).catch(() => null);
  } catch {}
}

