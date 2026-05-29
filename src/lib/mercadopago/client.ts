import "server-only";

/**
 * Sprint S19 — Cliente MercadoPago para server actions y webhooks.
 *
 * SDK oficial v3 (`mercadopago` en npm). Cada resource (PreApproval,
 * Payment, etc.) se instancia con el `MercadoPagoConfig` compartido.
 *
 * Credenciales: MP_ACCESS_TOKEN en .env.local (TEST en dev, PROD en
 * Vercel cuando salgamos a producción). NEXT_PUBLIC_MP_PUBLIC_KEY se
 * expone al cliente para el SDK de tokenización de tarjeta — esa va
 * por separado en src/lib/mercadopago/public.ts.
 *
 * Plan único de DROP. — $10.000 CLP / mes, mensual recurrente.
 */

import {
  MercadoPagoConfig,
  PreApproval,
  Payment,
  Customer,
} from "mercadopago";

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MP_ACCESS_TOKEN no configurado. Agregalo en .env.local (TEST) o en Vercel (PROD)."
    );
  }
  return token;
}

let cachedConfig: MercadoPagoConfig | null = null;

function getConfig(): MercadoPagoConfig {
  if (cachedConfig) return cachedConfig;
  cachedConfig = new MercadoPagoConfig({
    accessToken: getAccessToken(),
    options: {
      timeout: 5000,
    },
  });
  return cachedConfig;
}

/** Cliente para crear/gestionar suscripciones recurrentes (PAT). */
export function mpPreApproval(): PreApproval {
  return new PreApproval(getConfig());
}

/** Cliente para pagos one-shot (modo manual mes-a-mes). */
export function mpPayment(): Payment {
  return new Payment(getConfig());
}

/** Cliente para crear/gestionar customers (asocia card tokens reusables). */
export function mpCustomer(): Customer {
  return new Customer(getConfig());
}

/** Verifica si la API key está configurada (server-side check). */
export function isMpConfigured(): boolean {
  return !!process.env.MP_ACCESS_TOKEN;
}

/** Verifica si el modo TEST (sandbox) está activo. */
export function isMpTestMode(): boolean {
  const token = process.env.MP_ACCESS_TOKEN || "";
  return token.startsWith("TEST-");
}

/**
 * Configuración del plan único de DROP.
 * Si en el futuro hay tiers, esto se vuelve un objeto por plan.
 */
export const MP_PLAN = {
  amountClp: 10_000,
  currency: "CLP" as const,
  frequency: 1,
  frequencyType: "months" as const,
  reason: "DROP. — Suscripción mensual",
} as const;

/**
 * Crea una preapproval (suscripción recurrente) en MP.
 *
 * Doc: https://www.mercadopago.cl/developers/es/reference/subscriptions/_preapproval/post
 *
 * Si el card_token no soporta recurrencia (típicamente RedCompra puro),
 * MP responde con error que capturamos y devolvemos como fallback flag
 * para que el caller ofrezca modo manual.
 */
export interface CreatePreapprovalInput {
  cardTokenId: string;
  payerEmail: string;
  externalReference: string;
  backUrl: string;
}

export interface PreapprovalResult {
  id: string;
  status: string;
  next_payment_date?: string;
  card_id?: string;
  payer_id?: string;
}

export async function createPreapproval(
  input: CreatePreapprovalInput
): Promise<PreapprovalResult> {
  const accessToken = getAccessToken();
  const resp = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: MP_PLAN.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      card_token_id: input.cardTokenId,
      back_url: input.backUrl,
      auto_recurring: {
        frequency: MP_PLAN.frequency,
        frequency_type: MP_PLAN.frequencyType,
        transaction_amount: MP_PLAN.amountClp,
        currency_id: MP_PLAN.currency,
      },
      status: "authorized",
    }),
  });
  const data = (await resp.json()) as PreapprovalResult & {
    message?: string;
    error?: string;
    cause?: Array<{ code?: string; description?: string }>;
  };
  if (!resp.ok) {
    const cause = data.cause?.[0]?.description || data.message || data.error;
    throw new PreapprovalError(
      cause || `MP preapproval falló (HTTP ${resp.status})`,
      data
    );
  }
  return data;
}

export class PreapprovalError extends Error {
  rawResponse: unknown;
  constructor(message: string, rawResponse: unknown) {
    super(message);
    this.name = "PreapprovalError";
    this.rawResponse = rawResponse;
  }
}

/**
 * Lee una preapproval de MP por ID. Usado por el webhook para sync de
 * estado (authorized → active, cancelled → expired, etc).
 */
export async function getPreapproval(
  preapprovalId: string
): Promise<PreapprovalResult & { external_reference?: string; status: string }> {
  const accessToken = getAccessToken();
  const resp = await fetch(
    `https://api.mercadopago.com/preapproval/${preapprovalId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!resp.ok) {
    throw new Error(`MP getPreapproval HTTP ${resp.status}`);
  }
  return (await resp.json()) as PreapprovalResult & { status: string };
}

/**
 * Cancela una preapproval (cuando el user cancela su suscripción).
 * Setea status='cancelled' en MP — ya no se cobrará más.
 */
export async function cancelPreapproval(preapprovalId: string): Promise<void> {
  const accessToken = getAccessToken();
  const resp = await fetch(
    `https://api.mercadopago.com/preapproval/${preapprovalId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    }
  );
  if (!resp.ok) {
    throw new Error(`MP cancelPreapproval HTTP ${resp.status}`);
  }
}

/**
 * Lee un payment de MP por ID. Usado por el webhook cuando recibe
 * notif type='payment'.
 */
export async function getPayment(paymentId: string): Promise<{
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  payment_method_id?: string;
  external_reference?: string;
  metadata?: Record<string, unknown>;
  card?: { last_four_digits?: string };
}> {
  const accessToken = getAccessToken();
  const resp = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!resp.ok) {
    throw new Error(`MP getPayment HTTP ${resp.status}`);
  }
  return await resp.json();
}
