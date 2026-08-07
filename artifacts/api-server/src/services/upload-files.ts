import path from "node:path";
import { unlink } from "node:fs/promises";
import { deletePublicObject } from "../lib/public-object-storage";

function ownedUploadPath(fileUrl: string) {
  try {
    const pathname = new URL(fileUrl, "http://localhost").pathname;
    if (!pathname.startsWith("/uploads/") || pathname.startsWith("/uploads/products/")) return null;
    return path.join("uploads", path.basename(pathname));
  } catch {
    return null;
  }
}

export async function removeUploadedFileIfOwned(fileUrl: string) {
  try {
    const pathname = new URL(fileUrl, "http://localhost").pathname;
    if (pathname.startsWith("/uploads/products/admin-")) {
      await deletePublicObject(pathname.slice(1));
      return;
    }
  } catch {
    // Fall through to local-file cleanup for legacy URLs.
  }
  const filePath = ownedUploadPath(fileUrl);
  if (filePath) await unlink(filePath).catch(() => undefined);
}

export function parseGalleryImages(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((image): image is string => typeof image === "string" && image.length > 0) : [];
  } catch {
    return value.split(",").map((image) => image.trim()).filter(Boolean);
  }
}