import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { db, categoriesTable, productImportItemsTable, productImportRunsTable, productImportSnapshotsTable, productsTable } from "@workspace/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const CATALOGUE_BRAND = "MZANSIDEALZ";

export const PERFECTDEALZ_ORIGIN = "https://perfectdealz.co.za";
const SHOPIFY_CDN_HOST = "cdn.shopify.com";
const USER_AGENT = "MzansiDealz Product Migration/1.0 (authorized owner migration)";
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const PRODUCT_UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads", "products");
const CSV_PATH = path.join(PUBLIC_DIR, "perfectdealz-products.csv");
const ROOT_CSV_PATH = path.resolve(process.cwd(), "perfectdealz-products.csv");
const finalizedRuns = new Set<number>();

export type ProductImportOptions = {
  sourceUrl: string;
  overwriteExisting: boolean;
  skipExisting: boolean;
  importImages: boolean;
};

export type CsvImportOptions = {
  sourceUrl?: string;
  overwriteExisting: boolean;
  skipExisting: boolean;
  importImages: boolean;
  filename: string;
};

type ShopifyImage = { src?: string; alt?: string; id?: number };
type ShopifyVariant = {
  id?: number;
  title?: string;
  sku?: string | null;
  price?: string;
  compare_at_price?: string | null;
  available?: boolean;
  inventory_quantity?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
};
type ShopifyProduct = {
  id?: number;
  title?: string;
  handle?: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[] | string;
  variants?: ShopifyVariant[];
  images?: ShopifyImage[];
  options?: Array<{ name?: string; values?: string[] }>;
};
type ProductSource = { sourceUrl: string; product?: ShopifyProduct };

