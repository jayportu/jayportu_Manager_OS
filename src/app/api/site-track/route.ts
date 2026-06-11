/**
 * POST /api/site-track — registra un pageview del sitio (anónimo o registrado).
 * Recibe { path, session_id, referrer?, utm_source? }. El flag is_registered lo
 * decide el SERVIDOR mirando la sesión (no se confía en el cliente). Insert vía
 * service_role (visitante anónimo). Alimenta /admin/trafico.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const clip = (s: unknown, n: number): string | null => {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t ? t.slice(0, n) : null;
};

export async function POST(request: Request) {
  const limit = rateLimit(request, { key: "site-track", max: 80, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: {
    path?: string;
    session_id?: string;
    referrer?: string;
    utm_source?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = clip(body.path, 300);
  const sessionId = clip(body.session_id, 80);
  if (!path || !sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // is_registered lo decide el servidor por la sesión (cookie), no el cliente.
  let isRegistered = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isRegistered = !!user;
  } catch {
    /* sin sesión → anónimo */
  }

  const country = clip(request.headers.get("cf-ipcountry"), 4);

  const admin = createAdminClient();
  await admin.from("site_events").insert({
    session_id: sessionId,
    path,
    is_registered: isRegistered,
    referrer: clip(body.referrer, 300),
    utm_source: clip(body.utm_source, 120),
    country,
  });

  return new NextResponse(null, { status: 204 });
}
