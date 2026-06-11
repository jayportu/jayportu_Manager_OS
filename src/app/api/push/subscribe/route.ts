/**
 * POST /api/push/subscribe
 *
 * Guarda la PushSubscription del navegador para el user logueado.
 * Idempotente: si ya existe (user_id, endpoint), actualiza p256dh/auth.
 */
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Body {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  user_agent?: string;
}

export async function POST(request: Request) {
  const limit = rateLimit(request, { key: "push-subscribe", max: 30, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { endpoint, keys } = body.subscription || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "subscription incompleta" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: body.user_agent?.slice(0, 500) || "",
      last_used_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
