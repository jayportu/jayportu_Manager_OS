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
import { createBetaRequest } from "@/lib/queries/beta";

// In-memory rate limit por IP (mejor que nada para Vercel serverless,
// aunque cada instancia tiene su propio Map). Para producción seria
// migrar a Upstash Redis o tabla rate_limits en Supabase.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX = 3;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const past = rateLimitMap.get(ip) || [];
  const recent = past.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

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

  // Rate limit por IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Espera unos minutos." },
      { status: 429 }
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
  return NextResponse.json({ ok: true, id: result.id });
}
