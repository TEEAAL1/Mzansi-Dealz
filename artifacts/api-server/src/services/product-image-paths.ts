const LEGACY_UPLOAD_FILENAME = /^\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpe?g|webp)$/i;

function normalizeSku(sku: string | null | undefined) {
  return (sku ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export function normalizeProductImageUrl(
  value: string,
  sku: string | null | undefined,
  galleryIndex = 0,
) {
  let normalized = value;
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      normalized = `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Relative image paths are already suitable for the public app.
  }

  const match = normalized.match(LEGACY_UPLOAD_FILENAME);
  const safeSku = normalizeSku(sku);
  if (match && safeSku) {
    const suffix = galleryIndex > 0 ? `-${galleryIndex + 1}` : "";
    return `/uploads/products/${safeSku}${suffix}.jpg`;
  }

  return normalized;
}