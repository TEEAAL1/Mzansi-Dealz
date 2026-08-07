import { Router } from "express";
import {
  db,
  productsTable,
  ordersTable,
  orderItemsTable,
  categoriesTable,
  paymentsTable,
  paymentTransactionsTable,
  refundsTable,
  topSellerSettingsTable,
} from "@workspace/db";
import { eq, desc, sql, count, sum } from "drizzle-orm";
import { z } from "zod";
import {
  createAdminSession,
  destroyAdminSession,
  hasAdminSession,
  requireAdmin,
  verifyAdminPassword,
} from "../middlewares/admin-auth";
import {
  createRefund,
  getPaymentSettings,
  listPayments,
  savePaymentSettings,
} from "../services/paymentService";
import { isYocoWebhookConfigured, refundYocoCheckout } from "../services/yocoService";
import { normalizeCatalogueBrand, sanitizeCatalogueText } from "../services/catalogueBrand";
import {
  getOrCreateTopSellerSettings,
  normalizeTopSellerSettings,
  resolveTopSellerPreviews,
  resolveTopSellerRows,
  validateCuratedProductIds,
  type TopSellerLimit,
  type TopSellerMode,
} from "../services/topSellerService";
import { removeUploadedFileIfOwned, parseGalleryImages } from "../services/upload-files";
import { normalizeProductImageUrl } from "../services/product-image-paths";

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: "Electronics", slug: "electronics", icon: "Cpu", description: "Gadgets, tech, audio & accessories" },
  { name: "Home & Living", slug: "home-living", icon: "Home", description: "Furniture, kitchen, appliances & decor" },
  { name: "Beauty & Health", slug: "beauty-health", icon: "Sparkles", description: "Skincare, haircare, wellness & fitness" },
  { name: "Fashion", slug: "fashion", icon: "Shirt", description: "Clothing, shoes, bags & accessories" },
  { name: "Outdoor & Lifestyle", slug: "outdoor-lifestyle", icon: "Sun", description: "Camping, sports, gardening & leisure" },
  { name: "Wellness", slug: "wellness", icon: "Heart", description: "Health, supplements, self-care" },
  { name: "Baby & Kids", slug: "baby-kids", icon: "Baby", description: "Toys, baby gear, kids clothing & essentials" },
  { name: "Furniture", slug: "furniture", icon: "Sofa", description: "Beds, sofas, tables, storage & more" },
  { name: "Gifts & Accessories", slug: "gifts-accessories", icon: "Gift", description: "Gift ideas, jewellery, watches & accessories" },
];

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function loginIsRateLimited(ip: string) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LOGIN_MAX_ATTEMPTS;
}

// POST /admin/login
router.post("/admin/login", async (req, res) => {
  if (loginIsRateLimited(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many login attempts. Try again later." });
    return;
  }
  const { password } = req.body as { password?: string };
  if (!password || !(await verifyAdminPassword(password))) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  const csrfToken = createAdminSession(res);
  res.json({ authenticated: true, csrfToken });
});

router.get("/admin/session", (req, res) => {
  // This response carries the current CSRF token. Never let a browser,
  // proxy, or CDN reuse an older token during a mutation retry.
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.json({
    authenticated: hasAdminSession(req),
    csrfToken: hasAdminSession(req) ? req.cookies?.mzansi_admin_csrf : undefined,
  });
});

router.post("/admin/logout", requireAdmin, (req, res) => {
  destroyAdminSession(req, res);
  res.json({ authenticated: false });
});

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
  const [ordersToday] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(sql`${ordersTable.createdAt} >= ${today}`);
  const [totalRevenue] = await db
    .select({ sum: sum(ordersTable.total) })
    .from(ordersTable)
    .where(eq(ordersTable.status, "paid"));
  const [revenueToday] = await db
    .select({ sum: sum(ordersTable.total) })
    .from(ordersTable)
    .where(sql`${ordersTable.createdAt} >= ${today} AND ${ordersTable.status} = 'paid'`);
  const [totalProducts] = await db.select({ count: count() }).from(productsTable);
  const [pendingOrders] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));

  res.json({
    totalOrders: totalOrders?.count ?? 0,
    ordersToday: ordersToday?.count ?? 0,
    totalRevenue: Number(totalRevenue?.sum ?? 0),
    revenueToday: Number(revenueToday?.sum ?? 0),
    totalProducts: totalProducts?.count ?? 0,
    pendingOrders: pendingOrders?.count ?? 0,
  });
});

