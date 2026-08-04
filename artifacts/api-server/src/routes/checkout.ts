import { Router, type Request } from "express";
import crypto from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, paymentsTable } from "@workspace/db";
import { CreateCheckoutBody } from "@workspace/api-zod";
import { createYocoCheckout, isYocoConfigured, verifyYocoWebhook } from "../services/yocoService";
import { buildPayfastData, isPayfastConfigured, verifyPayfastItn } from "../services/payfastService";
import {
  getPaymentSettings,
  hasProcessedEvent,
  markPaymentFailed,
  recordEvent,
  recordPayment,
  settlePayment,
} from "../services/paymentService";
import { sendPaymentEmail } from "../services/emailService";

const router = Router();

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `MD-${timestamp}-${random}`;
}

function getSiteUrl(req: Request): string {
  const configured = process.env.PUBLIC_APP_URL ?? process.env.FRONTEND_ORIGIN;
  if (configured) return configured.replace(/\/$/, "");
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domains) return `https://${domains}`;
  return `https://${req.get("host") ?? "localhost"}`;
}

function toLineItems(items: Array<{ productId: number; quantity: number }>, products: typeof productsTable.$inferSelect[]) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  let subtotal = 0;
  const lineItems: Array<{
    productId: number;
    productName: string;
    productImageUrl: string;
    price: number;
    quantity: number;
    subtotal: number;
  }> = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("One or more products not found");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new Error("Each product quantity must be between 1 and 99");
    }
    if (product.stockCount !== null && product.stockCount < item.quantity) {
      throw new Error(`${product.name} does not have enough stock`);
    }
    const price = Number(product.price);
    const lineSubtotal = price * item.quantity;
    subtotal += lineSubtotal;
    lineItems.push({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      price,
      quantity: item.quantity,
      subtotal: lineSubtotal,
    });
  }
  return { subtotal, lineItems };
}

async function chooseGateway(requested: string | undefined): Promise<{
  settings: Awaited<ReturnType<typeof getPaymentSettings>>;
  gateway: "yoco" | "payfast" | null;
}> {
  const settings = await getPaymentSettings();
  const yocoAvailable = settings.yocoEnabled && isYocoConfigured();
  const payfastAvailable = settings.payfastEnabled && isPayfastConfigured();
  if (requested === "yoco") {
    return { settings, gateway: yocoAvailable ? "yoco" : null };
  }
  if (requested === "payfast") {
    return { settings, gateway: payfastAvailable ? "payfast" : null };
  }
  const preferred = settings.defaultGateway;
  const gateway =
    preferred === "yoco" && yocoAvailable ? "yoco" :
    preferred === "payfast" && payfastAvailable ? "payfast" :
    yocoAvailable ? "yoco" :
    payfastAvailable ? "payfast" : null;
  return { settings, gateway };
}

async function createProviderCheckout(
  req: Request,
  order: typeof ordersTable.$inferSelect,
  items: Array<{ productName: string; quantity: number; price: number | string }>,
  gateway: "yoco" | "payfast",
  paymentReference: string,
) {
  const settings = await getPaymentSettings();
  const siteUrl = getSiteUrl(req);
  const total = Number(order.total);
  const payment = await recordPayment({
    orderId: order.id,
    gateway,
    reference: paymentReference,
    amount: total,
    currency: settings.currency,
    customerEmail: order.customerEmail,
  });

  if (gateway === "yoco") {
    const checkout = await createYocoCheckout({
      amountCents: Math.round(total * 100),
      currency: settings.currency,
      successUrl: `${siteUrl}/order-confirmation/${order.orderNumber}?payment=success`,
      cancelUrl: `${siteUrl}/order-confirmation/${order.orderNumber}?payment=cancelled`,
      failureUrl: `${siteUrl}/order-confirmation/${order.orderNumber}?payment=failed`,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      idempotencyKey: paymentReference,
      lineItems: items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        amountCents: Math.round(Number(item.price) * 100),
      })),
    });
    await db.update(paymentsTable).set({ providerCheckoutId: checkout.id, updatedAt: new Date() })
      .where(eq(paymentsTable.id, payment.id));
    return {
      gateway,
      paymentReference,
      redirectUrl: checkout.redirectUrl,
      yocoCheckoutId: checkout.id,
      payfastUrl: null,
      payfastData: null,
    };
  }

  const payfast = buildPayfastData(req, {
    orderNumber: order.orderNumber,
    total,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    siteUrl,
    sandbox: settings.payfastSandbox,
  });
  return {
    gateway,
    paymentReference,
    redirectUrl: payfast.url,
    yocoCheckoutId: null,
    payfastUrl: payfast.url,
    payfastData: payfast.data,
  };
}

