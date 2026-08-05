const CATALOGUE_BRAND = "MZANSIDEALZ";
const CUSTOMER_FACING_BRAND = "MzansiDealz";
const LEGACY_CATALOGUE_BRAND_KEY = ["perfect", "dealz"].join("");
const LEGACY_BRAND_PATTERN = /\bperfect\s*[-–—]?\s*dealz\b/gi;

export function normalizeCatalogueBrand(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  const normalizedKey = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  return !trimmed || normalizedKey === LEGACY_CATALOGUE_BRAND_KEY ? CATALOGUE_BRAND : trimmed;
}

export function sanitizeCatalogueText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return value ?? null;
  return value.replace(LEGACY_BRAND_PATTERN, CUSTOMER_FACING_BRAND);
}