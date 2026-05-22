/**
 * GET /api/gmail/auth
 *
 * Inicia OAuth flow con Google.
 * - Genera state CSRF y lo guarda en cookie httpOnly
 * - Redirige a la pantalla de consent de Google
 */
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/gmail/oauth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error:
          "Gmail no está configurado en el servidor. Falta GOOGLE_CLIENT_ID/SECRET.",
      },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 min
    path: "/",
  });

  try {
    const url = buildAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
