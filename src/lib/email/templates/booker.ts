import "server-only";

import { INK, CREAM, ORANGE, MUTED, BORDER, FONT_MONO, wrapEmail, ctaButton, escapeHtml } from "./_shared";


// ---------------------------------------------------------------------------
// 20. Operaciones: Nuevo booker — email de bienvenida
// ---------------------------------------------------------------------------

export function bookerBienvenidaEmailHtml(input: {
  bookerName: string;
  searchUrl: string;
}): string {
  const { bookerName, searchUrl } = input;
  const pasos = [
    ["Busca tu DJ", "Filtra por estilo, ciudad y disponibilidad."],
    ["Envía una solicitud", "Sin compromiso. El DJ te cotiza directamente."],
    ["Confirma y listo", "Coordinen los detalles y el evento está agendado."],
  ];
  const pasosHtml = pasos.map(([title, desc], i) => `
    <tr>
      <td style="padding:14px 0; border-bottom:1px solid ${BORDER}; vertical-align:top;">
        <span style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; font-weight:700; margin-right:8px;">0${i + 1}</span>
        <strong style="font-size:14px; color:${INK};">${title}</strong>
        <p style="font-size:13px; color:${MUTED}; margin:4px 0 0 0;">${desc}</p>
      </td>
    </tr>`).join("");
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(bookerName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Bienvenido a DROP<span style="color:${ORANGE};">.</span> — la forma más directa de contratar DJs en Chile.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                ${pasosHtml}
              </table>
              <p style="margin:0 0 24px 0;">${ctaButton("Buscar DJs", searchUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Bienvenido a DROP. — encuentra tu DJ",
    preheader: "Contrata DJs en Chile de forma directa y sin intermediarios.",
    content,
    footerReason: "Recibes este mensaje porque creaste una cuenta en DROP. (dropgigs.com).",
  });
}


export function bookerBienvenidaEmailText(input: {
  bookerName: string;
  searchUrl: string;
}): string {
  const { bookerName, searchUrl } = input;
  return [
    `Hola ${bookerName},`,
    "",
    "Bienvenido a DROP. — la forma más directa de contratar DJs en Chile.",
    "",
    "Cómo funciona:",
    "01. Busca tu DJ — filtra por estilo, ciudad y disponibilidad.",
    "02. Envía una solicitud — sin compromiso. El DJ te cotiza directamente.",
    "03. Confirma y listo — coordinen los detalles y el evento está agendado.",
    "",
    `Buscar DJs: ${searchUrl}`,
    "",
    "--",
    "Recibes este mensaje porque creaste una cuenta en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 22. Booking: booker no responde cotización en 3 días
// ---------------------------------------------------------------------------

export function bookerNoRespondeEmailHtml(input: {
  djArtistName: string;
  bookerName: string;
  sentAtLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, bookerName, sentAtLabel, dashboardUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Enviaste tu cotización a <strong>${escapeHtml(bookerName)}</strong> el ${escapeHtml(sentAtLabel)}
                y todavía no hay respuesta.
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                A veces un mensaje directo hace la diferencia. Si tienes su contacto, este es buen momento para hacer un seguimiento.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver el booking", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `${bookerName} aún no respondió tu cotización`,
    preheader: "Llevas 3 días esperando respuesta. Puede ser momento de hacer seguimiento.",
    content,
    footerReason: "Recibes este aviso porque tienes un booking pendiente en DROP. (dropgigs.com).",
  });
}


export function bookerNoRespondeEmailText(input: {
  djArtistName: string;
  bookerName: string;
  sentAtLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, bookerName, sentAtLabel, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Enviaste tu cotización a ${bookerName} el ${sentAtLabel} y todavía no hay respuesta.`,
    "Si tienes su contacto, este es buen momento para hacer un seguimiento directo.",
    "",
    `Ver el booking: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este aviso porque tienes un booking pendiente en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 28. Press kit: booker guardó tu perfil en favoritos
// ---------------------------------------------------------------------------

export function bookerFavoritoEmailHtml(input: {
  djArtistName: string;
  profileUrl: string;
}): string {
  const { djArtistName, profileUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Alguien guardó tu perfil en favoritos. Están evaluando DJs para un evento.
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Este es buen momento para asegurarte de que tu press kit esté actualizado.
                Los bookers comparan varios perfiles antes de decidir.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver mi press kit", profileUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Alguien guardó tu perfil",
    preheader: "Un booker te tiene en su lista. Asegúrate de que tu perfil esté al día.",
    content,
    footerReason: "Recibes este aviso porque tienes una cuenta activa en DROP. (dropgigs.com).",
  });
}


export function bookerFavoritoEmailText(input: {
  djArtistName: string;
  profileUrl: string;
}): string {
  const { djArtistName, profileUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Alguien guardó tu perfil en favoritos. Están evaluando DJs para un evento.",
    "Buen momento para revisar que tu press kit esté actualizado.",
    "",
    `Ver mi press kit: ${profileUrl}`,
    "",
    "--",
    "Recibes este aviso porque tienes una cuenta activa en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 31. Retención booker: sin booking enviado en 7 días
// ---------------------------------------------------------------------------

export function bookerSinBookingEmailHtml(input: {
  bookerName: string;
  searchUrl: string;
}): string {
  const { bookerName, searchUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(bookerName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Llevas una semana en DROP. y todavía no enviaste ninguna solicitud.
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 20px 0;">
                Enviar una solicitud no tiene costo ni compromiso — el DJ te cotiza directamente
                y tú decides si seguir o no.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 28px 0;">
                <p style="font-size:13px; color:${MUTED}; margin:0 0 4px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Tip</p>
                <p style="font-size:14px; color:${INK}; margin:0;">
                  Filtra por ciudad y género para encontrar el DJ ideal para tu evento.
                </p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Buscar DJs", searchUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "¿Todavía buscando DJ?",
    preheader: "Enviar una solicitud no tiene costo. El DJ te cotiza directo.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}


export function bookerSinBookingEmailText(input: {
  bookerName: string;
  searchUrl: string;
}): string {
  const { bookerName, searchUrl } = input;
  return [
    `Hola ${bookerName},`,
    "",
    "Llevas una semana en DROP. y todavía no enviaste ninguna solicitud.",
    "Enviar una solicitud no tiene costo ni compromiso — el DJ te cotiza directamente.",
    "",
    `Buscar DJs: ${searchUrl}`,
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 34. Booker inactivo 30d sin booking — win-back
// ---------------------------------------------------------------------------

export function bookerInactivo30dEmailHtml(input: {
  bookerName: string;
  searchUrl: string;
}): string {
  const { bookerName, searchUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(bookerName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Han pasado 30 días desde que te registraste en DROP. y todavía no
                has enviado ninguna solicitud de booking.
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 20px 0;">
                Quizás no encontraste el DJ que buscabas, o el evento se pospuso,
                o simplemente no tuviste tiempo. Lo entendemos.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 28px 0;">
                <p style="font-size:13px; color:${MUTED}; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">DJs disponibles ahora</p>
                <p style="font-size:14px; color:${INK}; margin:0;">
                  Nuevos perfiles se suman cada semana. Filtra por ciudad, género y
                  disponibilidad para encontrar exactamente lo que necesitas.
                </p>
              </div>
              <p style="margin:0 0 28px 0;">${ctaButton("Ver DJs disponibles", searchUrl)}</p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Enviar una solicitud es gratis y sin compromiso — el DJ te cotiza
                y tú decides.
              </p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "¿Sigues buscando DJ?",
    preheader: "Nuevos DJs disponibles. Sin costo ni compromiso para cotizar.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}


export function bookerInactivo30dEmailText(input: {
  bookerName: string;
  searchUrl: string;
}): string {
  const { bookerName, searchUrl } = input;
  return [
    `Hola ${bookerName},`,
    "",
    "Han pasado 30 días desde que te registraste en DROP. y todavía no has enviado ninguna solicitud.",
    "",
    "Quizás no encontraste el DJ que buscabas, o el evento se pospuso. Lo entendemos.",
    "",
    "Nuevos perfiles se suman cada semana. Filtra por ciudad, género y disponibilidad.",
    "",
    `Ver DJs disponibles: ${searchUrl}`,
    "",
    "Enviar una solicitud es gratis y sin compromiso — el DJ te cotiza y tú decides.",
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  ].join("\n");
}
