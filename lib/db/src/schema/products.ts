import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: integer("discount_percent").notNull().default(0),
  categoryId: integer("category_id").notNull(),
  imageUrl: text("image_url").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
  stockCount: integer("stock_count"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNewArrival: boolean("is_new_arrival").notNull().default(false),
  onSale: boolean("on_sale").notNull().default(false),
  tags: text("tags"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
