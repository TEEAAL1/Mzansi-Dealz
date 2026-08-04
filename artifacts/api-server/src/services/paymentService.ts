import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  paymentLogsTable,
  paymentSettingsTable,
  paymentsTable,
  paymentTransactionsTable,
  productsTable,
  refundsTable,
} from "@workspace/db";
import { sendPaymentEmail } from "./emailService";

export async function getPaymentSettings() {
  const existing = await db.select().from(paymentSettingsTable).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(paymentSettingsTable).values({}).returning();
  return created;
}

export async function savePaymentSettings(input: {
  currency: string;
  defaultGateway: string;
  yocoEnabled: boolean;
  payfastEnabled: boolean;
  payfastSandbox: boolean;
}) {
  const current = await getPaymentSettings();
  const [updated] = await db
    .update(paymentSettingsTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(paymentSettingsTable.id, current.id))
    .returning();
  return updated;
}

export async function recordPayment(input: {
  orderId: number;
  gateway: string;
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  providerCheckoutId?: string | null;
  providerPaymentId?: string | null;
}) {
  const existing = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, input.reference)).limit(1);
  if (existing[0]) return existing[0];
  const [payment] = await db.insert(paymentsTable).values({
    ...input,
    amount: input.amount.toFixed(2),
    status: "pending",
  }).returning();
  await db.insert(paymentTransactionsTable).values({
    paymentId: payment.id,
    gateway: input.gateway,
    type: "authorization",
    status: "pending",
    providerReference: input.providerCheckoutId ?? input.providerPaymentId ?? input.reference,
    amount: input.amount.toFixed(2),
    currency: input.currency,
  });
  return payment;
}

export async function settlePayment(reference: string, providerPaymentId?: string | null) {
  const payment = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference)).limit(1);
  if (!payment[0]) throw new Error("Payment reference not found");
  if (payment[0].status === "paid") return payment[0];

  const [updatedPayment] = await db.update(paymentsTable).set({
    status: "paid",
    providerPaymentId: providerPaymentId ?? payment[0].providerPaymentId,
    updatedAt: new Date(),
  }).where(eq(paymentsTable.id, payment[0].id)).returning();

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, payment[0].orderId)).limit(1);
  if (!order) throw new Error("Order not found for payment");
  if (order.status !== "paid") {
    await db.update(ordersTable).set({ status: "paid", updatedAt: new Date() }).where(eq(ordersTable.id, order.id));
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    for (const item of items) {
      await db.update(productsTable).set({
        stockCount: sql`CASE WHEN ${productsTable.stockCount} IS NULL THEN NULL ELSE GREATEST(${productsTable.stockCount} - ${item.quantity}, 0) END`,
        inStock: sql`CASE WHEN ${productsTable.stockCount} IS NULL THEN true WHEN ${productsTable.stockCount} - ${item.quantity} > 0 THEN true ELSE false END`,
      }).where(and(eq(productsTable.id, item.productId), sql`${productsTable.stockCount} IS NULL OR ${productsTable.stockCount} >= ${item.quantity}`));
    }
  }
  await db.update(paymentTransactionsTable).set({ status: "succeeded", providerReference: providerPaymentId ?? undefined })
    .where(and(eq(paymentTransactionsTable.paymentId, payment[0].id), eq(paymentTransactionsTable.type, "authorization")));
  await sendPaymentEmail("payment_confirmation", order.customerEmail, order.orderNumber);
  return updatedPayment;
}

export async function markPaymentFailed(reference: string) {
  const payment = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference)).limit(1);
  if (!payment[0] || payment[0].status === "paid") return payment[0];
  const [updated] = await db.update(paymentsTable).set({ status: "failed", updatedAt: new Date() })
    .where(eq(paymentsTable.id, payment[0].id)).returning();
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, payment[0].orderId)).limit(1);
  if (order) await sendPaymentEmail("payment_failed", order.customerEmail, order.orderNumber);
  return updated;
}

export async function listPayments() {
  return db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt)).limit(100);
}

export async function createRefund(paymentId: number, amount: number, gateway: string, providerRefundId?: string | null, status = "pending") {
  const [refund] = await db.insert(refundsTable).values({
    paymentId,
    gateway,
    amount: amount.toFixed(2),
    providerRefundId,
    status,
  }).returning();
  if (status === "succeeded") {
    await db.update(paymentsTable).set({ status: "refunded", updatedAt: new Date() }).where(eq(paymentsTable.id, paymentId));
    const payment = await db.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId)).limit(1);
    if (payment[0]) {
      const order = await db.select().from(ordersTable).where(eq(ordersTable.id, payment[0].orderId)).limit(1);
      if (order[0]) await sendPaymentEmail("refund_confirmation", order[0].customerEmail, order[0].orderNumber);
    }
  }
  return refund;
}

export async function hasProcessedEvent(gateway: string, eventId: string) {
  return Boolean((await db.select({ id: paymentLogsTable.id }).from(paymentLogsTable)
    .where(and(eq(paymentLogsTable.gateway, gateway), eq(paymentLogsTable.eventId, eventId))).limit(1))[0]);
}

export async function recordEvent(gateway: string, eventId: string, eventType: string, payload: unknown, reference?: string) {
  await db.insert(paymentLogsTable).values({
    gateway,
    eventId,
    eventType,
    reference,
    payload: JSON.stringify(payload),
    processed: true,
  }).onConflictDoNothing();
}