import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import { logger } from "@/server/logger";

/**
 * Returns the absolute path where avatar images are saved.
 * Defaults to `/data/uploads/avatars` in Docker (appdata volume)
 * or local `<project>/data/uploads/avatars` on Windows / local dev.
 */
export function getAvatarDir(): string {
  const base =
    process.env.STORAGE_PATH ||
    (process.platform === "win32"
      ? path.join(process.cwd(), "data", "uploads")
      : "/data/uploads");
  return path.join(base, "avatars");
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB limit

/**
 * Validates, crops/resizes to 256x256 square WebP, and saves the avatar to disk.
 * Returns the public relative URL: `/api/v1/uploads/avatars/<filename>`
 */
export async function saveAvatar(
  fileBuffer: Buffer,
  mimeType: string,
  userId: string
): Promise<{ url: string; error?: string }> {
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return { url: "", error: "Invalid image type. Please upload a JPG, PNG, or WEBP file." };
  }

  if (fileBuffer.byteLength > MAX_AVATAR_BYTES) {
    return { url: "", error: "File exceeds 2MB limit. Please upload a smaller image." };
  }

  try {
    const dir = getAvatarDir();
    await fs.promises.mkdir(dir, { recursive: true });

    // Resize and crop to 256x256 square WebP
    const processed = await sharp(fileBuffer)
      .resize(256, 256, { fit: "cover", position: "center" })
      .webp({ quality: 85 })
      .toBuffer();

    const hash = crypto.randomBytes(6).toString("hex");
    const filename = `${userId}-${Date.now()}-${hash}.webp`;
    const fullPath = path.join(dir, filename);

    await fs.promises.writeFile(fullPath, processed);
    logger.info({ userId, filename, sizeBytes: processed.length }, "Avatar saved successfully");

    return { url: `/api/v1/uploads/avatars/${filename}` };
  } catch (err: any) {
    logger.error({ err: err?.message, userId }, "Failed to process and save avatar");
    return { url: "", error: "Failed to process image. Please try a different photo." };
  }
}

/**
 * Safely reads an avatar image from disk preventing directory traversal.
 */
export async function getAvatarFile(
  filename: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeName = path.basename(filename);
  if (!safeName || safeName.includes("..") || !/^[a-zA-Z0-9_\-\.]+$/.test(safeName)) {
    return null;
  }

  const fullPath = path.join(getAvatarDir(), safeName);
  try {
    const buffer = await fs.promises.readFile(fullPath);
    return { buffer, contentType: "image/webp" };
  } catch {
    return null;
  }
}

/**
 * Removes an existing avatar image file when user replaces or deletes it.
 */
export async function removeAvatar(avatarUrl?: string | null): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith("/api/v1/uploads/avatars/")) return;
  const filename = path.basename(avatarUrl);
  const fullPath = path.join(getAvatarDir(), filename);
  try {
    await fs.promises.unlink(fullPath);
  } catch {
    // Ignore deletion errors
  }
}

