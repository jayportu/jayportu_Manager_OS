/**
 * POST /api/push/unsubscribe
 *
 * Borra la subscription de la DB para el user logueado + endpoint dado.
 */
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Body {
  endpoint: string;
}

export async function POST(request: Request) {
  const limit = rateLimit(request, { key: "push-unsubscribe", max: 30, windowMs: 60_000 });
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

  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint requerido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
