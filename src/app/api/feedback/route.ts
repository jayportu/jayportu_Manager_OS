/**
 * Sprint 23.5 — Endpoint que recibe el feedback del widget flotante.
 *
 * Valida sesión, sube el screenshot (si viene) a Supabase Storage en el
 * bucket `feedback-screenshots`, persiste el reporte en feedback_reports.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createFeedbackReport } from "@/lib/queries/beta";
import { rateLimit } from "@/lib/rate-limit";
import type { FeedbackKind } from "@/types/database";

const BUCKET = "feedback-screenshots";

export async function POST(req: Request) {
  const limit = rateLimit(req, { key: "feedback", max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  const kind = (typeof body.kind === "string" ? body.kind : "otro") as FeedbackKind;
  const description =
    typeof body.description === "string" ? body.description : "";
  if (!description.trim()) {
    return NextResponse.json(
      { ok: false, error: "Falta descripción" },
      { status: 400 }
    );
  }
  const pageUrl = typeof body.page_url === "string" ? body.page_url : "";
  const userAgent =
    typeof body.user_agent === "string" ? body.user_agent : "";
  const dataUrl =
    typeof body.screenshot_data_url === "string"
      ? body.screenshot_data_url
      : null;

  // Subir screenshot si viene.
  //
  // Security 2026-06-01: el bucket feedback-screenshots ahora es PRIVADO
  // (un bug report podría tener tokens/datos del CRM visibles en pantalla
  // y antes la URL pública era accesible por cualquiera con el path).
  // Guardamos sólo el storage path interno (ej. "USER/123.jpg") en
  // screenshot_url. El admin/feedback genera signed URLs on-the-fly via
  // listFeedbackReports() en src/lib/queries/beta.ts.
  let screenshotPath = "";
  if (dataUrl && dataUrl.startsWith("data:image/")) {
    try {
      // data:image/jpeg;base64,XXXX...
      // Allowlist explícita de MIME (auditoría 2026-06-18): solo png/jpeg/webp.
      // El bucket es privado y se sirve por signed URL, pero acotar el tipo evita
      // guardar formatos inesperados (ej. svg) desde un cliente manipulado.
      const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const ext = mime.split("/")[1] || "jpg";
        const buf = Buffer.from(match[2], "base64");
        // Limit 800kb post-compresión
        if (buf.length > 800 * 1024) {
          return NextResponse.json(
            { ok: false, error: "Screenshot muy grande tras comprimir." },
            { status: 400 }
          );
        }
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, buf, { contentType: mime, upsert: false });
        if (!upErr) {
          screenshotPath = path;
        }
        // Si falla el upload (ej: bucket no existe) seguimos sin screenshot
      }
    } catch {
      // ignorar — feedback es más importante que el screenshot
    }
  }

  try {
    await createFeedbackReport({
      kind,
      description,
      page_url: pageUrl,
      user_agent: userAgent,
      screenshot_url: screenshotPath, // ahora guarda path interno, no URL pública
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // No filtrar detalle interno (schema/Postgres) al cliente; loguear server-side.
    console.error("[feedback] createFeedbackReport failed:", e);
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar el feedback." },
      { status: 500 }
    );
  }
}