export type NormalizedProduct = {
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number | null;
  originalPrice: number | null;
  salePrice: number | null;
  stock: string;
  image: string | null;
  galleryImages: string[];
  weight: string;
  dimensions: string;
  tags: string[];
  status: string;
  featured: boolean;
  specifications: string;
  features: string;
  variants: Array<Record<string, unknown>>;
  sourceUrl: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  searchKeywords: string[];
  imagePaths: string[];
  validation: string[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPrivateIp(hostname: string): boolean {
  if (!isIP(hostname)) return false;
  if (hostname.includes(":")) {
    const normalized = hostname.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  const octets = hostname.split(".").map(Number);
  const [first, second] = octets;
  return first === 10 || first === 127 || first === 0 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function assertPublicOrigin(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || isPrivateIp(url.hostname) || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
    throw new Error("Source must be a public HTTPS website without private or local network addressing.");
  }
  return url;
}

export function normalizeSourceOrigin(value: string): string {
  const url = assertPublicOrigin(value.trim());
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Source URL must contain only the public website origin, for example https://www.example.com.");
  }
  return url.origin;
}

function sourceHosts(sourceOrigin: string): Set<string> {
  const hostname = new URL(sourceOrigin).hostname.toLowerCase();
  return new Set([hostname, hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`]);
}

function assertSourceUrl(value: string, sourceOrigin: string): URL {
  const url = assertPublicOrigin(value);
  if (url.protocol !== "https:" || !sourceHosts(sourceOrigin).has(url.hostname.toLowerCase())) {
    throw new Error(`Source URL is outside the approved migration origin ${sourceOrigin}.`);
  }
  return url;
}

async function fetchText(url: string, sourceOrigin: string, attempt = 0, redirects = 0): Promise<string> {
  assertSourceUrl(url, sourceOrigin);
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json, application/xml, text/html;q=0.9" },
    signal: AbortSignal.timeout(30_000),
    redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location || redirects >= 5) throw new Error(`Too many redirects while fetching ${url}`);
    return fetchText(new URL(location, url).toString(), sourceOrigin, attempt, redirects + 1);
  }
  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    await sleep(Math.max(retryAfter * 1000, 750 * 2 ** attempt));
    return fetchText(url, sourceOrigin, attempt + 1, redirects);
  }
  if (!response.ok) {
    throw new Error(`Source returned HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function cleanHtml(value: string | null | undefined): string {
  return decodeEntities(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function safeSku(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "PD-UNKNOWN";
}

function parseMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function firstMatch(value: string, pattern: RegExp): string {
  return value.match(pattern)?.[1]?.trim() ?? "";
}

function extractListItems(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => cleanHtml(match[1]))
    .filter(Boolean);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

async function mapWithConcurrency<T>(values: T[], concurrency: number, worker: (value: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      await worker(values[index]);
    }
  });
  await Promise.all(runners);
}

function productJsonUrl(sourceUrl: string, sourceOrigin: string): string | null {
  const url = assertSourceUrl(sourceUrl, sourceOrigin);
  if (!url.pathname.startsWith("/products/")) return null;
  url.pathname = `${url.pathname.replace(/\/$/, "")}.json`;
  return url.toString();
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const block = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    return Array.isArray(parsed) ? (parsed.find((item) => item?.["@type"] === "Product") ?? null) : parsed;
  } catch {
    return null;
  }
}

async function fetchProduct(sourceUrl: string, sourceOrigin: string, knownProduct?: ShopifyProduct): Promise<ShopifyProduct> {
  if (knownProduct?.title) return knownProduct;
  try {
    const jsonUrl = productJsonUrl(sourceUrl, sourceOrigin);
    if (jsonUrl) {
      const payload = JSON.parse(await fetchText(jsonUrl, sourceOrigin)) as { product?: ShopifyProduct };
      if (payload.product?.title) return payload.product;
    }
  } catch (error) {
    logger.warn({ err: error, sourceUrl }, "Shopify product JSON unavailable; trying page metadata");
  }

  const html = await fetchText(sourceUrl, sourceOrigin);
  const jsonLd = extractJsonLd(html);
  if (!jsonLd) throw new Error("No structured product data was found.");
  const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers : [jsonLd.offers];
  const imageValues = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
  return {
    title: String(jsonLd.name ?? ""),
    body_html: String(jsonLd.description ?? ""),
    vendor: "",
    product_type: "",
    variants: offers.filter(Boolean).map((offer) => ({
      sku: typeof offer === "object" && offer ? String(offer.sku ?? "") : "",
      price: typeof offer === "object" && offer ? String(offer.price ?? "") : "",
      available: true,
    })),
    images: imageValues.filter((image): image is string => typeof image === "string").map((src) => ({ src })),
  };
}

function normalizeProduct(product: ShopifyProduct, sourceUrl: string): NormalizedProduct {
  const name = (product.title ?? "").trim();
  const html = product.body_html ?? "";
  const description = cleanHtml(html);
  const variants = product.variants ?? [];
  const pricedVariants = variants.map((variant) => ({
    ...variant,
    current: parseMoney(variant.price),
    compare: parseMoney(variant.compare_at_price),
  }));
  const currentPrices = pricedVariants.map((variant) => variant.current).filter((price): price is number => price !== null);
  const comparePrices = pricedVariants.map((variant) => variant.compare).filter((price): price is number => price !== null);
  const currentPrice = currentPrices.length ? Math.min(...currentPrices) : null;
  const compareAt = comparePrices.length ? Math.max(...comparePrices) : null;
  const price = currentPrice !== null && compareAt !== null && compareAt > currentPrice ? compareAt : currentPrice;
  const salePrice = currentPrice !== null && compareAt !== null && compareAt > currentPrice ? currentPrice : null;
  const sku = safeSku(variants.find((variant) => variant.sku?.trim())?.sku ?? `PD-${product.id ?? createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10)}`);
  const tags = Array.isArray(product.tags)
    ? product.tags.map(String).map((tag) => tag.trim()).filter(Boolean)
    : String(product.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
  const images = unique((product.images ?? []).map((image) => image.src ?? "").filter(Boolean));
  const available = variants.length === 0 || variants.some((variant) => variant.available !== false && (variant.inventory_quantity == null || variant.inventory_quantity > 0));
  const weight = variants.find((variant) => variant.weight)?.weight
    ? `${variants.find((variant) => variant.weight)?.weight} ${variants.find((variant) => variant.weight)?.weight_unit ?? ""}`.trim()
    : "";
  const features = extractListItems(html);
  const dimensions = firstMatch(description, /dimensions?\s*[:\-]\s*([^\n]+)/i);
  const specifications = unique([
    ...((product.options ?? []).flatMap((option) => option.values?.map((value) => `${option.name ?? "Option"}: ${value}`) ?? [])),
    weight ? `Weight: ${weight}` : "",
    dimensions ? `Dimensions: ${dimensions}` : "",
  ].filter(Boolean)).join("\n");
  const category = product.product_type?.trim() || tags[0] || "Uncategorised";
  const brand = product.vendor?.trim() === "Perfect Dealz" || !product.vendor?.trim()
    ? CATALOGUE_BRAND
    : product.vendor.trim();
  const keywords = unique([name, brand, category, ...tags].flatMap((value) => value.split(/[\s,]+/))).filter(Boolean);
  const metaTitle = `${name} | Mzansi Dealz`.slice(0, 60);
  const metaDescription = (description || `${name} from ${brand}.`).slice(0, 155);
  const validation = [
    !name ? "Missing product name" : "",
    price === null ? "Missing price" : "",
    images.length === 0 ? "Missing images" : "",
  ].filter(Boolean);

  return {
    sku,
    name,
    description,
    category,
    brand,
    price,
    originalPrice: price,
    salePrice,
    stock: available ? "in_stock" : "out_of_stock",
    image: images[0] ?? null,
    galleryImages: images,
    weight,
    dimensions,
    tags,
    status: "active",
    featured: false,
    specifications,
    features: features.join("\n"),
    variants: variants as Array<Record<string, unknown>>,
    sourceUrl,
    slug: slugify(name || sku),
    metaTitle,
    metaDescription,
    searchKeywords: keywords,
    imagePaths: [],
    validation,
  };
}

async function getShopifyCollectionProducts(sourceOrigin: string): Promise<ProductSource[]> {
  const products: ProductSource[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 100; page++) {
    const endpoint = `${sourceOrigin}/collections/all/products.json?limit=250&page=${page}`;
    const payload = JSON.parse(await fetchText(endpoint, sourceOrigin)) as { products?: ShopifyProduct[] };
    const batch = payload.products ?? [];
    if (!batch.length) break;
    for (const product of batch) {
      const handle = product.handle?.trim();
      if (!handle || seen.has(handle)) continue;
      seen.add(handle);
      products.push({ sourceUrl: `${sourceOrigin}/products/${encodeURIComponent(handle)}`, product });
    }
    if (batch.length < 250) break;
    await sleep(150);
  }
  return products;
}

async function getProductSources(sourceOrigin: string): Promise<ProductSource[]> {
  try {
    const products = await getShopifyCollectionProducts(sourceOrigin);
    if (products.length) return products;
  } catch (error) {
    logger.warn({ err: error, sourceOrigin }, "Shopify collection endpoint unavailable; falling back to sitemap");
  }
  return (await getProductSitemapUrls(sourceOrigin)).map((sourceUrl) => ({ sourceUrl }));
}

async function getProductSitemapUrls(sourceOrigin: string): Promise<string[]> {
  const root = await fetchText(`${sourceOrigin}/sitemap.xml`, sourceOrigin);
  const sitemapUrls = [...root.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => decodeEntities(match[1]).trim())
    .filter((url) => {
      try {
        const parsed = assertSourceUrl(url, sourceOrigin);
        return parsed.pathname.toLowerCase().includes("sitemap");
      } catch {
        return false;
      }
    });
  const urls: string[] = [];
  const sitemapQueue = [...sitemapUrls];
  const visitedSitemaps = new Set<string>();
  while (sitemapQueue.length) {
    const sitemapUrl = sitemapQueue.shift()!;
    if (visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);
    const xml = await fetchText(sitemapUrl, sourceOrigin);
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      const url = decodeEntities(match[1]).trim();
      try {
        const parsed = assertSourceUrl(url, sourceOrigin);
        if (parsed.pathname.toLowerCase().includes("sitemap")) {
          sitemapQueue.push(parsed.toString());
        } else if (parsed.pathname.startsWith("/products/") || parsed.pathname.startsWith("/product/")) {
          urls.push(parsed.toString());
        }
      } catch {
        // Ignore sitemap entries outside the approved origin.
      }
    }
  }
  return unique(urls);
}

async function writeRunCsv(runId: number): Promise<{ csvPath: string; rowCount: number; missingImages: number; missingPrices: number; failed: number }> {
  const items = await db.select().from(productImportItemsTable).where(eq(productImportItemsTable.runId, runId));
  const validItems = items.filter((item) => item.payload && item.status !== "failed");
  const normalized = validItems.map((item) => item.payload as unknown as NormalizedProduct);
  const csv = toCsv(normalized);
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(CSV_PATH, csv, "utf8");
  await writeFile(ROOT_CSV_PATH, csv, "utf8");
  return {
    csvPath: CSV_PATH,
    rowCount: normalized.length,
    missingImages: validItems.filter((item) => item.missingImage).length,
    missingPrices: validItems.filter((item) => item.missingPrice).length,
    failed: items.filter((item) => item.status === "failed").length,
  };
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function toCsv(products: NormalizedProduct[]): string {
  const columns = ["SKU", "Name", "Description", "Category", "Brand", "Price", "SalePrice", "Stock", "Image", "GalleryImages", "Weight", "Dimensions", "Tags", "Status", "Featured"];
  return [
    columns.map(csvEscape).join(","),
    ...products.map((product) => [
      product.sku,
      product.name,
      product.description,
      product.category,
      product.brand,
      product.price,
      product.salePrice,
      product.stock,
      product.image,
      product.galleryImages.join("|"),
      product.weight,
      product.dimensions,
      product.tags.join("|"),
      product.status,
      product.featured,
    ].map(csvEscape).join(",")),
  ].join("\n");
}

const CSV_COLUMNS = ["SKU", "Name", "Description", "Category", "Brand", "Price", "SalePrice", "Stock", "Image", "GalleryImages", "Weight", "Dimensions", "Tags", "Status", "Featured"] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (character === "\"" && next === "\"") {
        field += "\"";
        index++;
      } else if (character === "\"") {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value.trim()));
}

function parseBoolean(value: string): boolean {
  return ["true", "1", "yes", "y", "active", "featured"].includes(value.trim().toLowerCase());
}

function normalizeCsvStock(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["in_stock", "instock", "available", "true", "yes", "active"].includes(normalized)) return "in_stock";
  return "out_of_stock";
}

function normalizeCsvImage(value: string): string | null {
  const image = value.trim();
  return image || null;
}

function csvRowToProduct(row: Record<string, string>, sourceUrl: string): NormalizedProduct {
  const name = row.Name.trim();
  const sku = safeSku(row.SKU || `CSV-${createHash("sha1").update(`${name}|${sourceUrl}`).digest("hex").slice(0, 10)}`);
  const price = parseMoney(row.Price);
  const salePrice = parseMoney(row.SalePrice);
  const image = normalizeCsvImage(row.Image);
  const galleryImages = unique((row.GalleryImages || image || "").split("|").map((value) => value.trim()).filter(Boolean));
  const category = row.Category.trim() || "Uncategorised";
  const brand = row.Brand.trim() === "Perfect Dealz" || !row.Brand.trim()
    ? CATALOGUE_BRAND
    : row.Brand.trim();
  const description = cleanHtml(row.Description);
  const tags = row.Tags.split("|").map((tag) => tag.trim()).filter(Boolean);
  const slug = slugify(name || sku);
  const source = row.SourceUrl?.trim() || sourceUrl;
  return {
    sku,
    name,
    description,
    category,
    brand,
    price,
    originalPrice: price,
    salePrice: salePrice !== null && price !== null && salePrice < price ? salePrice : null,
    stock: normalizeCsvStock(row.Stock),
    image,
    galleryImages,
    weight: row.Weight.trim(),
    dimensions: row.Dimensions.trim(),
    tags,
    status: "active",
    featured: parseBoolean(row.Featured),
    specifications: "",
    features: "",
    variants: [],
    sourceUrl: source,
    slug,
    metaTitle: `${name} | Mzansi Dealz`.slice(0, 60),
    metaDescription: (description || `${name} from ${brand}.`).slice(0, 155),
    searchKeywords: unique([name, brand, category, ...tags].flatMap((value) => value.split(/[\s,]+/))).filter(Boolean),
    imagePaths: galleryImages.filter((value) => value.startsWith("/uploads/")),
    validation: [
      !name ? "Missing product name" : "",
      price === null ? "Missing price" : "",
      !image ? "Missing images" : "",
    ].filter(Boolean),
  };
}

function validateCsvHeader(header: string[]): void {
  const normalized = header.map((value) => value.trim());
  const missing = CSV_COLUMNS.filter((column) => !normalized.includes(column));
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}`);
}

export function validateProductCsv(text: string): { headers: string[]; rowCount: number } {
  const rows = parseCsv(text);
  const headers = rows[0]?.map((value) => value.trim()) ?? [];
  validateCsvHeader(headers);
  return { headers, rowCount: Math.max(0, rows.length - 1) };
}

export async function createCsvImportRun(text: string, options: CsvImportOptions) {
  const { headers } = validateProductCsv(text);
  await db.update(productImportRunsTable)
    .set({ status: "failed", error: "Superseded by a newer import run.", completedAt: new Date() })
    .where(sql`${productImportRunsTable.status} IN ('crawling', 'importing')`);
  const [run] = await db.insert(productImportRunsTable).values({
    sourceDomain: options.sourceUrl || `CSV upload: ${options.filename}`,
    overwriteExisting: options.overwriteExisting,
    skipExisting: options.skipExisting,
    importImages: options.importImages,
    status: "crawling",
  }).returning();
  void processCsvImportRun(run.id, text, headers, options.sourceUrl);
  return run;
}

async function processCsvImportRun(runId: number, text: string, headers: string[], sourceUrl?: string): Promise<void> {
  try {
    const rows = parseCsv(text).slice(1);
    const seen = new Set<string>();
    const products: NormalizedProduct[] = [];
    for (const values of rows) {
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>;
      const product = csvRowToProduct(row, sourceUrl || `csv://upload/${runId}`);
      if (!row.SourceUrl?.trim()) {
        product.sourceUrl = `csv://upload/${runId}/${product.sku}`;
      }
      const key = product.sku || product.name.toLowerCase();
      if (!product.name || seen.has(key)) continue;
      seen.add(key);
      products.push(product);
    }
    await db.update(productImportRunsTable).set({ totalDiscovered: products.length }).where(eq(productImportRunsTable.id, runId));
    for (let index = 0; index < products.length; index += 250) {
      const batch = products.slice(index, index + 250);
      await db.insert(productImportItemsTable).values(batch.map((product) => ({
        runId,
        sourceUrl: product.sourceUrl,
        sku: product.sku,
        name: product.name,
        payload: product,
        status: product.validation.length ? "warning" : "ready",
        missingImage: !product.image,
        missingPrice: product.price === null,
      })));
    }
    const report = await writeRunCsv(runId);
    await db.update(productImportRunsTable).set({
      status: "ready",
      productsFailed: report.failed,
      missingImages: report.missingImages,
      missingPrices: report.missingPrices,
      csvPath: report.csvPath,
      completedAt: new Date(),
    }).where(eq(productImportRunsTable.id, runId));
  } catch (error) {
    logger.error({ err: error, runId }, "CSV product import preparation failed");
    await db.update(productImportRunsTable).set({
      status: "failed",
      error: error instanceof Error ? error.message : "CSV import preparation failed",
      completedAt: new Date(),
    }).where(eq(productImportRunsTable.id, runId));
  }
}

