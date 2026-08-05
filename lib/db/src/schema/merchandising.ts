import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const topSellerSettingsTable = pgTable("top_seller_settings", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull().default("automatic"),
  displayLimit: integer("display_limit").notNull().default(5),
  curatedProductIds: integer("curated_product_ids").array().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTopSellerSettingsSchema = createInsertSchema(topSellerSettingsTable).omit({ id: true, updatedAt: true });
export type InsertTopSellerSettings = z.infer<typeof insertTopSellerSettingsSchema>;
export type TopSellerSettings = typeof topSellerSettingsTable.$inferSelect;