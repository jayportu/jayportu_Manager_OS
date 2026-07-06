import "server-only";

import { INK, CREAM, ORANGE, MUTED, BORDER, FONT_MONO, wrapEmail, ctaButton, escapeHtml } from "./_shared";


// ---------------------------------------------------------------------------
// 6. Booking Confirmed — aviso al DJ
// ---------------------------------------------------------------------------

export function bookingConfirmedDjEmailHtml(input: {
  djArtistName: string;
  bookerName: string;
  eventDate: string;
  venue?: string;
  amountClp?: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, bookerName, eventDate, venue, amountClp, dashboardUrl } = input;
  const venueLine = venue
    ? `<p style="font-size:15px; margin:0 0 8px 0;"><strong>Lugar:</strong> ${escapeHtml(venue)}</p>`
    : "";
  const amountLine = amountClp
    ? `<p style="font-size:15px; margin:0 0 0 0;"><strong>Monto:</strong> $${amountClp.toLocaleString("es-CL")} CLP</p>`
    : "";
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">Tienes un evento confirmado. Aquí el resumen:</p>
              <div style="background:#f9f7f4; border:1px solid ${BORDER}; border-radius:4px; padding:16px 20px; margin:0 0 20px 0;">
                <p style="font-size:15px; margin:0 0 8px 0;"><strong>Booker:</strong> ${escapeHtml(bookerName)}</p>
                ${eventDate ? `<p style="font-size:15px; margin:0 0 8px 0;"><strong>Fecha:</strong> ${escapeHtml(eventDate)}</p>` : ""}
                ${venueLine}
                ${amountLine}
              </div>
              <p style="font-size:15px; margin:0 0 24px 0;">${ctaButton("Ver en DROP.", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Suerte con el show,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Evento agendado — ${bookerName}`,
    preheader: `Tienes un show confirmado con ${bookerName}${eventDate ? ` el ${eventDate}` : ""}.`,
    content,
    footerReason: "Recibes este aviso porque administras tu agenda en DROP. (dropgigs.com).",
  });
}


export function bookingConfirmedDjEmailText(input: {
  djArtistName: string;
  bookerName: string;
  eventDate: string;
  venue?: string;
  amountClp?: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, bookerName, eventDate, venue, amountClp, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tienes un evento confirmado:",
    "",
    `Booker: ${bookerName}`,
    eventDate ? `Fecha: ${eventDate}` : "",
    venue ? `Lugar: ${venue}` : "",
    amountClp ? `Monto: $${amountClp.toLocaleString("es-CL")} CLP` : "",
    "",
    `Ver en DROP.: ${dashboardUrl}`,
    "",
    "Suerte con el show,",
    "DROP. Team",
    "",
    "--",
    "DROP. — The DJ OS — Santiago, Chile — dropgigs.com",
    "Recibes este aviso porque administras tu agenda en DROP. (dropgigs.com).",
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");
}


// ---------------------------------------------------------------------------
// 7. Booking Confirmed — aviso al booker
// ---------------------------------------------------------------------------

export function bookingConfirmedBookerEmailHtml(input: {
  bookerName: string;
  djArtistName: string;
  eventDate: string;
  venue?: string;
  pressKitUrl: string;
}): string {
  const { bookerName, djArtistName, eventDate, venue, pressKitUrl } = input;
  const venueLine = venue
    ? `<p style="font-size:15px; margin:0 0 0 0;"><strong>Lugar:</strong> ${escapeHtml(venue)}</p>`
    : "";
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(bookerName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">Tu solicitud fue aceptada. Aquí el resumen de tu evento:</p>
              <div style="background:#f9f7f4; border:1px solid ${BORDER}; border-radius:4px; padding:16px 20px; margin:0 0 20px 0;">
                <p style="font-size:15px; margin:0 0 8px 0;"><strong>DJ:</strong> ${escapeHtml(djArtistName)}</p>
                ${eventDate ? `<p style="font-size:15px; margin:0 0 8px 0;"><strong>Fecha:</strong> ${escapeHtml(eventDate)}</p>` : ""}
                ${venueLine}
              </div>
              <p style="font-size:15px; margin:0 0 16px 0;">Para coordinar los detalles finales, contáctate directamente con el DJ.</p>
              <p style="font-size:15px; margin:0 0 24px 0;">${ctaButton("Ver perfil del DJ", pressKitUrl)}</p>
              <p style="font-size:15px; margin:0;">Saludos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Tu evento con ${djArtistName} está confirmado`,
    preheader: `${djArtistName} aceptó tu solicitud${eventDate ? ` para el ${eventDate}` : ""}.`,
    content,
    footerReason: `Recibes este aviso porque enviaste una solicitud de booking a ${djArtistName} a través de DROP. (dropgigs.com).`,
  });
}