// GET /admin/orders
router.get("/admin/orders", requireAdmin, async (req, res) => {
  const status = req.query.status as string | undefined;
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);

  const whereClause = status ? eq(ordersTable.status, status) : undefined;

  const [orders, totalRows] = await Promise.all([
    db
      .select()
      .from(ordersTable)
      .where(whereClause)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(ordersTable).where(whereClause),
  ]);

  const orderIds = orders.map((o) => o.id);
  const itemCounts =
    orderIds.length > 0
      ? await db
          .select({ orderId: orderItemsTable.orderId, count: count() })
          .from(orderItemsTable)
          .where(sql`${orderItemsTable.orderId} = ANY(${sql.raw(`ARRAY[${orderIds.join(",")}]`)})`)
          .groupBy(orderItemsTable.orderId)
      : [];

  const itemCountMap = new Map(itemCounts.map((ic) => [ic.orderId, ic.count]));

  res.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      total: Number(o.total),
      status: o.status,
      itemCount: itemCountMap.get(o.id) ?? 0,
      createdAt: o.createdAt.toISOString(),
    })),
    total: totalRows[0]?.count ?? 0,
  });
});

// PUT /admin/orders/:orderNumber/status
router.put("/admin/orders/:orderNumber/status", requireAdmin, async (req, res) => {
  const { orderNumber } = req.params;
  const { status } = req.body as { status?: string };

  const validStatuses = [
    "pending",
    "awaiting_payment",
    "paid",
    "processing",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "failed",
  ];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  const updated = await db
    .update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.orderNumber, orderNumber as string))
    .returning();

  if (!updated.length) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json({ success: true, status });
});

// DELETE /admin/orders/:orderNumber
router.delete("/admin/orders/:orderNumber", requireAdmin, async (req, res) => {
  const orderNumber = String(req.params.orderNumber);
  const [order] = await db
    .select({ id: ordersTable.id, status: ordersTable.status })
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const deletableStatuses = new Set(["pending", "awaiting_payment", "cancelled", "failed", "refunded"]);
  if (!deletableStatuses.has(order.status)) {
    res.status(409).json({
      error: "Only pending, awaiting payment, cancelled, failed, or refunded orders can be deleted.",
    });
    return;
  }

  await db.transaction(async (tx) => {
    const payments = await tx
      .select({ id: paymentsTable.id })
      .from(paymentsTable)
      .where(eq(paymentsTable.orderId, order.id));
    const paymentIds = payments.map((payment) => payment.id);

    if (paymentIds.length > 0) {
      await tx.delete(paymentTransactionsTable).where(
        sql`${paymentTransactionsTable.paymentId} = ANY(${sql.raw(`ARRAY[${paymentIds.join(",")}]`)})`,
      );
      await tx.delete(refundsTable).where(
        sql`${refundsTable.paymentId} = ANY(${sql.raw(`ARRAY[${paymentIds.join(",")}]`)})`,
      );
      await tx.delete(paymentsTable).where(eq(paymentsTable.orderId, order.id));
    }

    await tx.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    await tx.delete(ordersTable).where(eq(ordersTable.id, order.id));
  });

  res.status(204).send();
});

router.get("/admin/payment-settings", requireAdmin, async (_req, res) => {
  const settings = await getPaymentSettings();
  res.json({
    ...settings,
    yocoConfigured: Boolean(process.env.YOCO_SECRET_KEY),
    yocoWebhookConfigured: isYocoWebhookConfigured(),
    payfastConfigured: Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY),
    emailConfigured: Boolean(process.env.EMAIL_PROVIDER),
  });
});

