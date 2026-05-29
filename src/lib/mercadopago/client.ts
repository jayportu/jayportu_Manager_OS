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
