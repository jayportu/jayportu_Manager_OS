/**
 * Sprint 23.5 — Endpoint público que recibe el form de solicitud beta.
 *
 * Protecciones:
 *   - Honeypot: campo "website" oculto. Bots lo llenan, humanos no.
 *   - Rate limit: 3 solicitudes por IP cada 15 minutos.
 *   - Anti-duplicate: misma email en últimos 30 días → rechazo.
 *   - Sanitización + truncado de strings en la query.
 *
 * No requiere auth (es público). Por eso usa service_role en la query.
 */

import { NextResponse } from "next/server";
import { createBetaRequest, approveAndInviteBetaRequest } from "@/lib/queries/beta";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  // Honeypot: el campo "website" debe estar vacío
  if (typeof body.website === "string" && body.website.length > 0) {
    // Devolvemos OK para no alertar al bot, pero no insertamos nada
    return NextResponse.json({ ok: true, id: "honeypot" });
  }

  // Rate limit por IP — 3 solicitudes cada 15 min (anti-spam fuerte)
  const limit = rateLimit(req, {
    key: "beta-signup",
    max: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Espera unos minutos." },
      { status: 429 }
    );
  }

  // IP para guardar como audit trail en beta_requests
  const ip =
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // CAPTCHA (Turnstile). Dormido sin TURNSTILE_SECRET_KEY (verify → skipped).
  const captcha = await verifyTurnstile(
    typeof body.captcha_token === "string" ? body.captcha_token : undefined,
    ip
  );
  if (!captcha.ok) {
    return NextResponse.json(
      { ok: false, error: "Verificación anti-bot fallida. Recarga e intenta de nuevo." },
      { status: 400 }
    );
  }

  // Validación de campos requeridos
  const artistName = typeof body.artist_name === "string" ? body.artist_name : "";
  const email = typeof body.email === "string" ? body.email : "";
  if (!artistName.trim() || !email.trim()) {
    return NextResponse.json(
      { ok: false, error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  // Geners puede venir como string "techno, house" o array
  let genres: string[] = [];
  if (Array.isArray(body.genres)) {
    genres = (body.genres as unknown[])
      .filter((g): g is string => typeof g === "string")
      .map((g) => g.trim())
      .filter(Boolean);
  } else if (typeof body.genres === "string") {
    genres = body.genres
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }

  const result = await createBetaRequest({
    artist_name: artistName,
    email,
    instagram: typeof body.instagram === "string" ? body.instagram : "",
    city: typeof body.city === "string" ? body.city : "",
    genres,
    motivation: typeof body.motivation === "string" ? body.motivation : "",
    ip_address: ip !== "unknown" ? ip : undefined,
    user_agent: req.headers.get("user-agent") || "",
  });

  if ("error" in result) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 }
    );
  }

  // Auto-aprobación "same-day" (flag, default OFF). La solicitud ya pasó
  // honeypot + Turnstile + dedup + rate-limit: ese es el filtro anti-spam (la
  // "revisión ligera"). Reusa approveAndInviteBetaRequest → MISMO path de envío
  // que el botón admin (no update directo a DB, para no saltarse el correo).
  // Para volver a revisión manual: dejar BETA_AUTO_APPROVE_ENABLED sin "true".
  let autoApproved = false;
  if (process.env.BETA_AUTO_APPROVE_ENABLED === "true") {
    try {
      const inv = await approveAndInviteBetaRequest(result.id);
      autoApproved = inv.ok && inv.email_sent;
    } catch {
      // best-effort: si falla, queda como solicitud normal para revisión manual
    }
  }
  return NextResponse.json({ ok: true, id: result.id, autoApproved });
}
