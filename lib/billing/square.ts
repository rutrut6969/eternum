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

export function buildSquareOneTimePaymentLinkBody({
  locationId,
  name,
  amountCents,
  redirectUrl,
  metadata
}: {
  locationId: string;
  name: string;
  amountCents: number;
  redirectUrl: string;
  metadata: Record<string, string>;
}) {
  return {
    idempotency_key: crypto.randomUUID(),
    quick_pay: {
      name,
      price_money: { amount: amountCents, currency: "USD" },
      location_id: locationId
    },
    checkout_options: { redirect_url: redirectUrl },
    pre_populated_data: {},
    metadata
  };
}

export function buildSquareSubscriptionCheckoutBody({
  locationId,
  name,
  amountCents,
  redirectUrl,
  subscriptionPlanVariationId,
  metadata
}: {
  locationId: string;
  name: string;
  amountCents: number;
  redirectUrl: string;
  subscriptionPlanVariationId: string;
  metadata: Record<string, string>;
}) {
  return {
    idempotency_key: crypto.randomUUID(),
    quick_pay: {
      name,
      price_money: { amount: amountCents, currency: "USD" },
      location_id: locationId
    },
    checkout_options: {
      redirect_url: redirectUrl,
      subscription_plan_id: subscriptionPlanVariationId
    },
    pre_populated_data: {},
    metadata
  };
}

export async function createSquareOneTimePaymentLink({
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
    body: JSON.stringify(buildSquareOneTimePaymentLinkBody({ locationId: config.locationId!, name, amountCents, redirectUrl, metadata }))
  });
}

export async function createSquareSubscriptionCheckoutLink({
  name,
  amountCents,
  redirectUrl,
  subscriptionPlanVariationId,
  metadata
}: {
  name: string;
  amountCents: number;
  redirectUrl: string;
  subscriptionPlanVariationId: string;
  metadata: Record<string, string>;
}) {
  const config = assertSquareCheckoutConfig();
  return squareRequest<{ payment_link: { id: string; url: string; order_id?: string } }>("/v2/online-checkout/payment-links", {
    method: "POST",
    body: JSON.stringify(
      buildSquareSubscriptionCheckoutBody({
        locationId: config.locationId!,
        name,
        amountCents,
        redirectUrl,
        subscriptionPlanVariationId,
        metadata
      })
    )
  });
}

export const createSquarePaymentLink = createSquareOneTimePaymentLink;

export type SquareSubscriptionResponse = {
  subscription?: {
    id?: string;
    customer_id?: string;
    status?: string;
    charged_through_date?: string;
    canceled_date?: string;
    plan_variation_id?: string;
  };
};

export async function retrieveSquareSubscription(subscriptionId: string) {
  return squareRequest<SquareSubscriptionResponse>(`/v2/subscriptions/${subscriptionId}`, { method: "GET" });
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
