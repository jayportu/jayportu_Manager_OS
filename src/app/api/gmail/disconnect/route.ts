/**
 * POST /api/gmail/disconnect
 *
 * Borra la conexión Gmail del user actual.
 * No revoca el token en Google (eso lo hace el user manualmente en
 * https://myaccount.google.com/permissions si quiere).
 */
import { deleteGmailConnection } from "@/lib/gmail/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await deleteGmailConnection();
    return NextResponse.redirect(
      new URL("/gmail", process.env.NEXT_PUBLIC_SITE_URL || "https://jayportu-manager-os.vercel.app"),
      { status: 303 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
