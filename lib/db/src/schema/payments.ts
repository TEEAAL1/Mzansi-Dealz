import { pgTable, serial, text, numeric, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentSettingsTable = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  currency: text("currency").notNull().default("ZAR"),
  defaultGateway: text("default_gateway").notNull().default("payfast"),
  yocoEnabled: boolean("yoco_enabled").notNull().default(false),
  payfastEnabled: boolean("payfast_enabled").notNull().default(true),
  payfastSandbox: boolean("payfast_sandbox").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    gateway: text("gateway").notNull(),
    status: text("status").notNull().default("pending"),
    providerPaymentId: text("provider_payment_id"),
    providerCheckoutId: text("provider_checkout_id"),
    reference: text("reference").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("ZAR"),
    customerEmail: text("customer_email").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    providerPaymentIndex: uniqueIndex("payments_provider_payment_id_idx").on(table.gateway, table.providerPaymentId),
    referenceIndex: uniqueIndex("payments_reference_idx").on(table.reference),
  }),
);

export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  gateway: text("gateway").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  providerReference: text("provider_reference"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  currency: text("currency"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentLogsTable = pgTable(
  "payment_logs",
  {
    id: serial("id").primaryKey(),
    gateway: text("gateway").notNull(),
    eventId: text("event_id"),
    eventType: text("event_type"),
    reference: text("reference"),
    payload: text("payload").notNull(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    eventIndex: uniqueIndex("payment_logs_event_id_idx").on(table.gateway, table.eventId),
  }),
);

export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull(),
  gateway: text("gateway").notNull(),
  providerRefundId: text("provider_refund_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRefundSchema = createInsertSchema(refundsTable).omit({ id: true, createdAt: true });

export type PaymentSettings = typeof paymentSettingsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
export type PaymentLog = typeof paymentLogsTable.$inferSelect;
export type Refund = typeof refundsTable.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertRefund = z.infer<typeof insertRefundSchema>;