function toAdminTopSellerResponse(
  settings: Awaited<ReturnType<typeof getOrCreateTopSellerSettings>>,
  rows: Awaited<ReturnType<typeof resolveTopSellerRows>>,
  previews: Awaited<ReturnType<typeof resolveTopSellerPreviews>>,
) {
  return {
    mode: settings.mode,
    displayLimit: settings.displayLimit,
    curatedProductIds: settings.curatedProductIds,
    products: rows.map((r) => toProductResponse(r.product, r.category?.name ?? "")),
    automaticProducts: previews.automaticRows.map((r) => toProductResponse(r.product, r.category?.name ?? "")),
    curatedProducts: previews.curatedRows.map((r) => toProductResponse(r.product, r.category?.name ?? "")),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

router.get("/admin/top-sellers", requireAdmin, async (_req, res) => {
  const settings = await getOrCreateTopSellerSettings();
  const config = normalizeTopSellerSettings(settings);
  const [rows, previews] = await Promise.all([
    resolveTopSellerRows(config),
    resolveTopSellerPreviews(config),
  ]);
  res.json(toAdminTopSellerResponse(settings, rows, previews));
});

router.put("/admin/top-sellers", requireAdmin, async (req, res) => {
  const parsed = z.object({
    mode: z.enum(["automatic", "curated"]),
    displayLimit: z.union([z.literal(5), z.literal(10)]),
    curatedProductIds: z.array(z.number().int().positive()).max(10),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose automatic or curated mode and a 5 or 10 product limit." });
    return;
  }

  const { mode, displayLimit, curatedProductIds } = parsed.data as {
    mode: TopSellerMode;
    displayLimit: TopSellerLimit;
    curatedProductIds: number[];
  };
  if (mode === "curated") {
    const validation = await validateCuratedProductIds(curatedProductIds, displayLimit);
    if ("error" in validation) {
      res.status(400).json({ error: validation.error });
      return;
    }
  }

  const current = await getOrCreateTopSellerSettings();
  const [updated] = await db
    .update(topSellerSettingsTable)
    .set({
      mode,
      displayLimit,
      curatedProductIds,
      updatedAt: new Date(),
    })
    .where(eq(topSellerSettingsTable.id, current.id))
    .returning();
  const config = normalizeTopSellerSettings(updated);
  const [rows, previews] = await Promise.all([
    resolveTopSellerRows(config),
    resolveTopSellerPreviews(config),
  ]);
  res.json(toAdminTopSellerResponse(updated, rows, previews));
});

router.put("/admin/payment-settings", requireAdmin, async (req, res) => {
  const parsed = z.object({
    currency: z.literal("ZAR"),
    defaultGateway: z.enum(["yoco", "payfast"]),
    yocoEnabled: z.boolean(),
    payfastEnabled: z.boolean(),
    payfastSandbox: z.boolean(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payment settings", details: parsed.error.issues });
    return;
  }
  if (parsed.data.defaultGateway === "yoco" && !process.env.YOCO_SECRET_KEY) {
    res.status(400).json({ error: "Yoco cannot be selected until YOCO_SECRET_KEY is configured." });
    return;
  }
  if (parsed.data.defaultGateway === "payfast" && !process.env.PAYFAST_MERCHANT_ID) {
    res.status(400).json({ error: "PayFast cannot be selected until its merchant credentials are configured." });
    return;
  }
  res.json(await savePaymentSettings(parsed.data));
});

router.get("/admin/payments", requireAdmin, async (_req, res) => {
  res.json({ payments: await listPayments() });
});

router.get("/admin/transactions", requireAdmin, async (_req, res) => {
  res.json({
    transactions: await db.select().from(paymentTransactionsTable)
      .orderBy(desc(paymentTransactionsTable.createdAt)).limit(200),
  });
});

router.get("/admin/payments/export.csv", requireAdmin, async (_req, res) => {
  const payments = await listPayments();
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
  const lines = [
    ["id", "reference", "gateway", "status", "providerPaymentId", "amount", "currency", "customerEmail", "createdAt"].map(escape).join(","),
    ...payments.map((payment) => [
      payment.id,
      payment.reference,
      payment.gateway,
      payment.status,
      payment.providerPaymentId,
      payment.amount,
      payment.currency,
      payment.customerEmail,
      payment.createdAt.toISOString(),
    ].map(escape).join(",")),
  ];
  res.type("text/csv").setHeader("Content-Disposition", "attachment; filename=\"mzansi-payments.csv\"").send(lines.join("\n"));
});

router.post("/admin/payments/:id/refund", requireAdmin, async (req, res) => {
  const amountSchema = z.object({ amount: z.number().positive().optional() }).safeParse(req.body ?? {});
  if (!amountSchema.success) {
    res.status(400).json({ error: "Refund amount must be a positive number" });
    return;
  }
  const paymentId = Number(req.params.id);
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId)).limit(1);
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if (payment.status !== "paid") {
    res.status(400).json({ error: "Only paid payments can be refunded" });
    return;
  }
  const amount = amountSchema.data.amount ?? Number(payment.amount);
  if (amount > Number(payment.amount)) {
    res.status(400).json({ error: "Refund cannot exceed the payment amount" });
    return;
  }
  if (payment.gateway !== "yoco") {
    res.status(409).json({ error: "PayFast refunds must be completed in the PayFast merchant dashboard." });
    return;
  }
  if (!payment.providerCheckoutId) {
    res.status(400).json({ error: "This payment has no provider checkout reference." });
    return;
  }
  try {
    const result = await refundYocoCheckout(payment.providerCheckoutId, Math.round(amount * 100));
    const refund = await createRefund(payment.id, amount, payment.gateway, result.refundId, result.status === "succeeded" ? "succeeded" : "pending");
    res.json({ refund, provider: result });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Refund failed" });
  }
});

const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  originalPrice: z.number().positive(),
  categoryId: z.number().int().positive(),
  imageUrl: z.string().refine((value) => /^https?:\/\//i.test(value) || /^\/uploads\//.test(value), "Image URL must be an absolute URL or an uploads path."),
  galleryImages: z.array(z.string().refine((value) => /^https?:\/\//i.test(value) || /^\/uploads\//.test(value), "Gallery image must be an absolute URL or an uploads path.")).max(12).optional(),
  inStock: z.boolean().optional().default(true),
  stockCount: z.number().int().optional(),
  isFeatured: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  onSale: z.boolean().optional().default(false),
  tags: z.string().optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base;
  let suffix = 0;
  while (true) {
    const existing = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);
    if (!existing.length || (excludeId && existing[0].id === excludeId)) break;
    suffix++;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

function toProductResponse(p: typeof productsTable.$inferSelect, categoryName: string) {
  return {
    id: p.id,
    name: sanitizeCatalogueText(p.name) ?? "",
    slug: p.slug,
    description: sanitizeCatalogueText(p.description),
    price: Number(p.price),
    originalPrice: Number(p.originalPrice),
    discountPercent: p.discountPercent,
    categoryId: p.categoryId,
    categoryName,
    imageUrl: normalizeProductImageUrl(p.imageUrl, p.sku),
    inStock: p.inStock,
    stockCount: p.stockCount,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    onSale: p.onSale,
    tags: sanitizeCatalogueText(p.tags),
    brand: normalizeCatalogueBrand(p.brand),
    specifications: sanitizeCatalogueText(p.specifications),
    features: sanitizeCatalogueText(p.features),
    galleryImages: p.galleryImages
      ? JSON.stringify(parseGalleryImages(p.galleryImages).map((image, index) => normalizeProductImageUrl(image, p.sku, index)))
      : null,
    stockStatus: p.stockStatus,
    weight: p.weight,
    dimensions: p.dimensions,
    variants: p.variants,
    metaTitle: sanitizeCatalogueText(p.metaTitle),
    metaDescription: sanitizeCatalogueText(p.metaDescription),
    searchKeywords: sanitizeCatalogueText(p.searchKeywords),
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  };
}

function normalizeGallery(primary: string, galleryImages?: string[]) {
  return Array.from(new Set([primary, ...(galleryImages ?? [])].filter(Boolean)));
}

// POST /admin/products
router.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const discountPercent = data.originalPrice > data.price
      ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)
      : 0;
    const slug = await uniqueSlug(slugify(data.name));

    const [product] = await db
      .insert(productsTable)
      .values({
        name: data.name,
        slug,
        description: data.description ?? null,
        price: data.price.toFixed(2),
        originalPrice: data.originalPrice.toFixed(2),
        discountPercent,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
        galleryImages: JSON.stringify(normalizeGallery(data.imageUrl, data.galleryImages)),
        inStock: data.inStock ?? true,
        stockCount: data.stockCount ?? null,
        isFeatured: data.isFeatured ?? false,
        isNewArrival: data.isNewArrival ?? false,
        onSale: data.onSale ?? false,
        tags: data.tags ?? null,
      })
      .returning();

    await db
      .update(categoriesTable)
      .set({ productCount: sql`${categoriesTable.productCount} + 1` })
      .where(eq(categoriesTable.id, data.categoryId));

    const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.id, data.categoryId)).limit(1);
    res.status(201).json(toProductResponse(product, cats[0]?.name ?? ""));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({
      error: "Database error",
      message: "Could not save product. Please check the database connection and try again.",
    });
  }
});

