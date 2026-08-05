import {
  db,
  categoriesTable,
  orderItemsTable,
  ordersTable,
  productsTable,
  topSellerSettingsTable,
} from "@workspace/db";
import { and, desc, eq, ilike, inArray, not, sql } from "drizzle-orm";

export type TopSellerMode = "automatic" | "curated";
export type TopSellerLimit = 5 | 10;

export const DEFAULT_TOP_SELLER_SETTINGS = {
  mode: "automatic" as TopSellerMode,
  displayLimit: 5 as TopSellerLimit,
  curatedProductIds: [] as number[],
};

export function normalizeTopSellerSettings(settings: {
  mode: string;
  displayLimit: number;
  curatedProductIds: number[];
}) {
  return {
    mode: settings.mode === "curated" ? ("curated" as const) : ("automatic" as const),
    displayLimit: settings.displayLimit === 10 ? (10 as const) : (5 as const),
    curatedProductIds: settings.curatedProductIds,
  };
}

export async function getOrCreateTopSellerSettings() {
  const existing = await db.select().from(topSellerSettingsTable).limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(topSellerSettingsTable)
    .values(DEFAULT_TOP_SELLER_SETTINGS)
    .returning();
  return created;
}

export async function getAutomaticTopSellerRows(limit: number) {
  return db
    .select({ product: productsTable, category: categoriesTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(productsTable.status, "active"),
        eq(productsTable.inStock, true),
        not(ilike(productsTable.name, "%test%")),
        not(ilike(productsTable.slug, "%test%")),
      ),
    )
    .orderBy(
      desc(sql<number>`(
        SELECT COALESCE(SUM(${orderItemsTable.quantity}), 0)
        FROM ${orderItemsTable}
        INNER JOIN ${ordersTable} ON ${ordersTable.id} = ${orderItemsTable.orderId}
        WHERE ${orderItemsTable.productId} = ${productsTable.id}
          AND ${ordersTable.status} NOT IN ('cancelled', 'failed', 'refunded')
      )`),
      desc(productsTable.createdAt),
    )
    .limit(limit);
}

export async function getCuratedTopSellerRows(productIds: number[], limit: number) {
  if (productIds.length === 0) return [];

  const rows = await db
    .select({ product: productsTable, category: categoriesTable })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(
      and(
        inArray(productsTable.id, productIds),
        eq(productsTable.status, "active"),
        eq(productsTable.inStock, true),
        not(ilike(productsTable.name, "%test%")),
        not(ilike(productsTable.slug, "%test%")),
      ),
    );
  const rowMap = new Map(rows.map((row) => [row.product.id, row]));
  return productIds
    .slice(0, limit)
    .map((id) => rowMap.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export async function resolveTopSellerRows(settings: {
  mode: TopSellerMode;
  displayLimit: TopSellerLimit;
  curatedProductIds: number[];
}) {
  if (settings.mode === "curated") {
    return getCuratedTopSellerRows(settings.curatedProductIds, settings.displayLimit);
  }
  return getAutomaticTopSellerRows(settings.displayLimit);
}

export async function resolveTopSellerPreviews(settings: {
  displayLimit: TopSellerLimit;
  curatedProductIds: number[];
}) {
  const [automaticRows, curatedRows] = await Promise.all([
    getAutomaticTopSellerRows(settings.displayLimit),
    getCuratedTopSellerRows(settings.curatedProductIds, settings.displayLimit),
  ]);
  return { automaticRows, curatedRows };
}

export async function validateCuratedProductIds(productIds: number[], limit: TopSellerLimit) {
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length !== productIds.length) {
    return { error: "Choose each product only once." as const };
  }
  if (uniqueIds.length < limit) {
    return { error: `Choose at least ${limit} in-stock products for the curated lineup.` as const };
  }
  if (uniqueIds.length > 10) {
    return { error: "A curated lineup can contain no more than 10 products." as const };
  }

  const available = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        inArray(productsTable.id, uniqueIds),
        eq(productsTable.status, "active"),
        eq(productsTable.inStock, true),
        not(ilike(productsTable.name, "%test%")),
        not(ilike(productsTable.slug, "%test%")),
      ),
    );
  const availableIds = new Set(available.map((product) => product.id));
  const unavailable = uniqueIds.filter((id) => !availableIds.has(id));
  if (unavailable.length) {
    return {
      error: `These products are unavailable or out of stock: ${unavailable.join(", ")}.` as const,
    };
  }
  return { ids: uniqueIds };
}