import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, categoriesTable, productImportItemsTable, productImportRunsTable, productImportSnapshotsTable, productsTable } from "@workspace/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export const PERFECTDEALZ_ORIGIN = "https://perfectdealz.co.za";
const PERFECTDEALZ_HOST = "perfectdealz.co.za";
const SHOPIFY_CDN_HOST = "cdn.shopify.com";
const USER_AGENT = "MzansiDealz Product Migration/1.0 (authorized owner migration)";
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const PRODUCT_UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads", "products");
const CSV_PATH = path.join(PUBLIC_DIR, "perfectdealz-products.csv");

export type ProductImportOptions = {
  overwriteExisting: boolean;
  skipExisting: boolean;
  importImages: boolean;
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

function assertAllowedUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== PERFECTDEALZ_HOST) {
    throw new Error("Product migration is restricted to https://perfectdealz.co.za.");
  }
  return url;
}

async function fetchText(url: string, attempt = 0): Promise<string> {
  assertAllowedUrl(url);
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json, application/xml, text/html;q=0.9" },
    signal: AbortSignal.timeout(30_000),
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    await sleep(Math.max(retryAfter * 1000, 750 * 2 ** attempt));
    return fetchText(url, attempt + 1);
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

function productJsonUrl(sourceUrl: string): string {
  const url = assertAllowedUrl(sourceUrl);
  if (!url.pathname.startsWith("/products/")) throw new Error("Only Shopify product pages may be migrated.");
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

async function fetchProduct(sourceUrl: string): Promise<ShopifyProduct> {
  try {
    const payload = JSON.parse(await fetchText(productJsonUrl(sourceUrl))) as { product?: ShopifyProduct };
    if (payload.product?.title) return payload.product;
  } catch (error) {
    logger.warn({ err: error, sourceUrl }, "Shopify product JSON unavailable; trying page metadata");
  }

  const html = await fetchText(sourceUrl);
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
  const brand = product.vendor?.trim() || "Perfect Dealz";
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

async function getProductSitemapUrls(): Promise<string[]> {
  const root = await fetchText(`${PERFECTDEALZ_ORIGIN}/sitemap.xml`);
  const sitemapUrls = [...root.matchAll(/<loc>([^<]*sitemap_products[^<]*)<\/loc>/gi)]
    .map((match) => decodeEntities(match[1]))
    .filter((url) => {
      try {
        assertAllowedUrl(url);
        return true;
      } catch {
        return false;
      }
    });
  const urls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    const xml = await fetchText(sitemapUrl);
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      const url = decodeEntities(match[1]);
      try {
        const parsed = assertAllowedUrl(url);
        if (parsed.pathname.startsWith("/products/")) urls.push(parsed.toString());
      } catch {
        // Ignore sitemap entries outside the approved origin.
      }
    }
  }
  return unique(urls);
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

async function downloadImage(url: string, sku: string, index: number): Promise<string> {
  const imageUrl = new URL(url);
  if (imageUrl.protocol !== "https:" || ![PERFECTDEALZ_HOST, SHOPIFY_CDN_HOST].includes(imageUrl.hostname)) {
    throw new Error("Image host is outside the approved PerfectDealz/Shopify CDN allowlist.");
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

async function downloadProductImages(product: NormalizedProduct): Promise<void> {
  const paths: string[] = [];
  for (let index = 0; index < product.galleryImages.length; index++) {
    try {
      paths.push(await downloadImage(product.galleryImages[index], product.sku, index));
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
      overwriteExisting: run.overwriteExisting,
      skipExisting: run.skipExisting,
      importImages: run.importImages,
    };
    const sourceUrls = await getProductSitemapUrls();
    await db.update(productImportRunsTable).set({ totalDiscovered: sourceUrls.length }).where(eq(productImportRunsTable.id, runId));
    const seen = new Set<string>();
    let missingImages = 0;
    let missingPrices = 0;
    let failures = 0;
    for (const sourceUrl of sourceUrls) {
      try {
        const product = normalizeProduct(await fetchProduct(sourceUrl), sourceUrl);
        const key = product.sku || `${product.name.toLowerCase()}|${product.sourceUrl}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (options.importImages && product.galleryImages.length) await downloadProductImages(product);
        if (!product.image) missingImages++;
        if (product.price === null) missingPrices++;
        await db.insert(productImportItemsTable).values({
          runId,
          sourceUrl,
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
          sourceUrl,
          payload: { sourceUrl },
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown crawl error",
        });
      }
    }
    const items = await db.select().from(productImportItemsTable).where(eq(productImportItemsTable.runId, runId));
    const normalized = items.flatMap((item) => item.payload && item.status !== "failed" ? [item.payload as unknown as NormalizedProduct] : []);
    await mkdir(PUBLIC_DIR, { recursive: true });
    await writeFile(CSV_PATH, toCsv(normalized), "utf8");
    await db.update(productImportRunsTable).set({
      status: "ready",
      productsFailed: failures,
      missingImages,
      missingPrices,
      csvPath: CSV_PATH,
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