async function downloadImage(url: string, sku: string, index: number, sourceOrigin: string): Promise<string> {
  const imageUrl = new URL(url);
  if (imageUrl.protocol !== "https:" || imageUrl.username || imageUrl.password || isPrivateIp(imageUrl.hostname) || imageUrl.hostname === "localhost" || imageUrl.hostname.endsWith(".local") || imageUrl.hostname.endsWith(".internal")) {
    throw new Error("Image host is outside the approved public HTTPS allowlist.");
  }
  const response = await fetch(imageUrl, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Image returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `${safeSku(sku)}${index ? `-${index + 1}` : ""}.${extension}`;
  await mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(PRODUCT_UPLOAD_DIR, filename), Buffer.from(await response.arrayBuffer()));
  return `/uploads/products/${filename}`;
}

async function downloadProductImages(product: NormalizedProduct, sourceOrigin: string): Promise<void> {
  const paths: string[] = [];
  for (let index = 0; index < product.galleryImages.length; index++) {
    try {
      paths.push(await downloadImage(product.galleryImages[index], product.sku, index, sourceOrigin));
    } catch (error) {
      logger.warn({ err: error, image: product.galleryImages[index], sku: product.sku }, "Product image download failed");
    }
  }
  product.imagePaths = paths;
  product.image = paths[0] ?? product.image;
  product.galleryImages = paths.length ? paths : product.galleryImages;
  if (!paths.length && !product.validation.includes("Missing images")) product.validation.push("Missing images");
}