// PUT /admin/products/:id
router.put("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const discountPercent = data.originalPrice > data.price
      ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)
      : 0;

    const existing = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing.length) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const slug = await uniqueSlug(slugify(data.name), id);
    const nextGallery = normalizeGallery(data.imageUrl, data.galleryImages ?? parseGalleryImages(existing[0].galleryImages));
    const previousGallery = parseGalleryImages(existing[0].galleryImages);

    if (existing[0].categoryId !== data.categoryId) {
      await db
        .update(categoriesTable)
        .set({ productCount: sql`GREATEST(0, ${categoriesTable.productCount} - 1)` })
        .where(eq(categoriesTable.id, existing[0].categoryId));
      await db
        .update(categoriesTable)
        .set({ productCount: sql`${categoriesTable.productCount} + 1` })
        .where(eq(categoriesTable.id, data.categoryId));
    }

    const [updated] = await db
      .update(productsTable)
      .set({
        name: data.name,
        slug,
        description: data.description ?? null,
        price: data.price.toFixed(2),
        originalPrice: data.originalPrice.toFixed(2),
        discountPercent,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
        galleryImages: JSON.stringify(nextGallery),
        inStock: data.inStock ?? true,
        stockCount: data.stockCount ?? null,
        isFeatured: data.isFeatured ?? false,
        isNewArrival: data.isNewArrival ?? false,
        onSale: data.onSale ?? false,
        tags: data.tags ?? null,
      })
      .where(eq(productsTable.id, id))
      .returning();

    await Promise.all(
      previousGallery
        .filter((image) => !nextGallery.includes(image))
        .map((image) => removeUploadedFileIfOwned(image)),
    );

    const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.id, data.categoryId)).limit(1);
    res.json(toProductResponse(updated, cats[0]?.name ?? ""));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({
      error: "Database error",
      message: "Could not update product. Please check the database connection and try again.",
    });
  }
});

