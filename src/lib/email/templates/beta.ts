import "server-only";

import { INK, CREAM, ORANGE, MUTED, FONT_MONO, wrapEmail, ctaButton, escapeHtml } from "./_shared";


// ---------------------------------------------------------------------------
// 0. Founding Booker Invite (Fase 2)
// ---------------------------------------------------------------------------

export function foundingInviteEmailHtml(input: {
  fullName: string;
  inviteUrl: string;
}): string {
  const name = input.fullName?.trim() || "hola";
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(name)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Te queremos invitar como <strong>Founding Booker</strong> de DROP., el lugar donde encuentras y contactas DJs directo — sin intermediarios ni comisión. Estamos abriendo el lado booker a un grupo chico y elegido, y queremos que seas parte.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">Como Founding Booker tienes:</p>
              <ul style="font-size:15px; margin:0 0 20px 0; padding:0 0 0 20px;">
                <li style="margin:0 0 8px 0;"><strong>Cuenta verificada</strong> desde el día uno (badge ✓ que los DJs ven).</li>
                <li style="margin:0 0 8px 0;"><strong>Badge ★ Founding</strong> — eres de los primeros, y se nota.</li>
                <li style="margin:0 0 8px 0;"><strong>Acceso anticipado</strong> a lo que vayamos soltando (como el match inteligente de DJs).</li>
              </ul>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Tu invitación es personal y de un solo uso. Para activarla, crea tu cuenta acá:
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Crear mi cuenta Founding", input.inviteUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 24px 0;">
                Si el botón no funciona, copia este link: ${escapeHtml(input.inviteUrl)}
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 20px 0;">
                Importante: crea la cuenta con <strong>este mismo correo</strong> para que tu acceso Founding quede activado automáticamente.
              </p>
              <p style="font-size:15px; margin:0;">
                Nos vemos adentro,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: "Tu invitación Founding a DROP.",
    preheader: `Te invitamos como Founding Booker de DROP., ${name}.`,
    content,
    footerReason:
      "Recibes este email porque te invitamos personalmente a ser Founding Booker de DROP. en dropgigs.com. Si no esperabas esto, puedes ignorarlo — sin acción de tu parte no se crea ninguna cuenta.",
  });
}


export function foundingInviteEmailText(input: {
  fullName: string;
  inviteUrl: string;
}): string {
  const name = input.fullName?.trim() || "hola";
  return `Hola ${name},

Te queremos invitar como Founding Booker de DROP., el lugar donde encuentras y contactas DJs directo, sin intermediarios ni comisión. Estamos abriendo el lado booker a un grupo chico y elegido, y queremos que seas parte.

Como Founding Booker tienes:
- Cuenta verificada desde el día uno (badge que los DJs ven).
- Badge Founding: eres de los primeros, y se nota.
- Acceso anticipado a lo que vayamos soltando (como el match inteligente de DJs).

Tu invitación es personal y de un solo uso. Para activarla, crea tu cuenta acá:
${input.inviteUrl}

Importante: crea la cuenta con ESTE MISMO correo para que tu acceso Founding quede activado automáticamente.

Nos vemos adentro,
DROP. Team`;
}


// ---------------------------------------------------------------------------
// 1. Beta Invite
// ---------------------------------------------------------------------------

