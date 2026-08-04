import crypto from "node:crypto";
import type { Request } from "express";

export function isPayfastConfigured() {
  return Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
}

export function payfastHost(sandbox: boolean) {
  return sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za";
}

export function buildPayfastSignature(data: Record<string, string>, passphrase: string) {
  const parts = Object.entries(data)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`)
    .join("&");
  const signed = passphrase
    ? `${parts}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`
    : parts;
  return crypto.createHash("md5").update(signed).digest("hex");
}

export function buildPayfastData(req: Request, input: {
  orderNumber: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  siteUrl: string;
  sandbox: boolean;
}) {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  if (!merchantId || !merchantKey) throw new Error("PayFast is not configured");
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  const [firstName, ...lastParts] = input.customerName.trim().split(/\s+/);
  const lastName = lastParts.join(" ") || firstName;
  const data: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${input.siteUrl}/order-confirmation/${input.orderNumber}`,
    cancel_url: `${input.siteUrl}/checkout?payment=cancelled&order=${input.orderNumber}`,
    notify_url: `${input.siteUrl}/api/checkout/notify`,
    name_first: firstName,
    name_last: lastName,
    email_address: input.customerEmail,
    cell_number: input.customerPhone.replace(/\D/g, ""),
    m_payment_id: input.orderNumber,
    amount: input.total.toFixed(2),
    item_name: `MzansiDealz Order ${input.orderNumber}`,
    email_confirmation: "1",
    confirmation_address: input.customerEmail,
  };
  return {
    url: `https://${payfastHost(input.sandbox)}/eng/process`,
    data: { ...data, signature: buildPayfastSignature(data, passphrase) },
  };
}

export async function verifyPayfastItn(req: Request, sandbox = process.env.PAYFAST_SANDBOX !== "false") {
  const data = req.body as Record<string, string>;
  const signature = data.signature;
  if (!signature || !process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY) return false;
  const copy = { ...data };
  delete copy.signature;
  const expected = buildPayfastSignature(copy, process.env.PAYFAST_PASSPHRASE ?? "");
  if (expected !== signature) return false;

  const host = payfastHost(sandbox);
  const validationBody = new URLSearchParams({ ...data, signature }).toString();
  const response = await fetch(`https://${host}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: validationBody,
  });
  return response.ok && (await response.text()).trim() === "VALID";
}