import { logger } from "../lib/logger";

type PaymentEmailType = "order_confirmation" | "payment_confirmation" | "payment_failed" | "refund_confirmation";

export async function sendPaymentEmail(type: PaymentEmailType, recipient: string, orderNumber: string) {
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider) {
    logger.info({ type, recipient, orderNumber }, "Payment email queued but no email provider is configured");
    return { sent: false, reason: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  }

  // Email delivery is intentionally an adapter boundary. Configure a provider
  // connector or an approved server-side adapter before enabling this.
  logger.warn({ provider, type, recipient, orderNumber }, "Email provider adapter is not installed");
  return { sent: false, reason: "EMAIL_PROVIDER_ADAPTER_NOT_INSTALLED" };
}