export function betaInviteEmailHtml(input: {
  artistName: string;
  inviteUrl: string;
  fromName?: string;
}): string {
  const signatureHtml = input.fromName
    ? escapeHtml(input.fromName)
    : `DROP<span style="color:${ORANGE};">.</span> Team`;

  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.artistName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Te confirmo tu acceso a DROP, el sistema operativo que estoy construyendo para DJs independientes. Estás aprobado para la beta cerrada de 15 días.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Para activar tu cuenta, abre el siguiente enlace:
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Activar mi cuenta", input.inviteUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 24px 0;">
                Si el botón no funciona, copia este link: ${escapeHtml(input.inviteUrl)}
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Una vez dentro, vas a poder gestionar tus contactos, llevar tu calendario, ver el crecimiento de tus redes y tener un press kit público en un link compartible.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Durante los 15 días te voy a hacer dos preguntas cortas para saber qué te sirve y qué falta. Tu feedback define qué construimos primero.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Cualquier duda, respondes este correo y me llega directo.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                ${signatureHtml}
              </p>`;

  return wrapEmail({
    title: "Tu acceso a DROP.",
    preheader: `Tu acceso a la beta cerrada de DROP. está listo, ${input.artistName}.`,
    content,
    footerReason:
      "Recibes este email porque solicitaste acceso a la beta de DROP. en dropgigs.com/beta. Si no fuiste tú, puedes ignorar este mensaje — sin acción de tu parte no se crea ninguna cuenta.",
  });
}


export function betaInviteEmailText(input: {
  artistName: string;
  inviteUrl: string;
  fromName?: string;
}): string {
  const fromName = input.fromName || "DROP. Team";
  return `Hola ${input.artistName},

Te confirmo tu acceso a DROP, el sistema operativo que estoy construyendo para DJs independientes. Estás aprobado para la beta cerrada de 15 días.

Para activar tu cuenta, abre el siguiente enlace:
${input.inviteUrl}

Una vez dentro, vas a poder gestionar tus contactos, llevar tu calendario, ver el crecimiento de tus redes y tener un press kit público en un link compartible.

Durante los 15 días te voy a hacer dos preguntas cortas para saber qué te sirve y qué falta. Tu feedback define qué construimos primero.

Cualquier duda, respondes este correo y me llega directo.

Saludos,
${fromName}

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este email porque solicitaste acceso a la beta en dropgigs.com/beta.`;
}


// ---------------------------------------------------------------------------
// 2. Beta Rejection
// ---------------------------------------------------------------------------

export function betaRejectionEmailHtml(input: {
  artistName: string;
  reason?: string;
}): string {
  const reasonHtml = input.reason
    ? `<p style="font-size:15px; margin:0 0 16px 0;">${escapeHtml(input.reason)}</p>`
    : "";

  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.artistName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Gracias por tu interés en DROP. Revisamos tu solicitud y por ahora no podemos abrirte acceso a la beta.
              </p>
              ${reasonHtml}
              <p style="font-size:15px; margin:0 0 16px 0;">
                La beta está muy limitada en cupo y estamos siendo selectivos para poder dar una buena experiencia a cada usuario. Esto no es un juicio sobre tu trabajo como DJ.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Si tienes preguntas, puedes responder este correo directamente.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: "Tu solicitud a DROP.",
    preheader: `Hola ${input.artistName}, te escribimos sobre tu solicitud a DROP.`,
    content,
    footerReason:
      "Recibes este email porque solicitaste acceso a la beta de DROP. en dropgigs.com/beta.",
  });
}


export function betaRejectionEmailText(input: {
  artistName: string;
  reason?: string;
}): string {
  const reasonText = input.reason ? `\n${input.reason}\n` : "";
  return `Hola ${input.artistName},

Gracias por tu interés en DROP. Revisamos tu solicitud y por ahora no podemos abrirte acceso a la beta.
${reasonText}
La beta está muy limitada en cupo y estamos siendo selectivos para poder dar una buena experiencia a cada usuario. Esto no es un juicio sobre tu trabajo como DJ.

Si tienes preguntas, puedes responder este correo directamente.

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com`;
}


// ---------------------------------------------------------------------------
// 3. Needs Beta Request (cuentas huérfanas)
// ---------------------------------------------------------------------------

export function needsBetaRequestEmailHtml(input: {
  artistName?: string;
  betaUrl: string;
}): string {
  const greeting = input.artistName
    ? `Hola ${escapeHtml(input.artistName)},`
    : `Hola,`;

  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                ${greeting}
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Vimos que creaste una cuenta en DROP con este email, pero todavía estamos en beta cerrada y necesitamos que pases por la lista de espera antes de activarte.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                DROP es un sistema operativo para DJs independientes: CRM de contactos, calendario, growth de redes y press kit en un link compartible. Si te interesa probarlo, solicita tu acceso acá:
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Solicitar acceso a la beta", input.betaUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 24px 0;">
                Si el botón no funciona, copia este link: ${escapeHtml(input.betaUrl)}
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Cuando recibamos tu solicitud te aprobamos y te llega un invite con tu acceso directo a la beta de 15 días.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Cualquier duda, respondes este correo y te leemos.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: "Tu cuenta en DROP. — falta un paso",
    preheader: "Necesitas pasar por la lista de espera para activar tu cuenta.",
    content,
    footerReason:
      "Recibes este email porque alguien (probablemente tú) creó una cuenta con esta dirección en DROP. antes de que activáramos el control de acceso por invitación. La cuenta fue eliminada porque no estaba aprobada. Si quieres entrar, usa el link de arriba.",
  });
}


export function needsBetaRequestEmailText(input: {
  artistName?: string;
  betaUrl: string;
}): string {
  const greeting = input.artistName ? `Hola ${input.artistName},` : `Hola,`;
  return `${greeting}

Vimos que creaste una cuenta en DROP con este email, pero todavía estamos en beta cerrada y necesitamos que pases por la lista de espera antes de activarte.

DROP es un sistema operativo para DJs independientes: CRM de contactos, calendario, growth de redes y press kit en un link compartible. Si te interesa probarlo, llena el formulario de acceso acá:

${input.betaUrl}

Cuando recibamos tu solicitud te aprobamos y te llega un invite con tu acceso directo a la beta de 15 días.

Cualquier duda, respondes este correo y te leemos.

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este email porque alguien (probablemente tú) creó una cuenta con esta dirección en DROP antes de que activáramos el control de acceso por invitación.`;
}


// ---------------------------------------------------------------------------
// 3. Beta Reminder
// ---------------------------------------------------------------------------

export function betaReminderEmailHtml(input: {
  artistName: string;
  daysRemaining: number;
  dashboardUrl: string;
}): string {
  const dias = input.daysRemaining;
  const diasLabel = dias === 1 ? "1 día" : `${dias} días`;

  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.artistName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Quería pasarme rápido a saber cómo va. Te quedan <strong>${diasLabel}</strong> de tu beta cerrada de DROP.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">
                Tres cosas que ayudan un montón estos días:
              </p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 10px 0;">
                  <strong>Sigue usándolo.</strong> La beta vive de que lo rompas y uses todo.
                </li>
                <li style="margin:0 0 10px 0;">
                  <strong>Repórtame cualquier bug</strong> respondiendo este correo y me llega directo. Cada bug que encuentras evita que otros lo sufran.
                </li>
                <li style="margin:0 0 10px 0;">
                  <strong>Ideas, feedback, lo que te frustra</strong> — eso define qué construyo primero.
                </li>
              </ol>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Dentro de la app también hay un botón flotante de feedback si prefieres dejarlo ahí.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Abrir DROP", input.dashboardUrl)}
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: `Tu beta de DROP. — ${diasLabel} restantes`,
    preheader: `Te quedan ${diasLabel} de tu beta cerrada. Tres cosas que ayudan estos días.`,
    content,
    footerReason:
      "Recibes este correo porque estás participando en la beta cerrada de DROP. Si prefieres no recibir más mensajes, respondes \"unsubscribe\" y te quito de la lista.",
  });
}


export function betaReminderEmailText(input: {
  artistName: string;
  daysRemaining: number;
  dashboardUrl: string;
}): string {
  const dias = input.daysRemaining;
  const diasLabel = dias === 1 ? "1 día" : `${dias} días`;
  return `Hola ${input.artistName},

Quería pasarme rápido a saber cómo va. Te quedan ${diasLabel} de tu beta cerrada de DROP.

Tres cosas que ayudan un montón estos días:

1. Sigue usándolo. La beta vive de que lo rompas y uses todo.
2. Repórtame cualquier bug respondiendo este correo y me llega directo. Cada bug que encuentras evita que otros lo sufran.
3. Ideas, feedback, lo que te frustra — eso define qué construyo primero.

Dentro de la app también hay un botón flotante de feedback si prefieres dejarlo ahí.

Abrir DROP: ${input.dashboardUrl}

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque estás participando en la beta cerrada. Si no quieres más mensajes, respondes "unsubscribe" y te quito.`;
}


// ---------------------------------------------------------------------------
// 29. Admin: solicitud beta sin revisar en 48h
// ---------------------------------------------------------------------------

export function betaSinRevisarEmailHtml(input: {
  pendingCount: number;
  oldestLabel: string;
  adminUrl: string;
}): string {
  const { pendingCount, oldestLabel, adminUrl } = input;
  const content = `
              <p style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Pendiente de revisión</p>
              <p style="font-size:26px; font-weight:700; color:${INK}; margin:0 0 20px 0;">
                ${pendingCount} solicitud${pendingCount > 1 ? "es" : ""} sin revisar
              </p>
              <p style="font-size:15px; color:${MUTED}; margin:0 0 24px 0;">
                La más antigua lleva esperando desde <strong style="color:${INK};">${escapeHtml(oldestLabel)}</strong>.
                Los DJs esperan respuesta — aprobar o rechazar rápido genera mejor impresión.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Revisar solicitudes", adminUrl)}</p>`;
  return wrapEmail({
    title: `${pendingCount} solicitud${pendingCount > 1 ? "es" : ""} beta sin revisar`,
    preheader: `La más antigua lleva desde ${oldestLabel}. Entra a revisarlas.`,
    content,
    footerReason: "Reporte automático de DROP. (dropgigs.com).",
  });
}


