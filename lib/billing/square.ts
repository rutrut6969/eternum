import crypto from "node:crypto";

type SquareEnvironment = "sandbox" | "production";

export function getSquareConfig() {
  const environment = (process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox") satisfies SquareEnvironment;
  const prefix = environment === "production" ? "SQUARE_PRODUCTION" : "SQUARE_SANDBOX";
  const accessToken = process.env[`${prefix}_ACCESS_TOKEN`];
  const applicationId = process.env[`${prefix}_APPLICATION_ID`];
  const locationId = process.env[`${prefix}_LOCATION_ID`];
  const webhookSignatureKey = process.env[`${prefix}_WEBHOOK_SIGNATURE_KEY`];

  return {
    environment,
    accessToken,
    applicationId,
    locationId,
    webhookSignatureKey,
    apiBaseUrl: environment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com"
  };
}

export function assertSquareCheckoutConfig() {
  const config = getSquareConfig();
  if (!config.accessToken || !config.locationId) {
    throw new Error(`Square ${config.environment} checkout is not configured.`);
  }
  return config;
}

export async function squareRequest<T>(path: string, init: RequestInit = {}) {
  const config = assertSquareCheckoutConfig();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Square-Version": "2025-05-21",
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Square request failed: ${JSON.stringify(body)}`);
  }
  return body as T;
}

export async function createSquarePaymentLink({
  name,
  amountCents,
  redirectUrl,
  metadata
}: {
  name: string;
  amountCents: number;
  redirectUrl: string;
  metadata: Record<string, string>;
}) {
  const config = assertSquareCheckoutConfig();
  return squareRequest<{ payment_link: { id: string; url: string; order_id?: string } }>("/v2/online-checkout/payment-links", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      quick_pay: {
        name,
        price_money: { amount: amountCents, currency: "USD" },
        location_id: config.locationId
      },
      checkout_options: { redirect_url: redirectUrl },
      pre_populated_data: {},
      metadata
    })
  });
}

export function verifySquareWebhookSignature({
  notificationUrl,
  rawBody,
  signature
}: {
  notificationUrl: string;
  rawBody: string;
  signature: string | null;
}) {
  const { webhookSignatureKey } = getSquareConfig();
  if (!webhookSignatureKey || !signature) return false;
  const hmac = crypto.createHmac("sha256", webhookSignatureKey);
  hmac.update(notificationUrl + rawBody);
  const expected = hmac.digest("base64");
  if (Buffer.byteLength(expected) !== Buffer.byteLength(signature)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
