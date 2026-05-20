import { Router } from "express";
import crypto from "crypto";
import https from "https";
import { db, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { CreateCheckoutBody } from "@workspace/api-zod";

const router = Router();

const SANDBOX = process.env.PAYFAST_SANDBOX !== "false";
const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID ?? "10000100";
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY ?? "46f0cd694581a";
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE ?? "";
const PAYFAST_HOST = SANDBOX ? "sandbox.payfast.co.za" : "www.payfast.co.za";
const PAYFAST_URL = `https://${PAYFAST_HOST}/eng/process`;

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MD-${timestamp}-${random}`;
}

function buildSignature(data: Record<string, string>, passphrase: string): string {
  const parts = Object.entries(data)
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .join("&");

  const str = passphrase ? `${parts}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}` : parts;
  return crypto.createHash("md5").update(str).digest("hex");
}

function getSiteUrl(req: Express.Request): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domains) return `https://${domains}`;
  const host = (req as any).headers?.host ?? "localhost";
  return `https://${host}`;
}

router.post("/checkout", async (req, res) => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid checkout data", details: parsed.error.issues });
    return;
  }

  const body = parsed.data;

  // Fetch products for the items in cart
  const productIds = body.items.map((i) => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));

  if (products.length !== productIds.length) {
    res.status(400).json({ error: "One or more products not found" });
    return;
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate totals
  let subtotal = 0;
  const lineItems: Array<{ productId: number; productName: string; productImageUrl: string; price: number; quantity: number; subtotal: number }> = [];

  for (const item of body.items) {
    const product = productMap.get(item.productId)!;
    const lineSubtotal = Number(product.price) * item.quantity;
    subtotal += lineSubtotal;
    lineItems.push({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      price: Number(product.price),
      quantity: item.quantity,
      subtotal: lineSubtotal,
    });
  }

  const deliveryFee = subtotal >= 400 ? 0 : 69;
  const total = subtotal + deliveryFee;
  const orderNumber = generateOrderNumber();
  const siteUrl = getSiteUrl(req);

  // Save order
  const [order] = await db
    .insert(ordersTable)
    .values({
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
      status: "pending",
    })
    .returning();

  await db.insert(orderItemsTable).values(
    lineItems.map((li) => ({
      orderId: order.id,
      productId: li.productId,
      productName: li.productName,
      productImageUrl: li.productImageUrl,
      price: li.price.toFixed(2),
      quantity: li.quantity,
      subtotal: li.subtotal.toFixed(2),
    }))
  );

  // Build PayFast form data
  const nameParts = body.customerName.trim().split(" ");
  const nameFirst = nameParts[0];
  const nameLast = nameParts.slice(1).join(" ") || nameParts[0];

  const payfastData: Record<string, string> = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: `${siteUrl}/order-confirmation/${orderNumber}`,
    cancel_url: `${siteUrl}/checkout`,
    notify_url: `${siteUrl}/api/checkout/notify`,
    name_first: nameFirst,
    name_last: nameLast,
    email_address: body.customerEmail,
    cell_number: body.customerPhone.replace(/\D/g, ""),
    m_payment_id: orderNumber,
    amount: total.toFixed(2),
    item_name: `MzansiDealz Order ${orderNumber}`,
    item_description: `${lineItems.length} item(s) from MzansiDealz`,
    email_confirmation: "1",
    confirmation_address: body.customerEmail,
  };

  // Generate signature
  const signature = buildSignature(payfastData, PASSPHRASE);
  payfastData.signature = signature;

  req.log.info({ orderNumber, total, sandbox: SANDBOX }, "Checkout created");

  res.json({
    orderNumber,
    total,
    payfastUrl: PAYFAST_URL,
    payfastData,
  });
});

router.post("/checkout/notify", async (req, res) => {
  // Always respond 200 immediately to PayFast
  res.status(200).send("OK");

  try {
    const data: Record<string, string> = req.body;
    const orderNumber = data.m_payment_id;
    const paymentStatus = data.payment_status;
    const pfPaymentId = data.pf_payment_id;

    if (!orderNumber) return;

    const status = paymentStatus === "COMPLETE" ? "paid" : "cancelled";

    await db
      .update(ordersTable)
      .set({
        status,
        payfastPaymentId: pfPaymentId ?? null,
        payfastReference: data.pf_payment_id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.orderNumber, orderNumber));

    req.log.info({ orderNumber, paymentStatus, pfPaymentId }, "PayFast ITN processed");
  } catch (err) {
    req.log.error({ err }, "PayFast ITN error");
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
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productImageUrl: i.productImageUrl,
      price: Number(i.price),
      quantity: i.quantity,
      subtotal: Number(i.subtotal),
    })),
    createdAt: order.createdAt.toISOString(),
  });
});

export default router;
