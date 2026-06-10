import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, desc, asc, sql } from "drizzle-orm";
import {
  ListProductsQueryParams,
  GetFeaturedProductsQueryParams,
  GetNewArrivalsQueryParams,
  GetProductParams,
} from "@workspace/api-zod";

const router = Router();

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

router.get("/products/featured", async (req, res) => {
  const parsed = GetFeaturedProductsQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 8;

  const rows = await db
    .select({ product: productsTable, category: categoriesTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.isFeatured, true))
    .orderBy(desc(productsTable.discountPercent))
    .limit(limit);

  res.json(rows.map((r) => toProductResponse(r.product, r.category?.name ?? "")));
});

router.get("/products/new-arrivals", async (req, res) => {
  const parsed = GetNewArrivalsQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 8;

  const rows = await db
    .select({ product: productsTable, category: categoriesTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.isNewArrival, true))
    .orderBy(desc(productsTable.createdAt))
    .limit(limit);

  res.json(rows.map((r) => toProductResponse(r.product, r.category?.name ?? "")));
});

router.get("/products/stats", async (req, res) => {
  const [totalProducts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);

  const [totalCategories] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categoriesTable);

  const [avgDiscount] = await db
    .select({ avg: sql<number>`round(avg(discount_percent))::int` })
    .from(productsTable);

  const [featuredCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.isFeatured, true));

  const [newArrivalsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.isNewArrival, true));

  res.json({
    totalProducts: totalProducts?.count ?? 0,
    totalCategories: totalCategories?.count ?? 0,
    avgDiscountPercent: avgDiscount?.avg ?? 0,
    featuredCount: featuredCount?.count ?? 0,
    newArrivalsCount: newArrivalsCount?.count ?? 0,
  });
});

router.get("/products/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const rows = await db
    .select({ product: productsTable, category: categoriesTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, parsed.data.id))
    .limit(1);

  if (!rows.length) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(toProductResponse(rows[0].product, rows[0].category?.name ?? ""));
});

router.get("/products", async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions = [];

  if (params.category) {
    const cat = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, params.category))
      .limit(1);
    if (cat.length) {
      conditions.push(eq(productsTable.categoryId, cat[0].id));
    }
  }

  if (params.search) {
    conditions.push(ilike(productsTable.name, `%${params.search}%`));
  }

  if (params.on_sale === "true" || params.on_sale === true) {
    conditions.push(eq(productsTable.onSale, true));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderClause;
  switch (params.sort) {
    case "price_asc":
      orderClause = asc(productsTable.price);
      break;
    case "price_desc":
      orderClause = desc(productsTable.price);
      break;
    case "discount_desc":
      orderClause = desc(productsTable.discountPercent);
      break;
    default:
      orderClause = desc(productsTable.createdAt);
  }

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const [rows, totalRows] = await Promise.all([
    db
      .select({ product: productsTable, category: categoriesTable })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(whereClause),
  ]);

  res.json({
    products: rows.map((r) => toProductResponse(r.product, r.category?.name ?? "")),
    total: totalRows[0]?.count ?? 0,
  });
});

export default router;
