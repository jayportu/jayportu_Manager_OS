import "server-only";

/**
 * BL-08 — Registro append-only de consentimientos (tabla user_consents, 0075).
 *
 * Guarda una fila inmutable por cada aceptación de ToS/Privacidad, con versión,
 * fecha, IP y user-agent (evidencia demostrable). Best-effort: si algo falla NO
 * rompe el flujo que lo llama (el consentimiento "de última" ya queda en
 * tos_accepted_at/tos_version; esto es el histórico defensivo).
 */

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function clientIpFrom(h: Headers): string | null {
  // Mismo orden que rate-limit.ts: cf-connecting-ip (real detrás de Cloudflare)
  // → x-forwarded-for → x-real-ip.
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export async function recordConsent(input: {
  userId: string;
  version: string;
  source: string;
  docType?: string;
}): Promise<void> {
  try {
    const h = await headers();
    const ip = clientIpFrom(h);
    const userAgent = (h.get("user-agent") || "").slice(0, 400);
    const supabase = await createClient();
    const { error } = await supabase.from("user_consents").insert({
      user_id: input.userId,
      doc_type: input.docType ?? "tos_privacy",
      version: input.version,
      source: input.source,
      ip,
      user_agent: userAgent,
    });
    if (error) console.error("recordConsent insert error:", error);
  } catch (e) {
    console.error("recordConsent:", e);
  }
}