export function bookingConfirmedBookerEmailText(input: {
  bookerName: string;
  djArtistName: string;
  eventDate: string;
  venue?: string;
  pressKitUrl: string;
}): string {
  const { bookerName, djArtistName, eventDate, venue, pressKitUrl } = input;
  return [
    `Hola ${bookerName},`,
    "",
    "Tu solicitud fue aceptada.",
    "",
    `DJ: ${djArtistName}`,
    eventDate ? `Fecha: ${eventDate}` : "",
    venue ? `Lugar: ${venue}` : "",
    "",
    "Para coordinar los detalles finales, contáctate directamente con el DJ.",
    "",
    `Ver perfil del DJ: ${pressKitUrl}`,
    "",
    "Saludos,",
    "DROP. Team",
    "",
    "--",
    "DROP. — The DJ OS — Santiago, Chile — dropgigs.com",
    `Recibes este aviso porque enviaste una solicitud de booking a ${djArtistName} a través de DROP. (dropgigs.com).`,
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");
}


// ---------------------------------------------------------------------------
// 9. Booking sin respuesta — aviso al DJ después de 48h
// ---------------------------------------------------------------------------

export function bookingNoResponseEmailHtml(input: {
  djArtistName: string;
  bookerName: string;
  receivedAtLabel: string;
  dashboardUrl: string;
  venue?: string;
  eventType?: string;
}): string {
  const { djArtistName, bookerName, receivedAtLabel, dashboardUrl, venue, eventType } = input;
  const detailLines = [
    venue ? `<p style="font-size:14px; margin:0 0 6px 0;"><strong>Lugar:</strong> ${escapeHtml(venue)}</p>` : "",
    eventType ? `<p style="font-size:14px; margin:0 0 0 0;"><strong>Tipo:</strong> ${escapeHtml(eventType)}</p>` : "",
  ].join("");
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;"><strong>${escapeHtml(bookerName)}</strong> te envió una solicitud de booking <strong>${escapeHtml(receivedAtLabel)}</strong> y todavía no has respondido.</p>
              <div style="background:#fff8f5; border-left:3px solid ${ORANGE}; padding:14px 16px; margin:0 0 20px 0; border-radius:0 4px 4px 0;">
                <p style="font-size:14px; margin:0 0 6px 0;"><strong>Booker:</strong> ${escapeHtml(bookerName)}</p>
                ${detailLines}
              </div>
              <p style="font-size:15px; margin:0 0 16px 0;">Los bookers suelen contactar a varios DJs en paralelo. Responder rápido aumenta tus chances.</p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver solicitud", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">— DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Tienes una solicitud sin responder — ${bookerName}`,
    preheader: `${bookerName} espera tu respuesta desde ${receivedAtLabel}.`,
    content,
    footerReason: "Recibes este aviso porque administras tu agenda en DROP. (dropgigs.com).",
  });
}


export function bookingNoResponseEmailText(input: {
  djArtistName: string;
  bookerName: string;
  receivedAtLabel: string;
  dashboardUrl: string;
  venue?: string;
  eventType?: string;
}): string {
  const { djArtistName, bookerName, receivedAtLabel, dashboardUrl, venue, eventType } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `${bookerName} te envió una solicitud de booking ${receivedAtLabel} y todavía no has respondido.`,
    "",
    `Booker: ${bookerName}`,
    venue ? `Lugar: ${venue}` : "",
    eventType ? `Tipo: ${eventType}` : "",
    "",
    "Responder rápido aumenta tus chances de conseguir el evento.",
    "",
    `Ver solicitud: ${dashboardUrl}`,
    "",
    "— DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}


// ---------------------------------------------------------------------------
// 11. Primer booking recibido — celebración
// ---------------------------------------------------------------------------

export function firstBookingReceivedEmailHtml(input: {
  djArtistName: string;
  bookerName: string;
  dashboardUrl: string;
  venue?: string;
  eventType?: string;
}): string {
  const { djArtistName, bookerName, dashboardUrl, venue, eventType } = input;
  const detailLines = [
    venue ? `<li style="margin:0 0 6px 0;"><strong>Lugar:</strong> ${escapeHtml(venue)}</li>` : "",
    eventType ? `<li style="margin:0 0 6px 0;"><strong>Tipo:</strong> ${escapeHtml(eventType)}</li>` : "",
  ].join("");
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 8px 0;">Llegó tu <strong>primer booking</strong> en DROP. — <strong>${escapeHtml(bookerName)}</strong> quiere contratarte.</p>
              <p style="font-size:24px; font-family:${FONT_MONO}; margin:0 0 20px 0;">🎉</p>
              ${detailLines ? `<ul style="font-size:15px; margin:0 0 16px 0; padding-left:20px;">${detailLines}</ul>` : ""}
              <p style="font-size:15px; margin:0 0 16px 0;">Responde rápido: los bookers suelen contactar a varios DJs en paralelo.</p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 20px 0;">Qué hacer ahora: revisa los detalles, cotiza y responde desde tu panel.</p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver el booking", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">¡Que sea el primero de muchos!<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Tu primer booking en DROP. — ${bookerName}`,
    preheader: `${bookerName} quiere contratarte. ¡Tu primer booking en DROP.!`,
    content,
    footerReason: "Recibes este aviso porque administras tu agenda en DROP. (dropgigs.com).",
  });
}