router.post("/checkout", async (req, res) => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checkout data", details: parsed.error.issues });
    return;
  }

  try {
    const body = parsed.data;
    if (body.items.length === 0) {
      res.status(400).json({ error: "Your cart is empty" });
      return;
    }
    const selected = await chooseGateway(body.gateway);
    if (!selected.gateway) {
      res.status(503).json({
        error: body.gateway
          ? `${body.gateway === "yoco" ? "Yoco" : "PayFast"} is currently unavailable. Please choose another payment method.`
          : "No payment gateway is configured. An administrator must configure Yoco or PayFast.",
      });
      return;
    }
    if (body.idempotencyKey) {
      const existing = await db.select({ orderNumber: ordersTable.orderNumber })
        .from(ordersTable).where(eq(ordersTable.checkoutIdempotencyKey, body.idempotencyKey)).limit(1);
      if (existing[0]) {
        res.status(409).json({ error: "This checkout has already been created", orderNumber: existing[0].orderNumber });
        return;
      }
    }

    const productIds = [...new Set(body.items.map((item) => item.productId))];
    const productRows = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
    if (productRows.length !== productIds.length) {
      res.status(400).json({ error: "One or more products not found" });
      return;
    }
    const { subtotal, lineItems } = toLineItems(body.items, productRows);
    const deliveryFee = subtotal >= 400 ? 0 : 69;
    const total = subtotal + deliveryFee;
    const orderNumber = generateOrderNumber();
    const [order] = await db.insert(ordersTable).values({
      orderNumber,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      deliveryAddress: body.deliveryAddress,
      deliveryCity: body.deliveryCity,
      deliveryProvince: body.deliveryProvince,
      deliveryPostalCode: body.deliveryPostalCode,
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
      status: "awaiting_payment",
      checkoutIdempotencyKey: body.idempotencyKey ?? null,
    }).returning();
    await db.insert(orderItemsTable).values(lineItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
      price: item.price.toFixed(2),
      quantity: item.quantity,
      subtotal: item.subtotal.toFixed(2),
    })));

    const paymentReference = orderNumber;
    const result = await createProviderCheckout(req, order, lineItems, selected.gateway, paymentReference);
    await sendPaymentEmail("order_confirmation", order.customerEmail, order.orderNumber);
    req.log.info({ orderNumber, gateway: selected.gateway, total }, "Checkout created");
    res.json({ orderNumber, total, ...result });
  } catch (error) {
    req.log.error({ err: error }, "Checkout creation failed");
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not create checkout" });
  }
});

router.get("/checkout/options", async (_req, res) => {
  const settings = await getPaymentSettings();
  const yocoAvailable = settings.yocoEnabled && isYocoConfigured();
  const payfastAvailable = settings.payfastEnabled && isPayfastConfigured();
  const gateways = [
    {
      id: "yoco",
      name: "Yoco",
      available: yocoAvailable,
      description: "Secure hosted checkout for cards and instant EFT.",
      methods: ["Visa", "Mastercard", "American Express", "Instant EFT"],
    },
    {
      id: "payfast",
      name: "PayFast",
      available: payfastAvailable,
      description: "PayFast hosted checkout with cards and EFT options.",
      methods: ["Visa", "Mastercard", "Instant EFT", "Capitec Pay"],
    },
  ];
  const defaultGateway =
    settings.defaultGateway === "yoco" && yocoAvailable
      ? "yoco"
      : settings.defaultGateway === "payfast" && payfastAvailable
        ? "payfast"
        : yocoAvailable
          ? "yoco"
          : payfastAvailable
            ? "payfast"
            : null;
  res.json({ currency: settings.currency, defaultGateway, gateways });
});

