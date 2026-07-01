/**
 * GET /api/gmail/callback?code=...&state=...
 *
 * Recibe el redirect de Google, valida state, intercambia code por tokens,
 * obtiene email del user, guarda en gmail_connections, redirige a /gmail.
 */
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from "@/lib/gmail/oauth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errParam = searchParams.get("error");

  if (errParam) {
    return NextResponse.redirect(
      new URL(`/gmail?error=${encodeURIComponent(errParam)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/gmail?error=missing_params", request.url)
    );
  }

  // Validar state CSRF
  const cookieStore = await cookies();
  const storedState = cookieStore.get("gmail_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/gmail?error=invalid_state", request.url)
    );
  }
  cookieStore.delete("gmail_oauth_state");

  // Auth user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const userinfo = await getGoogleUserInfo(tokens.access_token);

    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Upsert (en caso de reconectar). Tokens OAuth → se escriben con
    // service_role; la migración 0056 quitó las policies que los exponían al
    // cliente (ver nota en lib/gmail/client.ts).
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { encryptToken } = await import("@/lib/gmail/token-crypto");
    const admin = createAdminClient();
    const { error } = await admin
      .from("gmail_connections")
      .upsert({
        user_id: user.id,
        google_email: userinfo.email,
        access_token: encryptToken(tokens.access_token),
        refresh_token: encryptToken(tokens.refresh_token || ""),
        scope: tokens.scope,
        token_type: tokens.token_type,
        expires_at: expiresAt,
      });

    if (error) {
      console.error("upsert gmail_connections error:", error);
      return NextResponse.redirect(
        new URL("/gmail?error=db_error", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/gmail?connected=1", request.url)
    );
  } catch (e) {
    console.error("Gmail callback error:", e);
    return NextResponse.redirect(
      new URL(
        `/gmail?error=${encodeURIComponent(
          e instanceof Error ? e.message : "unknown"
        )}`,
        request.url
      )
    );
  }
}
