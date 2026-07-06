import "server-only";

import { INK, ORANGE, MUTED, BORDER, FONT_MONO, wrapEmail, ctaButton, safeUrl, escapeHtml } from "./_shared";


// ---------------------------------------------------------------------------
// 4. Bug Fix Followup
// ---------------------------------------------------------------------------

export function bugFixFollowupEmailHtml(input: {
  artistName: string;
  bugTitle: string;
  fixSummary: string;
  checkPoints: Array<{ label: string; url: string }>;
  dashboardUrl: string;
}): string {
  const points = input.checkPoints
    .map(
      (p) => `
                <li style="margin:0 0 10px 0;">
                  <strong>${escapeHtml(p.label)}</strong><br/>
                  <a href="${safeUrl(p.url)}" style="color:${INK}; text-decoration:underline; font-size:13px;">${escapeHtml(p.url)}</a>
                </li>`
    )
    .join("");

  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.artistName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Antes que nada, <strong>gracias por avisar del problema con ${escapeHtml(input.bugTitle)}</strong>. Reportes así son lo que más me ayuda a mejorar DROP durante esta beta.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                ${escapeHtml(input.fixSummary)}
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">
                Te invito a chequear que todo se vea como esperas en estos lugares:
              </p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                ${points}
              </ol>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Si algo todavía no calza, respondes este correo y lo seguimos puliendo. Cualquier feedback adicional es bienvenido.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Abrir DROP", input.dashboardUrl)}
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: `Tu reporte: ${input.bugTitle}`,
    preheader: `Gracias por avisar. Tu reporte ya tiene una respuesta — chequéalo.`,
    content,
    footerReason:
      "Recibes este correo porque reportaste un bug en la beta de DROP. y queremos cerrarte el loop. Si prefieres no recibir más, respondes \"unsubscribe\".",
  });
}


export function bugFixFollowupEmailText(input: {
  artistName: string;
  bugTitle: string;
  fixSummary: string;
  checkPoints: Array<{ label: string; url: string }>;
  dashboardUrl: string;
}): string {
  const points = input.checkPoints
    .map((p, i) => `${i + 1}. ${p.label} — ${p.url}`)
    .join("\n");
  return `Hola ${input.artistName},

Antes que nada, gracias por avisar del problema con ${input.bugTitle}. Reportes así son lo que más me ayuda a mejorar DROP durante esta beta.

${input.fixSummary}

Te invito a chequear que todo se vea como esperas en estos lugares:

${points}

Si algo todavía no calza, respondes este correo y lo seguimos puliendo. Cualquier feedback adicional es bienvenido.

Abrir DROP: ${input.dashboardUrl}

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque reportaste un bug en la beta. Si no quieres más, respondes "unsubscribe".`;
}


// ---------------------------------------------------------------------------
// 13. Digest admin semanal — reporte operacional para el equipo DROP.
// ---------------------------------------------------------------------------

