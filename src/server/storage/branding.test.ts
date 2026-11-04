import { describe, it, expect, beforeEach } from "vitest";
import {
  detectRealMimeType,
  sanitizeAndValidateSvg,
  saveBrandingImage,
  getBrandingFile,
  removeBrandingFile,
} from "@/server/storage/branding";
import sharp from "sharp";

describe("Branding Storage & Asset Validation (src/server/storage/branding.ts)", () => {
  it("detects real image MIME types by inspecting buffer bytes", async () => {
    // 1. Create a 10x10 PNG buffer using sharp
    const pngBuffer = await sharp({
      create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const pngDetected = detectRealMimeType(pngBuffer);
    expect(pngDetected?.mime).toBe("image/png");
    expect(pngDetected?.ext).toBe("png");

    // 2. SVG string
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>');
    const svgDetected = detectRealMimeType(svgBuffer);
    expect(svgDetected?.mime).toBe("image/svg+xml");
    expect(svgDetected?.ext).toBe("svg");

    // 3. Fake / Non-image buffer
    const fakeBuffer = Buffer.from("this is plain text not an image");
    const fakeDetected = detectRealMimeType(fakeBuffer);
    expect(fakeDetected).toBeNull();
  });

  describe("SVG Security Sanitization (sanitizeAndValidateSvg)", () => {
    it("accepts clean and valid SVGs", () => {
      const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M10 10 H 90 V 90 H 10 Z" fill="#6366f1" />
      </svg>`;
      const res = sanitizeAndValidateSvg(cleanSvg);
      expect(res.safe).toBe(true);
    });

    it("rejects SVGs containing <script> tags", () => {
      const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert(document.cookie);</script>
        <circle cx="50" cy="50" r="40"/>
      </svg>`;
      const res = sanitizeAndValidateSvg(maliciousSvg);
      expect(res.safe).toBe(false);
      expect(res.error).toContain("<script>");
    });

    it("rejects SVGs containing inline event handlers (onload, onerror)", () => {
      const eventHandlerSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
        <rect width="100" height="100"/>
      </svg>`;
      const res = sanitizeAndValidateSvg(eventHandlerSvg);
      expect(res.safe).toBe(false);
      expect(res.error).toContain("on*");
    });

    it("rejects SVGs containing javascript: URI protocols", () => {
      const jsUriSvg = `<svg xmlns="http://www.w3.org/2000/svg">
        <a href="javascript:alert(1)"><text y="20">Click</text></a>
      </svg>`;
      const res = sanitizeAndValidateSvg(jsUriSvg);
      expect(res.safe).toBe(false);
      expect(res.error).toContain("javascript:");
    });

    it("rejects SVGs containing foreignObject / iframes", () => {
      const foreignSvg = `<svg xmlns="http://www.w3.org/2000/svg">
        <foreignObject width="100" height="100">
          <iframe src="https://evil.com"></iframe>
        </foreignObject>
      </svg>`;
      const res = sanitizeAndValidateSvg(foreignSvg);
      expect(res.safe).toBe(false);
      expect(res.error).toContain("embedded objects");
    });
  });

  describe("saveBrandingImage & getBrandingFile", () => {
    it("rejects files exceeding size limits", async () => {
      // 600KB buffer for favicon (limit is 512KB)
      const bigBuffer = Buffer.alloc(600 * 1024, 0x89);
      const res = await saveBrandingImage(bigBuffer, "favicon");
      expect(res.error).toContain("exceeds maximum allowed size");
    });

    it("processes, optimizes, and saves clean logo image", async () => {
      const logoBuffer = await sharp({
        create: { width: 200, height: 200, channels: 4, background: { r: 99, g: 102, b: 241, alpha: 1 } },
      })
        .png()
        .toBuffer();

      const res = await saveBrandingImage(logoBuffer, "logo_light");
      expect(res.error).toBeUndefined();
      expect(res.url).toContain("/api/v1/uploads/branding/branding-logo_light-");
      expect(res.url).toContain("?v=");

      // Extract filename
      const filename = res.url.split("?")[0].replace("/api/v1/uploads/branding/", "");
      const fileData = await getBrandingFile(filename);
      expect(fileData).not.toBeNull();
      expect(fileData?.contentType).toBe("image/webp");

      // Cleanup
      await removeBrandingFile(res.url);
      const deletedCheck = await getBrandingFile(filename);
      expect(deletedCheck).toBeNull();
    });

    it("prevents directory traversal attacks in getBrandingFile", async () => {
      const traversalAttempt1 = await getBrandingFile("../../../etc/passwd");
      expect(traversalAttempt1).toBeNull();

      const traversalAttempt2 = await getBrandingFile("..\\..\\secret.key");
      expect(traversalAttempt2).toBeNull();
    });
  });
});