router.post("/checkout/retry/:orderNumber", async (req, res) => {
  const email = typeof req.body?.customerEmail === "string" ? req.body.customerEmail.trim().toLowerCase() : "";
  if (!email) {
    res.status(400).json({ error: "Customer email is required to retry payment" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, req.params.orderNumber)).limit(1);
  if (!order || order.customerEmail.toLowerCase() !== email) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status === "paid") {
    res.status(409).json({ error: "This order is already paid" });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const selected = await chooseGateway(typeof req.body?.gateway === "string" ? req.body.gateway : undefined);
  if (!selected.gateway) {
    res.status(503).json({
      error: req.body?.gateway
        ? `${req.body.gateway === "yoco" ? "Yoco" : "PayFast"} is currently unavailable. Please choose another payment method.`
        : "No payment gateway is configured.",
    });
    return;
  }
  try {
    const result = await createProviderCheckout(req, order, items, selected.gateway, `${order.orderNumber}-${Date.now()}`);
    res.json({ orderNumber: order.orderNumber, total: Number(order.total), ...result });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Could not retry payment" });
  }
});

router.post("/checkout/notify", async (req, res) => {
  res.status(200).send("OK");
  try {
    const settings = await getPaymentSettings();
    if (!(await verifyPayfastItn(req, settings.payfastSandbox))) {
      req.log.warn("Rejected invalid PayFast ITN");
      return;
    }
    const data = req.body as Record<string, string>;
    const orderNumber = data.m_payment_id;
    if (!orderNumber) return;
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, orderNumber)).limit(1);
    if (!order) return;
    const [payment] = await db.select().from(paymentsTable).where(and(eq(paymentsTable.orderId, order.id), eq(paymentsTable.gateway, "payfast"))).orderBy(desc(paymentsTable.createdAt)).limit(1);
    if (!payment) return;
    if (data.payment_status === "COMPLETE") {
      await settlePayment(payment.reference, data.pf_payment_id);
    } else if (data.payment_status === "FAILED" || data.payment_status === "CANCELLED") {
      await markPaymentFailed(payment.reference);
    }
    await recordEvent("payfast", data.pf_payment_id ?? `${orderNumber}:${data.payment_status}`, "itn", data, orderNumber);
  } catch (error) {
    req.log.error({ err: error }, "PayFast ITN processing failed");
  }
});

router.post("/webhooks/yoco", async (req, res) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: "Raw webhook body is required" });
    return;
  }
  try {
    if (!verifyYocoWebhook(rawBody, req.headers)) {
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }
    const event = req.body as { id?: string; type?: string; payload?: Record<string, unknown> };
    if (!event.id || await hasProcessedEvent("yoco", event.id)) {
      res.status(200).json({ received: true });
      return;
    }
    const payload = event.payload ?? {};
    const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
    const orderNumber = String(metadata.orderNumber ?? payload.clientReferenceId ?? payload.externalId ?? "");
    const paymentId = typeof payload.paymentId === "string" ? payload.paymentId : undefined;
    if (orderNumber && (event.type === "payment.succeeded" || event.type === "checkout.completed" || event.type === "payment.success")) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, orderNumber)).limit(1);
      if (order) {
        const [payment] = await db.select().from(paymentsTable).where(and(eq(paymentsTable.orderId, order.id), eq(paymentsTable.gateway, "yoco"))).orderBy(desc(paymentsTable.createdAt)).limit(1);
        if (payment) await settlePayment(payment.reference, paymentId);
      }
    } else if (orderNumber && (event.type === "payment.failed" || event.type === "checkout.failed")) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, orderNumber)).limit(1);
      if (order) {
        const [payment] = await db.select().from(paymentsTable).where(and(eq(paymentsTable.orderId, order.id), eq(paymentsTable.gateway, "yoco"))).orderBy(desc(paymentsTable.createdAt)).limit(1);
        if (payment) await markPaymentFailed(payment.reference);
      }
    }
    await recordEvent("yoco", event.id, event.type ?? "unknown", event, orderNumber || undefined);
    res.status(200).json({ received: true });
  } catch (error) {
    req.log.error({ err: error }, "Yoco webhook processing failed");
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

router.get("/orders/:orderNumber", async (req, res) => {
  const { orderNumber } = req.params;
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, orderNumber)).limit(1);
  if (!orders.length) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const order = orders[0];
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.json({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    deliveryProvince: order.deliveryProvince,
    deliveryPostalCode: order.deliveryPostalCode,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    status: order.status,
    payfastPaymentId: order.payfastPaymentId,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),
    createdAt: order.createdAt.toISOString(),
  });
});

router.get("/orders/:orderNumber/invoice", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.toLowerCase() : "";
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, req.params.orderNumber)).limit(1);
  if (!order || email !== order.customerEmail.toLowerCase()) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
  const rows = items.map((item) => `<tr><td>${escape(item.productName)}</td><td>${item.quantity}</td><td>R ${Number(item.subtotal).toFixed(2)}</td></tr>`).join("");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.orderNumber}.html"`);
  res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escape(order.orderNumber)}</title><style>body{font-family:Arial;max-width:760px;margin:40px auto;color:#222}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:10px;text-align:left}.total{font-size:20px;font-weight:bold;text-align:right;margin-top:24px}</style></head><body><h1>MzansiDealz</h1><p>Invoice: ${escape(order.orderNumber)}<br>Customer: ${escape(order.customerName)}<br>Email: ${escape(order.customerEmail)}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: R ${Number(order.total).toFixed(2)}</p></body></html>`);
});

export default router;