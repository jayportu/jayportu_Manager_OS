/**
 * Sprint 21 — Endpoint para testear el webhook de auto-post.
 *
 * Recibe { url } del cliente y hace POST con un payload de muestra al
 * webhook indicado. Responde { ok, status } o { ok: false, error }.
 *
 * Se llama desde /configuracion al apretar "Probar webhook".
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafePublicHttpUrlResolved } from "@/lib/url-guard";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const url = (body.url || "").trim();
  if (!url) {
    return NextResponse.json({ ok: false, error: "Falta url" }, { status: 400 });
  }
  // Anti-SSRF: solo permitimos endpoints HTTP(S) públicos. Sin esto, un usuario
  // logueado podía hacer que el server POSTeara a localhost, IPs internas o la
  // metadata de cloud (169.254.169.254) y usar la respuesta como port-scanner.
  // Resuelve DNS y valida la IP final (cierra DNS rebinding).
  if (!(await isSafePublicHttpUrlResolved(url))) {
    return NextResponse.json(
      { ok: false, error: "URL inválida o no permitida" },
      { status: 400 }
    );
  }

  const samplePayload = {
    event: "test.ping",
    sent_at: new Date().toISOString(),
    dj: { user_id: user.id, artist_name: "Sample DJ", city: "Santiago" },
    tracklist: {
      id: "test-tracklist-id",
      title: "Set de prueba",
      venue: "Club Test",
      event_date: new Date().toISOString().slice(0, 10),
      total_tracks: 3,
      bpm_avg: 128,
      duration_minutes: 54,
    },
    tracks: [
      { n: 1, artist: "Test Artist 1", title: "Track 1", label: "", bpm: 126, tag: "intro" },
      { n: 2, artist: "Test Artist 2", title: "Track 2", label: "Test Label", bpm: 130, tag: "peak" },
      { n: 3, artist: "Test Artist 3", title: "Track 3", label: "", bpm: 128, tag: "closer" },
    ],
    soundcloud_text:
      "// Sample DJ @ Club Test\n01. Test Artist 1 — Track 1 [INTRO]\n02. Test Artist 2 — Track 2 (Test Label) [PEAK]\n03. Test Artist 3 — Track 3 [CLOSER]\n// powered by dropgigs.com",
    presskit_url: "https://dropgigs.com/p/test",
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(samplePayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error de red";
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
