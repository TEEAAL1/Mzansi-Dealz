import crypto from "node:crypto";

const YOCO_API_URL = "https://payments.yoco.com/api";

function getSecret() {
  return process.env.YOCO_SECRET_KEY;
}

export function isYocoConfigured() {
  return Boolean(getSecret());
}

export function isYocoWebhookConfigured() {
  return Boolean(process.env.YOCO_WEBHOOK_SECRET);
}

export async function createYocoCheckout(input: {
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  orderNumber: string;
  customerEmail: string;
  idempotencyKey?: string;
  lineItems: Array<{ name: string; quantity: number; amountCents: number }>;
}) {
  const secret = getSecret();
  if (!secret) throw new Error("Yoco is not configured");

  const response = await fetch(`${YOCO_API_URL}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `mzansi-${input.idempotencyKey ?? input.orderNumber}`,
    },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: input.currency,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      failureUrl: input.failureUrl,
      clientReferenceId: input.orderNumber,
      externalId: input.orderNumber,
      metadata: { orderNumber: input.orderNumber, customerEmail: input.customerEmail },
      lineItems: input.lineItems.map((item) => ({
        displayName: item.name,
        quantity: item.quantity,
        pricingDetails: { price: item.amountCents },
      })),
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    redirectUrl?: string;
    paymentId?: string | null;
    status?: string;
    error?: string;
  };
  if (!response.ok || !body.id || !body.redirectUrl) {
    throw new Error(body.error || `Yoco checkout failed with status ${response.status}`);
  }
  return body;
}

export function verifyYocoWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) throw new Error("Yoco webhook secret is not configured");

  const webhookId = String(headers["webhook-id"] ?? "");
  const timestamp = String(headers["webhook-timestamp"] ?? "");
  const signatureHeader = String(headers["webhook-signature"] ?? "");
  const timestampNumber = Number(timestamp);
  if (!webhookId || !timestamp || !signatureHeader || !Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 180) return false;

  const signedContent = `${webhookId}.${timestamp}.${rawBody.toString("utf8")}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  return signatureHeader.split(" ").some((entry) => {
    const [, value] = entry.split(",", 2);
    if (!value) return false;
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(value);
    return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  });
}

export async function refundYocoCheckout(checkoutId: string, amountCents?: number) {
  const secret = getSecret();
  if (!secret) throw new Error("Yoco is not configured");
  const response = await fetch(`${YOCO_API_URL}/checkouts/${encodeURIComponent(checkoutId)}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `refund-${checkoutId}-${amountCents ?? "full"}`,
    },
    body: JSON.stringify(amountCents ? { amount: amountCents } : {}),
  });
  const body = (await response.json().catch(() => ({}))) as { refundId?: string; status?: string; message?: string };
  if (!response.ok) throw new Error(body.message || `Yoco refund failed with status ${response.status}`);
  return body;
}