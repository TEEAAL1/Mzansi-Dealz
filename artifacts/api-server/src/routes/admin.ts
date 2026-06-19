import { Router, type Request, type Response, type NextFunction } from "express";
import { db, productsTable, ordersTable, orderItemsTable, categoriesTable } from "@workspace/db";
import { eq, desc, sql, count, sum } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "mzansi-admin-2024";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["x-admin-token"] as string | undefined;
  if (!auth || auth !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// POST /admin/login
router.post("/admin/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ token: ADMIN_PASSWORD });
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

  const validStatuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
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

const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  originalPrice: z.number().positive(),
  categoryId: z.number().int().positive(),
  imageUrl: z.string().url(),
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
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    originalPrice: Number(p.originalPrice),
    discountPercent: p.discountPercent,
    categoryId: p.categoryId,
    categoryName,
    imageUrl: p.imageUrl,
    inStock: p.inStock,
    stockCount: p.stockCount,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    onSale: p.onSale,
    tags: p.tags,
    createdAt: p.createdAt.toISOString(),
  };
}

// POST /admin/products
router.post("/admin/products", requireAdmin, async (req, res) => {
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
});

// PUT /admin/products/:id
router.put("/admin/products/:id", requireAdmin, async (req, res) => {
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
      inStock: data.inStock ?? true,
      stockCount: data.stockCount ?? null,
      isFeatured: data.isFeatured ?? false,
      isNewArrival: data.isNewArrival ?? false,
      onSale: data.onSale ?? false,
      tags: data.tags ?? null,
    })
    .where(eq(productsTable.id, id))
    .returning();

  const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.id, data.categoryId)).limit(1);
  res.json(toProductResponse(updated, cats[0]?.name ?? ""));
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
  await db
    .update(categoriesTable)
    .set({ productCount: sql`GREATEST(0, ${categoriesTable.productCount} - 1)` })
    .where(eq(categoriesTable.id, existing[0].categoryId));

  res.status(204).send();
});

export default router;