// DELETE /admin/products/:id
router.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!existing.length) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, id));
  await Promise.all(
    parseGalleryImages(existing[0].galleryImages).map((image) => removeUploadedFileIfOwned(image)),
  );
  await db
    .update(categoriesTable)
    .set({ productCount: sql`GREATEST(0, ${categoriesTable.productCount} - 1)` })
    .where(eq(categoriesTable.id, existing[0].categoryId));

  res.status(204).send();
});

// POST /admin/seed-categories — create default categories if none exist
router.post("/admin/seed-categories", requireAdmin, async (req, res) => {
  const existing = await db.select().from(categoriesTable);
  if (existing.length > 0) {
    res.status(200).json({ created: 0, message: "Categories already exist." });
    return;
  }

  const created = await db
    .insert(categoriesTable)
    .values(DEFAULT_CATEGORIES)
    .returning();

  res.status(201).json({ created: created.length, categories: created });
});

const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  icon: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(500).optional(),
});

router.post("/admin/categories", requireAdmin, async (req, res) => {
  const parsed = CreateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const [category] = await db
      .insert(categoriesTable)
      .values({
        ...parsed.data,
        icon: parsed.data.icon ?? "Tag",
        description: parsed.data.description ?? null,
      })
      .returning();
    res.status(201).json(category);
  } catch {
    res.status(409).json({ error: "A category with that name or slug already exists." });
  }
});

router.delete("/admin/categories/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid category id" });
    return;
  }

  const products = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.categoryId, id))
    .limit(1);
  if (products.length) {
    res.status(409).json({ error: "Cannot delete a category that still has products." });
    return;
  }

  const deleted = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.status(204).send();
});

export default router;