export function betaSinRevisarEmailText(input: {
  pendingCount: number;
  oldestLabel: string;
  adminUrl: string;
}): string {
  const { pendingCount, oldestLabel, adminUrl } = input;
  return [
    `Tienes ${pendingCount} solicitud${pendingCount > 1 ? "es" : ""} beta sin revisar.`,
    `La más antigua lleva esperando desde ${oldestLabel}.`,
    "",
    `Revisar: ${adminUrl}`,
    "",
    "--",
    "Reporte automático de DROP. (dropgigs.com).",
  ].join("\n");
}


// ---------------------------------------------------------------------------
// 32. Beta request rechazada — notif al DJ con opción de apelar
// ---------------------------------------------------------------------------

export function betaRechazadaEmailHtml(input: {
  artistName: string;
  rejectReason?: string;
  betaUrl: string;
}): string {
  const { artistName, rejectReason, betaUrl } = input;
  const reasonBlock = rejectReason
    ? `<div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 24px 0;">
                <p style="font-size:13px; color:${MUTED}; margin:0 0 4px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Motivo</p>
                <p style="font-size:14px; color:${INK}; margin:0;">${escapeHtml(rejectReason)}</p>
              </div>`
    : "";
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Revisamos tu solicitud para unirte a DROP. y por ahora no pudimos darte acceso.
              </p>
              ${reasonBlock}
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Si crees que hay un error o quieres compartir más contexto sobre tu proyecto,
                puedes apelar directamente. Revisamos cada caso con atención.
              </p>
              <p style="margin:0 0 28px 0;">${ctaButton("Apelar mi solicitud", betaUrl)}</p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                También puedes volver a postular más adelante cuando tengas más material
                de tu trabajo (sets, redes, presentaciones).
              </p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Sobre tu solicitud a DROP.",
    preheader: "Revisamos tu postulación. Aquí tienes los detalles.",
    content,
    footerReason: "Recibes este mensaje porque postulaste a DROP. (dropgigs.com).",
  });
}


export function betaRechazadaEmailText(input: {
  artistName: string;
  rejectReason?: string;
  betaUrl: string;
}): string {
  const { artistName, rejectReason, betaUrl } = input;
  return [
    `Hola ${artistName},`,
    "",
    "Revisamos tu solicitud para unirte a DROP. y por ahora no pudimos darte acceso.",
    ...(rejectReason ? ["", `Motivo: ${rejectReason}`] : []),
    "",
    "Si crees que hay un error o quieres compartir más contexto, puedes apelar.",
    "",
    `Apelar mi solicitud: ${betaUrl}`,
    "",
    "También puedes volver a postular más adelante con más material de tu trabajo.",
    "",
    "--",
    "Recibes este mensaje porque postulaste a DROP. (dropgigs.com).",
  ].join("\n");
}
