/**
 * Descarga de adjuntos entrantes. Pide a Resend una URL firmada fresca
 * (expira) y redirige a ella — así no guardamos el archivo ni gastamos egress.
 * Gateado: middleware exige sesión + assertAdmin valida que sea admin.
 */
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/queries/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ rid: string; aid: string }> }
) {
  await assertAdmin();
  const { rid, aid } = await params;

  // Los IDs de Resend son alfanuméricos con guiones. Cualquier otro caracter
  // (/, ., %) permitiría alterar el path del fetch al API.
  const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
  if (!ID_RE.test(rid) || !ID_RE.test(aid)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.resend.com/emails/receiving/${rid}/attachments/${aid}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
        "User-Agent": "drop-inbox",
      },
    }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "adjunto no disponible" }, { status: 404 });
  }
  const data = (await res.json()) as { download_url?: string };
  if (!data.download_url) {
    return NextResponse.json({ error: "sin url" }, { status: 404 });
  }
  return NextResponse.redirect(data.download_url);
}