export function weeklyDigestAdminEmailHtml(input: {
  weekLabel: string;
  newDjs: number;
  pendingRequests: number;
  totalBookings: number;
  activeUsers: number;
  adminUrl: string;
}): string {
  const { weekLabel, newDjs, pendingRequests, totalBookings, activeUsers, adminUrl } = input;
  const requestsColor = pendingRequests > 5 ? ORANGE : INK;
  const content = `
              <p style="font-size:11px; color:${MUTED}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 20px 0;">DROP. Admin · Semana ${escapeHtml(weekLabel)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER}; border-radius:4px; margin:0 0 20px 0;">
                <tr>
                  <td align="center" style="padding:18px 8px; border-right:1px solid ${BORDER}; border-bottom:1px solid ${BORDER}; width:50%;">
                    <div style="font-size:28px; font-weight:700; font-family:${FONT_MONO}; color:${INK}; line-height:1;">${newDjs}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">DJs nuevos</div>
                  </td>
                  <td align="center" style="padding:18px 8px; border-bottom:1px solid ${BORDER}; width:50%;">
                    <div style="font-size:28px; font-weight:700; font-family:${FONT_MONO}; color:${requestsColor}; line-height:1;">${pendingRequests}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Solicitudes pendientes</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:18px 8px; border-right:1px solid ${BORDER}; width:50%;">
                    <div style="font-size:28px; font-weight:700; font-family:${FONT_MONO}; color:${INK}; line-height:1;">${totalBookings}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Bookings semana</div>
                  </td>
                  <td align="center" style="padding:18px 8px; width:50%;">
                    <div style="font-size:28px; font-weight:700; font-family:${FONT_MONO}; color:${INK}; line-height:1;">${activeUsers}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Usuarios activos</div>
                  </td>
                </tr>
              </table>
              ${pendingRequests > 0 ? `<p style="font-size:14px; color:${requestsColor}; margin:0 0 20px 0;"><strong>${pendingRequests} solicitud${pendingRequests > 1 ? "es" : ""}</strong> esperando aprobación manual.</p>` : ""}
              <p style="margin:0;">${ctaButton("Ir al admin", adminUrl)}</p>`;
  return wrapEmail({
    title: `DROP. Admin — Semana ${weekLabel}`,
    preheader: `${newDjs} DJs nuevos · ${pendingRequests} solicitudes pendientes · ${totalBookings} bookings.`,
    content,
    footerReason: "Reporte operacional automático de DROP. para el equipo interno.",
  });
}


export function weeklyDigestAdminEmailText(input: {
  weekLabel: string;
  newDjs: number;
  pendingRequests: number;
  totalBookings: number;
  activeUsers: number;
  adminUrl: string;
}): string {
  const { weekLabel, newDjs, pendingRequests, totalBookings, activeUsers, adminUrl } = input;
  return [
    `DROP. Admin — Semana ${weekLabel}`,
    "",
    `DJs nuevos: ${newDjs}`,
    `Solicitudes pendientes: ${pendingRequests}`,
    `Bookings esta semana: ${totalBookings}`,
    `Usuarios activos: ${activeUsers}`,
    "",
    `Panel admin: ${adminUrl}`,
    "",
    "--",
    "Reporte operacional de DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 21. Operaciones: Error spike — alerta admin
// ---------------------------------------------------------------------------

export function adminErrorSpikeEmailHtml(input: {
  errorCount: number;
  windowLabel: string;
  adminUrl: string;
}): string {
  const { errorCount, windowLabel, adminUrl } = input;
  const color = errorCount > 50 ? "#D93025" : ORANGE;
  const content = `
              <p style="font-size:11px; color:${color}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Alerta de errores</p>
              <p style="font-size:26px; font-weight:700; color:${INK}; margin:0 0 20px 0;">
                ${errorCount} errores en ${escapeHtml(windowLabel)}
              </p>
              <p style="font-size:15px; color:${MUTED}; margin:0 0 24px 0;">
                Se detectó un aumento inusual de errores en producción.
                Revisa los logs para identificar la causa.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver logs en Vercel", adminUrl)}</p>
              <p style="font-size:13px; color:${MUTED}; margin:0;">
                Este alerta se dispara automáticamente cuando hay más de 20 errores en 1 hora.
              </p>`;
  return wrapEmail({
    title: `Alerta: ${errorCount} errores detectados`,
    preheader: `${errorCount} errores en ${windowLabel} — revisar logs.`,
    content,
    footerReason: "Reporte automático de DROP. (dropgigs.com).",
  });
}


export function adminErrorSpikeEmailText(input: {
  errorCount: number;
  windowLabel: string;
  adminUrl: string;
}): string {
  const { errorCount, windowLabel, adminUrl } = input;
  return [
    `ALERTA: ${errorCount} errores en ${windowLabel}`,
    "",
    "Se detectó un aumento inusual de errores en producción.",
    "Revisa los logs para identificar la causa.",
    "",
    `Logs Vercel: ${adminUrl}`,
    "",
    "--",
    "Reporte automático de DROP. (dropgigs.com).",
  ].join("\n");
}