async function recalculateCategoryCounts() {
  await db.update(categoriesTable).set({ productCount: 0 });
  await db.execute(sql`
    UPDATE categories
    SET product_count = counts.product_count
    FROM (
      SELECT category_id, COUNT(*)::int AS product_count
      FROM products
      GROUP BY category_id
    ) counts
    WHERE categories.id = counts.category_id
  `);
}

async function findExisting(product: NormalizedProduct) {
  const conditions = [eq(productsTable.name, product.name)];
  if (product.sku) conditions.push(eq(productsTable.sku, product.sku));
  const bySource = await db.select().from(productsTable).where(or(eq(productsTable.sourceUrl, product.sourceUrl), ...conditions)).limit(1);
  return bySource[0];
}

async function ensureCategory(name: string): Promise<number> {
  const slug = slugify(name) || "uncategorised";
  const existing = await db.select().from(categoriesTable).where(or(eq(categoriesTable.slug, slug), eq(categoriesTable.name, name))).limit(1);
  if (existing[0]) return existing[0].id;
  const [created] = await db.insert(categoriesTable).values({
    name,
    slug,
    icon: "Tag",
    description: `Imported from Perfect Dealz: ${name}`,
  }).returning();
  return created.id;
}

async function uniqueProductSlug(base: string, excludeId?: number): Promise<string> {
  const normalizedBase = base || "imported-product";
  let slug = normalizedBase;
  let suffix = 1;
  while (true) {
    const existing = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.slug, slug)).limit(1);
    if (!existing.length || (excludeId && existing[0].id === excludeId)) return slug;
    slug = `${normalizedBase}-${suffix++}`;
  }
}