export function firstBookingReceivedEmailText(input: {
  djArtistName: string;
  bookerName: string;
  dashboardUrl: string;
  venue?: string;
  eventType?: string;
}): string {
  const { djArtistName, bookerName, dashboardUrl, venue, eventType } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Llegó tu primer booking en DROP. — ${bookerName} quiere contratarte.`,
    "",
    venue ? `Lugar: ${venue}` : "",
    eventType ? `Tipo: ${eventType}` : "",
    "",
    "Responde rápido: los bookers suelen contactar a varios DJs en paralelo.",
    "",
    `Ver el booking: ${dashboardUrl}`,
    "",
    "¡Que sea el primero de muchos!",
    "DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}


// ---------------------------------------------------------------------------
// 14. Post-evento: Review al booker (día +2)
// ---------------------------------------------------------------------------

export function postEventoBookerReviewEmailHtml(input: {
  bookerName: string;
  djArtistName: string;
  eventDate: string;
  reviewUrl: string;
}): string {
  const { bookerName, djArtistName, eventDate, reviewUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(bookerName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Esperamos que tu evento del <strong>${escapeHtml(eventDate)}</strong> con
                <strong>${escapeHtml(djArtistName)}</strong> haya salido perfecto.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0; color:${MUTED};">
                ¿Cómo te fue? Tu opinión ayuda a otros bookers a elegir mejor y
                le da visibilidad a los DJs que se lucen.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Dejar mi review", reviewUrl)}</p>
              <p style="font-size:15px; margin:0;">Gracias,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `¿Cómo te fue con ${djArtistName}? Deja tu review`,
    preheader: `Tu evento ya pasó. Cuéntanos cómo estuvo.`,
    content,
    footerReason: `Recibes este mensaje porque contrataste a ${djArtistName} a través de DROP. (dropgigs.com).`,
  });
}


export function postEventoBookerReviewEmailText(input: {
  bookerName: string;
  djArtistName: string;
  eventDate: string;
  reviewUrl: string;
}): string {
  const { bookerName, djArtistName, eventDate, reviewUrl } = input;
  return [
    `Hola ${bookerName},`,
    "",
    `Esperamos que tu evento del ${eventDate} con ${djArtistName} haya salido perfecto.`,
    "",
    "¿Cómo te fue? Tu opinión ayuda a otros bookers y le da visibilidad a los DJs que se lucen.",
    "",
    `Dejar mi review: ${reviewUrl}`,
    "",
    "--",
    `Recibes este mensaje porque contrataste a ${djArtistName} a través de DROP. (dropgigs.com).`,
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 15. Post-evento: Nudge al DJ para fotos/reels (día +7)
// ---------------------------------------------------------------------------

export function postEventoDjFotosEmailHtml(input: {
  djArtistName: string;
  eventDate: string;
  venue?: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, eventDate, venue, dashboardUrl } = input;
  const venueLabel = venue ? ` en ${escapeHtml(venue)}` : "";
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Ya pasó una semana desde tu toque del <strong>${escapeHtml(eventDate)}</strong>${venueLabel}.
              </p>
              <p style="font-size:15px; margin:0 0 20px 0; color:${MUTED};">
                Si tienes fotos o reels, súbelos a tu press kit ahora que el evento está fresco.
                El contenido visual es lo que más convierte a bookers nuevos.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 24px 0;">
                <p style="font-size:13px; color:${MUTED}; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Tip</p>
                <p style="font-size:14px; color:${INK}; margin:0;">
                  Un press kit con fotos de eventos reales recibe hasta 3× más solicitudes que uno sin contenido.
                </p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Subir fotos a mi press kit", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Sube las fotos de tu último toque",
    preheader: "Ya pasó una semana — el contenido fresco convierte más.",
    content,
    footerReason: "Recibes este recordatorio porque tienes una cuenta activa en DROP. (dropgigs.com).",
  });
}


export function postEventoDjFotosEmailText(input: {
  djArtistName: string;
  eventDate: string;
  venue?: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, eventDate, venue, dashboardUrl } = input;
  const venueLabel = venue ? ` en ${venue}` : "";
  return [
    `Hola ${djArtistName},`,
    "",
    `Ya pasó una semana desde tu toque del ${eventDate}${venueLabel}.`,
    "",
    "Si tienes fotos o reels, súbelos a tu press kit ahora que el evento está fresco.",
    "El contenido visual es lo que más convierte a bookers nuevos.",
    "",
    `Subir fotos: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este recordatorio porque tienes una cuenta activa en DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 23. Booking: confirmación de cancelación al booker
// ---------------------------------------------------------------------------

export function bookingCanceladoEmailHtml(input: {
  bookerName: string;
  djArtistName: string;
  eventDate: string;
  searchUrl: string;
}): string {
  const { bookerName, djArtistName, eventDate, searchUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(bookerName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Tu solicitud para el evento del <strong>${escapeHtml(eventDate)}</strong>
                con <strong>${escapeHtml(djArtistName)}</strong> fue cancelada.
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Si aún necesitas un DJ para ese día, hay otros artistas disponibles en DROP.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Buscar otro DJ", searchUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu booking fue cancelado",
    preheader: "¿Necesitas otro DJ? Hay opciones disponibles.",
    content,
    footerReason: `Recibes este aviso porque enviaste una solicitud a ${djArtistName} a través de DROP. (dropgigs.com).`,
  });
}


export function bookingCanceladoEmailText(input: {
  bookerName: string;
  djArtistName: string;
  eventDate: string;
  searchUrl: string;
}): string {
  const { bookerName, djArtistName, eventDate, searchUrl } = input;
  return [
    `Hola ${bookerName},`,
    "",
    `Tu solicitud para el evento del ${eventDate} con ${djArtistName} fue cancelada.`,
    "Si aún necesitas un DJ para ese día, hay otros artistas disponibles en DROP.",
    "",
    `Buscar otro DJ: ${searchUrl}`,
    "",
    "--",
    `Recibes este aviso porque enviaste una solicitud a ${djArtistName} a través de DROP. (dropgigs.com).`,
  ].join("\n");
}
