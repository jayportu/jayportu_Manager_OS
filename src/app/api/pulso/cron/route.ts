/**
 * Cron — digest semanal del pulso de beta a Jaime + Fer.
 * Protegido por CRON_SECRET (Authorization: Bearer). Público en middleware.
 *
 * DORMIDO hasta configurar `PULSO_DIGEST_TO` (lista de correos separada por
 * comas) en Vercel. Sin destinatarios corre en dry-run: devuelve el pulso pero
 * no manda nada. ?dry=1 fuerza simulación.
 */
import { NextResponse } from "next/server";
import { getPulso } from "@/lib/queries/pulso";
import { safeEqual } from "@/lib/cron-auth";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import { wrapEmail, ctaButton } from "@/lib/email/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (!safeEqual(req.headers.get("authorization") || "", `Bearer ${expected}`)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const recipients = (process.env.PULSO_DIGEST_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
  const forceDry = new URL(req.url).searchParams.get("dry") === "1";
  const p = await getPulso(7);
  const dryRun = forceDry || recipients.length === 0 || !isResendConfigured();

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, recipients: recipients.length, pulso: p });
  }

  const row = (label: string, value: number | string) =>
    `<tr><td style="padding:4px 0;font-size:14px;color:#6B675F;">${label}</td><td style="padding:4px 0;font-size:14px;font-weight:700;text-align:right;color:#0A0A0A;">${value}</td></tr>`;
  const html = wrapEmail({
    title: "Pulso de beta · últimos 7 días",
    preheader: `+${p.newDjs} DJs · ${p.newOnboarded} completaron perfil · ${p.newBookers} bookers`,
    content:
      `<p style="font-size:15px;line-height:1.5;">Resumen de la semana en DROP.</p>` +
      `<p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9A958B;margin:18px 0 4px;">Embudo de oferta (acumulado)</p>` +
      `<table style="width:100%;border-collapse:collapse;">${row("Aprobados", p.approved)}${row("Registrados", p.registered)}${row("Perfil completo", p.onboarded)}${row("Con evento público", p.withEvent)}</table>` +
      `<p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9A958B;margin:18px 0 4px;">Esta semana</p>` +
      `<table style="width:100%;border-collapse:collapse;">${row("DJs nuevos", p.newDjs)}${row("Completaron perfil", p.newOnboarded)}${row("Bookers nuevos", p.newBookers)}${row("Solicitudes (bookings)", p.bookings)}${row("Pitches a venues", p.pitches)}${row("Favoritos guardados", p.favorites)}${row("RSVPs de fans", p.rsvps)}</table>` +
      `<p style="margin:24px 0;">${ctaButton("Ver el pulso completo", `${SITE}/admin/pulso`)}</p>`,
    footerReason: "Recibes este resumen porque administras DROP.",
  });

  let sent = 0;
  for (const to of recipients) {
    const res = await sendEmail({
      to,
      subject: `Pulso DROP · +${p.newDjs} DJs, ${p.newOnboarded} perfiles, ${p.newBookers} bookers`,
      html,
      text: `Pulso 7d — Embudo: aprobados ${p.approved} → registrados ${p.registered} → perfil completo ${p.onboarded} → con evento ${p.withEvent}. Esta semana: +${p.newDjs} DJs, ${p.newOnboarded} perfiles, ${p.newBookers} bookers, ${p.bookings} solicitudes. Detalle: ${SITE}/admin/pulso`,
    });
    if (res.ok) sent++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return NextResponse.json({ ok: true, dryRun: false, sent, recipients: recipients.length });
}