export async function crawlImportRun(runId: number): Promise<void> {
  try {
    const [run] = await db.select().from(productImportRunsTable).where(eq(productImportRunsTable.id, runId)).limit(1);
    if (!run) return;
    const options: ProductImportOptions = {
      sourceUrl: run.sourceDomain,
      overwriteExisting: run.overwriteExisting,
      skipExisting: run.skipExisting,
      importImages: run.importImages,
    };
    const sources = await getProductSources(options.sourceUrl);
    await db.update(productImportRunsTable).set({ totalDiscovered: sources.length }).where(eq(productImportRunsTable.id, runId));
    const seen = new Set<string>();
    let missingImages = 0;
    let missingPrices = 0;
    let failures = 0;
    let skippedInactive = 0;
    await mapWithConcurrency(sources, 8, async (source) => {
      if (finalizedRuns.has(runId)) return;
      try {
        const product = normalizeProduct(await fetchProduct(source.sourceUrl, options.sourceUrl, source.product), source.sourceUrl);
        if (product.stock !== "in_stock") {
          skippedInactive++;
          return;
        }
        const key = product.sku || `${product.name.toLowerCase()}|${product.sourceUrl}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (options.importImages && product.galleryImages.length) await downloadProductImages(product, options.sourceUrl);
        if (!product.image) missingImages++;
        if (product.price === null) missingPrices++;
        await db.insert(productImportItemsTable).values({
          runId,
          sourceUrl: source.sourceUrl,
          sku: product.sku,
          name: product.name,
          payload: product,
          status: product.validation.length ? "warning" : "ready",
          missingImage: !product.image,
          missingPrice: product.price === null,
        });
      } catch (error) {
        failures++;
        await db.insert(productImportItemsTable).values({
          runId,
          sourceUrl: source.sourceUrl,
          payload: { sourceUrl: source.sourceUrl },
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown crawl error",
        });
      }
    });
    if (finalizedRuns.has(runId)) return;
    const report = await writeRunCsv(runId);
    await db.update(productImportRunsTable).set({
      status: "ready",
      productsFailed: report.failed || failures,
      missingImages: report.missingImages || missingImages,
      missingPrices: report.missingPrices || missingPrices,
      csvPath: report.csvPath,
      error: skippedInactive ? `Skipped ${skippedInactive.toLocaleString()} inactive products.` : null,
      completedAt: new Date(),
    }).where(eq(productImportRunsTable.id, runId));
  } catch (error) {
    logger.error({ err: error, runId }, "Product import crawl failed");
    await db.update(productImportRunsTable).set({
      status: "failed",
      error: error instanceof Error ? error.message : "Product crawl failed",
      completedAt: new Date(),
    }).where(eq(productImportRunsTable.id, runId));
  }
}

export async function finalizeCrawlRun(runId: number): Promise<{ rowCount: number; missingImages: number; missingPrices: number; failed: number }> {
  const [run] = await db.select().from(productImportRunsTable).where(eq(productImportRunsTable.id, runId)).limit(1);
  if (!run) throw new Error("Import run not found");
  if (run.status !== "crawling") throw new Error(`Only a crawling run can be finalized. Current status: ${run.status}`);
  finalizedRuns.add(runId);
  const report = await writeRunCsv(runId);
  await db.update(productImportRunsTable).set({
    status: "ready",
    productsFailed: report.failed,
    missingImages: report.missingImages,
    missingPrices: report.missingPrices,
    csvPath: report.csvPath,
    error: `Finalized the accepted products before the full source crawl completed.`,
    completedAt: new Date(),
  }).where(eq(productImportRunsTable.id, runId));
  return report;
}

export async function importRun(runId: number): Promise<void> {
  const [run] = await db.select().from(productImportRunsTable).where(eq(productImportRunsTable.id, runId)).limit(1);
  if (!run) return;
  await db.update(productImportRunsTable).set({ status: "importing", error: null }).where(eq(productImportRunsTable.id, runId));
  try {
    const items = await db.select().from(productImportItemsTable).where(and(eq(productImportItemsTable.runId, runId), sql`${productImportItemsTable.status} <> 'failed'`));
    let imported = 0;
    let failed = 0;
    for (const item of items) {
      const product = item.payload as unknown as NormalizedProduct;
      try {
        if (product.price === null) throw new Error("Cannot import a product without a price.");
        const existing = await findExisting(product);
        if (existing && run.skipExisting && !run.overwriteExisting) {
          await db.update(productImportItemsTable).set({ status: "skipped" }).where(eq(productImportItemsTable.id, item.id));
          continue;
        }
        const categoryId = await ensureCategory(product.category);
        const price = product.salePrice ?? product.price;
        const originalPrice = product.originalPrice ?? product.price;
        const slug = existing ? existing.slug : await uniqueProductSlug(product.slug);
        const values = {
          name: product.name,
          slug,
          description: product.description || null,
          price: price.toFixed(2),
          originalPrice: originalPrice.toFixed(2),
          discountPercent: product.salePrice ? Math.round(((product.price - product.salePrice) / product.price) * 100) : 0,
          categoryId,
          imageUrl: product.image ?? "https://placehold.co/800x800/f3f4f6/9ca3af?text=No+Image",
          inStock: product.stock === "in_stock",
          stockCount: null,
          isFeatured: product.featured,
          isNewArrival: true,
          onSale: Boolean(product.salePrice),
          tags: product.tags.join(", "),
          sku: product.sku,
          brand: product.brand,
          specifications: product.specifications || null,
          features: product.features || null,
          galleryImages: JSON.stringify(product.galleryImages),
          stockStatus: product.stock,
          weight: product.weight || null,
          dimensions: product.dimensions || null,
          variants: JSON.stringify(product.variants),
          sourceUrl: product.sourceUrl,
          metaTitle: product.metaTitle,
          metaDescription: product.metaDescription,
          searchKeywords: product.searchKeywords.join(", "),
          status: product.status,
          importRunId: runId,
        };
        if (existing && run.overwriteExisting) {
          await db.insert(productImportSnapshotsTable).values({ runId, productId: existing.id, action: "updated", previousData: existing });
          await db.update(productsTable).set(values).where(eq(productsTable.id, existing.id));
        } else {
          const [created] = await db.insert(productsTable).values(values).returning({ id: productsTable.id });
          await db.insert(productImportSnapshotsTable).values({ runId, productId: created.id, action: "inserted", previousData: null });
        }
        await db.update(productImportItemsTable).set({ status: "imported" }).where(eq(productImportItemsTable.id, item.id));
        imported++;
      } catch (error) {
        failed++;
        await db.update(productImportItemsTable).set({ status: "failed", error: error instanceof Error ? error.message : "Import failed" }).where(eq(productImportItemsTable.id, item.id));
      }
    }
    await recalculateCategoryCounts();
    await db.update(productImportRunsTable).set({ status: "completed", productsImported: imported, productsFailed: failed, completedAt: new Date() }).where(eq(productImportRunsTable.id, runId));
  } catch (error) {
    logger.error({ err: error, runId }, "Product import failed");
    await db.update(productImportRunsTable).set({ status: "failed", error: error instanceof Error ? error.message : "Product import failed", completedAt: new Date() }).where(eq(productImportRunsTable.id, runId));
  }
}

export async function rollbackRun(runId: number): Promise<{ rolledBack: number; removedImages: number }> {
  const snapshots = await db.select().from(productImportSnapshotsTable).where(eq(productImportSnapshotsTable.runId, runId));
  const insertedProductIds = new Set(
    snapshots.filter((snapshot) => snapshot.action === "inserted").map((snapshot) => snapshot.productId),
  );
  const items = await db.select().from(productImportItemsTable).where(eq(productImportItemsTable.runId, runId));
  let removedImages = 0;
  for (const item of items) {
    const payload = item.payload as Partial<NormalizedProduct>;
    const [importedProduct] = payload.sourceUrl
      ? await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.sourceUrl, payload.sourceUrl))
        .limit(1)
      : [];
    const snapshot = importedProduct
      ? snapshots.find((candidate) => candidate.productId === importedProduct.id)
      : undefined;
    const shouldRemoveImages = snapshot ? insertedProductIds.has(snapshot.productId) : false;
    if (!shouldRemoveImages) continue;
    for (const imagePath of payload.imagePaths ?? []) {
      try {
        await unlink(path.join(PUBLIC_DIR, imagePath.replace(/^\/+/, "")));
        removedImages++;
      } catch {
        // A missing local image does not prevent database rollback.
      }
    }
  }
  for (const snapshot of snapshots) {
    if (snapshot.action === "inserted") {
      await db.delete(productsTable).where(eq(productsTable.id, snapshot.productId));
    } else if (snapshot.previousData) {
      const previous = snapshot.previousData as Record<string, unknown>;
      const { id: _id, createdAt: _createdAt, ...restore } = previous;
      await db.update(productsTable).set(restore as Partial<typeof productsTable.$inferInsert>).where(eq(productsTable.id, snapshot.productId));
    }
  }
  await recalculateCategoryCounts();
  await db.update(productImportRunsTable).set({ status: "rolled_back", completedAt: new Date() }).where(eq(productImportRunsTable.id, runId));
  return { rolledBack: snapshots.length, removedImages };
}

export async function getLatestImportRun() {
  return db.select().from(productImportRunsTable).orderBy(desc(productImportRunsTable.createdAt)).limit(1);
}