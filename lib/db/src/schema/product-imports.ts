import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productImportRunsTable = pgTable("product_import_runs", {
  id: serial("id").primaryKey(),
  sourceDomain: text("source_domain").notNull(),
  status: text("status").notNull().default("crawling"),
  totalDiscovered: integer("total_discovered").notNull().default(0),
  productsImported: integer("products_imported").notNull().default(0),
  productsFailed: integer("products_failed").notNull().default(0),
  missingImages: integer("missing_images").notNull().default(0),
  missingPrices: integer("missing_prices").notNull().default(0),
  overwriteExisting: boolean("overwrite_existing").notNull().default(false),
  skipExisting: boolean("skip_existing").notNull().default(true),
  importImages: boolean("import_images").notNull().default(true),
  csvPath: text("csv_path"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const productImportItemsTable = pgTable("product_import_items", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  sku: text("sku"),
  name: text("name"),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  missingImage: boolean("missing_image").notNull().default(false),
  missingPrice: boolean("missing_price").notNull().default(false),
});

export const productImportSnapshotsTable = pgTable("product_import_snapshots", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  productId: integer("product_id").notNull(),
  action: text("action").notNull(),
  previousData: jsonb("previous_data"),
});

export const insertProductImportRunSchema = createInsertSchema(productImportRunsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProductImportRun = z.infer<typeof insertProductImportRunSchema>;
export type ProductImportRun = typeof productImportRunsTable.$inferSelect;
export type ProductImportItem = typeof productImportItemsTable.$inferSelect;