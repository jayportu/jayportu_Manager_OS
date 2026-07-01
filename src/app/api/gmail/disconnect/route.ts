/**
 * POST /api/gmail/disconnect
 *
 * Borra la conexión Gmail del user actual y REVOCA el token en Google
 * (best-effort, dentro de deleteGmailConnection) para que no quede válido.
 */
import { deleteGmailConnection } from "@/lib/gmail/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Anti-CSRF: el POST que muta debe ser same-origin. Comparamos el host del
  // header Origin (lo setea el navegador, no spoofeable cross-site) contra el
  // Host real del request → env-independiente (sirve en local y prod).
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Origen inválido" }, { status: 403 });
    }
  }
  try {
    await deleteGmailConnection();
    return NextResponse.redirect(
      new URL("/gmail", process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com"),
      { status: 303 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
