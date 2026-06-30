import "server-only";

/**
 * Templates HTML de emails de DROP.
 *
 * Arquitectura (refactor 2026-05-31):
 *   - `wrapEmail()` envuelve cualquier email con header brandeado (ink + logo
 *     wordmark "DROP." en cream/orange + tagline "THE DJ OS") y footer
 *     consistente. Cualquier email futuro hereda el branding sin repetir HTML.
 *   - Los 5 templates (`betaInvite`, `needsBetaRequest`, `betaReminder`,
 *     `bugFixFollowup`, `followUpdates`) ahora solo definen su contenido
 *     específico y razón del footer.
 *   - `ctaButton()` helper para botones de acción branded (ink bg + orange
 *     text, monospace, uppercase).
 *
 * Diseño optimizado para balance entre deliverability y branding:
 *   - Header en color ink #0A0A0A (background sólido, no degradado) — fuerte
 *     pero no spammy.
 *   - Logo wordmark renderizado como texto + CSS (no imagen externa), funciona
 *     aunque Gmail bloquee imágenes.
 *   - Body en blanco, tipografía sistema, una sola CTA por email.
 *   - Sin emoji en subject, sin caps lock en headlines (Gmail penalty).
 *   - HTML + plain text balanceados (mismo contenido).
 *   - Footer minimal con razón del envío (CAN-SPAM compliance).
 *
 * Inline styles para compatibilidad con Gmail/Outlook/Apple Mail/iOS Mail.
 */

const INK = "#0A0A0A";
const CREAM = "#F4EFE7";
const ORANGE = "#FF5C00";
const MUTED = "#7A7670";
const BORDER = "#E5E1D8";

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
const FONT_MONO = "Consolas,'Courier New',monospace";

/**
 * Envuelve un fragmento de HTML con el shell branded de DROP.
 * (header con logo wordmark + body + footer estándar).
 *
 * @param title — <title> del HTML, también ayuda al subject preview en algunos clients.
 * @param preheader — texto preview que aparece al lado del subject en el inbox.
 * @param content — fragmento HTML del cuerpo (lo que va entre header y footer).
 * @param footerReason — explicación de por qué la persona recibe el email (CAN-SPAM).
 */
export function wrapEmail(opts: {
  title: string;
  preheader?: string;
  content: string;
  footerReason: string;
}): string {
  const { title, preheader = "", content, footerReason } = opts;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${FONT_SANS}; color:${INK};">

  <!-- Preheader oculto (preview en inbox) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden; mso-hide:all; height:0; width:0; font-size:0; line-height:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM};">
    <tr>
      <td align="center" style="padding:24px 16px 40px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background:#ffffff; border:1px solid ${BORDER}; border-radius:6px;">

          <!-- Header brandeado: ink + wordmark PNG (con fallback texto) + tagline -->
          <tr>
            <td align="center" style="background:${INK}; padding:36px 24px 32px 24px; border-radius:6px 6px 0 0;">
              <a href="https://dropgigs.com" style="text-decoration:none; display:inline-block;">
                <img src="https://dropgigs.com/brand/wordmark-light.png"
                     alt="DROP."
                     width="200"
                     height="84"
                     style="display:block; margin:0 auto; width:200px; height:auto; max-width:200px; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;" />
              </a>
              <div style="font-family:${FONT_MONO}; font-size:10px; color:${MUTED}; letter-spacing:0.3em; margin-top:14px; text-transform:uppercase;">
                — The DJ OS —
              </div>
            </td>
          </tr>

          <!-- Body (contenido específico del email) -->
          <tr>
            <td style="padding:32px 32px 16px 32px; font-family:${FONT_SANS}; color:${INK}; line-height:1.5;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px; border-top:1px solid ${BORDER};">
              <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; line-height:1.5; margin:12px 0 8px 0;">
                ${footerReason}
              </p>
              <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; margin:8px 0 0 0;">
                DROP<span style="color:${ORANGE};">.</span> — Santiago, Chile · <a href="https://dropgigs.com" style="color:${MUTED}; text-decoration:underline;">dropgigs.com</a> · <a href="mailto:hola@dropgigs.com" style="color:${MUTED}; text-decoration:underline;">hola@dropgigs.com</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Botón CTA branded (ink bg, orange text, monospace, uppercase).
 * Usa el mismo estilo que el de followUpdates (consistencia).
 */
export function ctaButton(label: string, url: string): string {
  return `<a href="${safeUrl(url)}" style="display:inline-block; padding:14px 22px; background:${INK}; color:${ORANGE}; text-decoration:none; font-family:${FONT_MONO}; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; border:2px solid ${INK}; border-radius:2px;">${escapeHtml(label)} →</a>`;
}

/**
 * Saneamiento de URLs antes de meterlas en un href de un correo.
 * - Solo permite esquemas http(s) → bloquea javascript:, data:, etc.
 * - Escapa comillas/ángulos → no se puede romper fuera del atributo href.
 * Hoy todas las URLs se arman server-side desde slugs/tokens (no input de
 * usuario), pero esto blinda el día que alguna derive de algo editable.
 */
export function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "#";
    return escapeHtml(u.toString());
  } catch {
    return "#";
  }
}

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
// 5. Avatar Reminder (perfil incompleto sin foto)
// ---------------------------------------------------------------------------

/**
 * Recordatorio para DJs beta que NO subieron foto de perfil.
 * Sin foto, su card en /dj sale con iniciales — el directorio se ve
 * menos profesional y los bookers no los identifican tan fácil.
 *
 * Tono: cordial, chileno tuteo, low pressure. CTA único a /perfil.
 */
export function avatarReminderEmailHtml(input: {
  artistName: string;
  profileUrl: string;
  directoryUrl: string;
}): string {
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(input.artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Pasé revisando los perfiles de los DJs en la beta y vi que el tuyo todavía no tiene foto cargada.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Sin foto, tu card en el <a href="${input.directoryUrl}" style="color:${INK}; text-decoration:underline;">directorio público</a> sale con tus iniciales en vez de tu cara. Los bookers que entran a buscar DJ se enganchan con quien identifican rápido — y la foto es lo primero que ven.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">Súbela en 30 segundos:</p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 8px 0;">Abre tu perfil en DROP.</li>
                <li style="margin:0 0 8px 0;">Click en el círculo gris arriba (donde van las iniciales).</li>
                <li style="margin:0 0 8px 0;">Elige una foto cuadrada — JPG o PNG, hasta 10&nbsp;MB.</li>
              </ol>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Subir mi foto", input.profileUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                Tip: usa una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil. La misma queda como avatar en toda la app + en tu press kit público.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Cualquier duda — o si algo no carga — respondes este correo y te ayudo directo.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: "Tu perfil en DROP. está casi listo",
    preheader: "Falta tu foto. Sin ella, tu card en el directorio sale con iniciales.",
    content,
    footerReason:
      'Recibes este correo porque estás en la beta de DROP. y tu perfil aún no tiene foto. Si prefieres no recibir más mensajes, respondes "unsubscribe" y te quito de la lista.',
  });
}

export function avatarReminderEmailText(input: {
  artistName: string;
  profileUrl: string;
  directoryUrl: string;
}): string {
  return `Hola ${input.artistName},

Pasé revisando los perfiles de los DJs en la beta y vi que el tuyo todavía no tiene foto cargada.

Sin foto, tu card en el directorio público (${input.directoryUrl}) sale con tus iniciales en vez de tu cara. Los bookers que entran a buscar DJ se enganchan con quien identifican rápido — y la foto es lo primero que ven.

Súbela en 30 segundos:
1. Abre tu perfil en DROP.
2. Click en el círculo gris arriba (donde van las iniciales).
3. Elige una foto cuadrada — JPG o PNG, hasta 10 MB.

Subir mi foto: ${input.profileUrl}

Tip: usa una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil. La misma queda como avatar en toda la app + en tu press kit público.

Cualquier duda — o si algo no carga — respondes este correo y te ayudo directo.

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque estás en la beta y tu perfil aún no tiene foto. Si no quieres más, respondes "unsubscribe".`;
}

// ---------------------------------------------------------------------------
// 6. Follow Updates (digest de updates de DJ a followers)
// ---------------------------------------------------------------------------

// ─── Activación E1 · Bienvenida (al completar onboarding) ──────────────────
export function welcomeDjEmailHtml(input: {
  artistName: string;
  profileUrl: string;
}): string {
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(input.artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Ya estás dentro de DROP<span style="color:${ORANGE};">.</span> Tienes acceso a tu sistema operativo de DJ: press kit, CRM de contactos, calendario con plata y growth — todo en un solo lugar.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">
                Lo primero, y lo que más te mueve la aguja: <strong>arma tu press kit público</strong>. Es el link que les pasas a los bookers en vez de un PDF o tu Instagram. En 5 minutos:
              </p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 8px 0;">Sube tu foto.</li>
                <li style="margin:0 0 8px 0;">Elige tus géneros y escribe dos líneas de bio.</li>
                <li style="margin:0 0 8px 0;">Pega tu mejor set (SoundCloud, Mixcloud o YouTube).</li>
              </ol>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Armar mi press kit", input.profileUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                Con eso ya queda presentable y lo puedes compartir. El resto (rider, fee, galería) lo sumas cuando quieras.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                Cualquier duda, respondes este correo y te ayudo directo.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;
  return wrapEmail({
    title: "Estás dentro de DROP. — armemos tu press kit",
    preheader: "Tu cuenta ya está lista. En 5 minutos tienes un press kit que se ve pro.",
    content,
    footerReason: "Recibes este correo porque acabas de activar tu cuenta en la beta de DROP.",
  });
}

export function welcomeDjEmailText(input: {
  artistName: string;
  profileUrl: string;
}): string {
  return `Hola ${input.artistName},

Ya estás dentro de DROP. Tienes acceso a tu sistema operativo de DJ: press kit, CRM, calendario con plata y growth — todo en un solo lugar.

Lo primero, y lo que más te mueve la aguja: arma tu press kit público. Es el link que les pasas a los bookers en vez de un PDF o tu Instagram. En 5 minutos:

1. Sube tu foto.
2. Elige tus géneros y escribe dos líneas de bio.
3. Pega tu mejor set (SoundCloud, Mixcloud o YouTube).

Armar mi press kit: ${input.profileUrl}

Con eso ya queda presentable y lo puedes compartir. El resto (rider, fee, galería) lo sumas cuando quieras.

Cualquier duda, respondes este correo y te ayudo directo.

Saludos,
DROP. Team`;
}

// ─── Activación E3 · Press kit vivo (al quedar live-ready) ─────────────────
export function presskitLiveEmailHtml(input: {
  artistName: string;
  presskitUrl: string;
}): string {
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(input.artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Listo<span style="color:${ORANGE};">.</span> Tu press kit ya está completo y público. Este es tu link — así lo ven los bookers:
              </p>
              <p style="font-family:${FONT_MONO}; font-size:15px; font-weight:700; color:${INK}; background:#FBF7F0; border:2px solid ${ORANGE}; border-radius:4px; padding:12px 14px; margin:0 0 18px 0; text-align:center; word-break:break-all;">
                ${escapeHtml(input.presskitUrl.replace(/^https?:\/\//, ""))}
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Ver mi press kit", input.presskitUrl)}
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Ahora lo que de verdad mueve la aguja: <strong>úsalo</strong>. Pégalo en la bio de tu Instagram, mándaselo a los venues donde quieres tocar, ponlo en tu WhatsApp. Es tu carta de presentación en un link.
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 24px 0;">
                ¿Próximo paso opcional? Carga tus gigs en el calendario y empieza a llevar la cuenta de lo que cobras.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;
  return wrapEmail({
    title: "Tu press kit en DROP. está vivo",
    preheader: "Acá está tu link. Ahora lo importante: empieza a pasarlo.",
    content,
    footerReason: "Recibes este correo porque completaste tu press kit en DROP.",
  });
}

export function presskitLiveEmailText(input: {
  artistName: string;
  presskitUrl: string;
}): string {
  return `Hola ${input.artistName},

Listo. Tu press kit ya está completo y público. Este es tu link — así lo ven los bookers:

${input.presskitUrl}

Ahora lo que de verdad mueve la aguja: úsalo. Pégalo en la bio de tu Instagram, mándaselo a los venues donde quieres tocar, ponlo en tu WhatsApp. Es tu carta de presentación en un link.

¿Próximo paso opcional? Carga tus gigs en el calendario y empieza a llevar la cuenta de lo que cobras.

Saludos,
DROP. Team`;
}

export interface FollowUpdate {
  type: "show_scheduled" | "availability_updated";
  title: string;
  detail?: string;
}

export function followUpdatesEmailHtml(input: {
  bookerName: string;
  djArtistName: string;
  djSlug: string;
  updates: FollowUpdate[];
  dashboardUrl: string;
  siteUrl: string;
}): string {
  const updatesHtml = input.updates
    .map(
      (u) => `
                <li style="margin:0 0 12px 0;">
                  <strong>${escapeHtml(u.title)}</strong>${
                    u.detail
                      ? `<br/><span style="color:${MUTED}; font-size:14px;">${escapeHtml(u.detail)}</span>`
                      : ""
                  }
                </li>`
    )
    .join("");
  const profileUrl = `${input.siteUrl}/p/${input.djSlug}`;

  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.bookerName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                <strong>${escapeHtml(input.djArtistName)}</strong>, que sigues, tiene novedades:
              </p>
              <ul style="font-size:15px; margin:0 0 20px 20px; padding:0; list-style:none;">
                ${updatesHtml}
              </ul>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton(`Ver perfil de ${input.djArtistName}`, profileUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                ¿Recibes muchos avisos? Puedes pausar las notificaciones desde el perfil del DJ o desde tu feed de seguidos en DROP.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;

  return wrapEmail({
    title: `${input.djArtistName} actualizó su agenda`,
    preheader: `Novedades de ${input.djArtistName} en DROP.`,
    content,
    footerReason: `Recibes este email porque sigues a ${escapeHtml(input.djArtistName)} con avisos activados en DROP. Puedes pausarlos en cualquier momento desde su perfil.`,
  });
}

export function followUpdatesEmailText(input: {
  bookerName: string;
  djArtistName: string;
  djSlug: string;
  updates: FollowUpdate[];
  siteUrl: string;
}): string {
  const lines = input.updates
    .map((u, i) => {
      const head = `${i + 1}. ${u.title}`;
      return u.detail ? `${head}\n   ${u.detail}` : head;
    })
    .join("\n");
  const profileUrl = `${input.siteUrl}/p/${input.djSlug}`;
  return `Hola ${input.bookerName},

${input.djArtistName}, que sigues, tiene novedades:

${lines}

Ver perfil: ${profileUrl}

¿Recibes muchos avisos? Puedes pausar las notificaciones desde el perfil del DJ o desde tu feed de seguidos en DROP.

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque sigues a ${input.djArtistName} con avisos activados. Puedes pausarlos en cualquier momento desde su perfil.`;
}

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
// 8. Weekly Digest — resumen semanal al DJ
// ---------------------------------------------------------------------------

export function weeklyDigestDjEmailHtml(input: {
  djArtistName: string;
  weekLabel: string;
  profileViews: number;
  bookingsReceived: number;
  newFollowers: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, weekLabel, profileViews, bookingsReceived, newFollowers, dashboardUrl } = input;
  const highlight =
    bookingsReceived > 0
      ? `Recibiste <strong>${bookingsReceived} booking${bookingsReceived > 1 ? "s" : ""}</strong> esta semana.`
      : profileViews > 0
        ? `Tu perfil tuvo <strong>${profileViews} vista${profileViews > 1 ? "s" : ""}</strong> esta semana.`
        : "Esta semana no hubo actividad. Actualizar tu perfil o compartirlo puede ayudar.";
  const bookingsColor = bookingsReceived > 0 ? ORANGE : INK;
  const content = `
              <p style="font-size:16px; margin:0 0 6px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:11px; color:${MUTED}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.12em; margin:0 0 20px 0;">Semana ${escapeHtml(weekLabel)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER}; border-radius:4px; margin:0 0 20px 0;">
                <tr>
                  <td align="center" style="padding:20px 8px; border-right:1px solid ${BORDER}; width:33.3%;">
                    <div style="font-size:30px; font-weight:700; font-family:${FONT_MONO}; color:${INK}; line-height:1;">${profileViews}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Vistas</div>
                  </td>
                  <td align="center" style="padding:20px 8px; border-right:1px solid ${BORDER}; width:33.3%;">
                    <div style="font-size:30px; font-weight:700; font-family:${FONT_MONO}; color:${bookingsColor}; line-height:1;">${bookingsReceived}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Bookings</div>
                  </td>
                  <td align="center" style="padding:20px 8px; width:33.3%;">
                    <div style="font-size:30px; font-weight:700; font-family:${FONT_MONO}; color:${INK}; line-height:1;">${newFollowers}</div>
                    <div style="font-size:10px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; margin-top:6px;">Followers</div>
                  </td>
                </tr>
              </table>
              <p style="font-size:15px; margin:0 0 24px 0;">${highlight}</p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver mi dashboard", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Que la próxima semana sea mejor,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Tu semana en DROP. — ${weekLabel}`,
    preheader: `${profileViews} vistas · ${bookingsReceived} bookings · ${newFollowers} followers esta semana.`,
    content,
    footerReason: "Recibes este resumen porque tienes una cuenta activa en DROP. (dropgigs.com). Puedes pausarlo desde Configuración.",
  });
}

export function weeklyDigestDjEmailText(input: {
  djArtistName: string;
  weekLabel: string;
  profileViews: number;
  bookingsReceived: number;
  newFollowers: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, weekLabel, profileViews, bookingsReceived, newFollowers, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    `Resumen semana ${weekLabel}:`,
    "",
    `Vistas al perfil: ${profileViews}`,
    `Bookings recibidos: ${bookingsReceived}`,
    `Nuevos followers: ${newFollowers}`,
    "",
    `Ver dashboard: ${dashboardUrl}`,
    "",
    "Que la próxima semana sea mejor,",
    "DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com | Pausar resumen: dropgigs.com/configuracion",
  ].join("\n");
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
// 10. Follow-up vencido — recordatorio CRM
// ---------------------------------------------------------------------------

export function followUpOverdueEmailHtml(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note, dashboardUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">Tienes un seguimiento vencido en tu CRM:</p>
              <div style="background:#f9f7f4; border:1px solid ${BORDER}; border-radius:4px; padding:16px 20px; margin:0 0 20px 0;">
                <p style="font-size:14px; font-weight:700; margin:0 0 6px 0;">${escapeHtml(contactName)}</p>
                <p style="font-size:13px; color:${ORANGE}; font-family:${FONT_MONO}; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:0.08em;">${escapeHtml(dueDateLabel)}</p>
                <p style="font-size:14px; color:${MUTED}; margin:0; font-style:italic;">"${escapeHtml(note)}"</p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Ir al CRM", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">— DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Follow-up vencido — ${contactName}`,
    preheader: `Tienes un seguimiento pendiente con ${contactName} desde ${dueDateLabel}.`,
    content,
    footerReason: "Recibes este aviso porque tienes seguimientos activos en tu CRM de DROP. (dropgigs.com).",
  });
}

export function followUpOverdueEmailText(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tienes un seguimiento vencido en tu CRM:",
    "",
    `Contacto: ${contactName}`,
    `Vencido: ${dueDateLabel}`,
    `Nota: "${note}"`,
    "",
    `Ir al CRM: ${dashboardUrl}`,
    "",
    "— DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com",
  ].join("\n");
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
// 12. Perfil completo — confirmación de hito
// ---------------------------------------------------------------------------

export function profileCompleteEmailHtml(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 8px 0;">Tu perfil en DROP. está <strong>100% completo</strong>.</p>
              <p style="font-size:24px; font-family:${FONT_MONO}; margin:0 0 20px 0;">✓</p>
              <p style="font-size:15px; margin:0 0 12px 0;">Ahora los bookers pueden encontrarte y contactarte directamente. Tu press kit público está en:</p>
              <div style="background:#f9f7f4; border:1px solid ${BORDER}; border-radius:4px; padding:14px 16px; margin:0 0 20px 0;">
                <p style="font-size:13px; font-family:${FONT_MONO}; margin:0; color:${INK}; word-break:break-all;">${escapeHtml(profileUrl)}</p>
              </div>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 20px 0;">Compártelo en tus redes, en tu bio de Instagram, o en tu firma de email.</p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver mi perfil", profileUrl)}</p>
              <p style="font-size:15px; margin:0;">Que lleguen los bookings,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu perfil DROP. está completo",
    preheader: "Tu press kit está listo y visible para bookers. Compártelo.",
    content,
    footerReason: "Recibes este aviso porque completaste tu perfil en DROP. (dropgigs.com).",
  });
}

export function profileCompleteEmailText(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tu perfil en DROP. está 100% completo.",
    "",
    "Tu press kit público está en:",
    profileUrl,
    "",
    "Compártelo en tus redes, en tu bio de Instagram, o en tu firma de email.",
    "",
    "Que lleguen los bookings,",
    "DROP. Team",
    "",
    "--",
    "DROP. — dropgigs.com",
  ].join("\n");
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
// 16. Retención: 30 días sin booking recibido
// ---------------------------------------------------------------------------

export function djRetencion30DiasEmailHtml(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl, dashboardUrl } = input;
  const tips = [
    ["Foto profesional", "El 80% de los bookers mira primero la foto. Una buena imagen lo cambia todo."],
    ["Bio con estilo y géneros", "Explica qué tipo de eventos tocas y en qué eres diferente."],
    ["Comparte tu press kit", "El link de tu perfil es tu tarjeta de presentación. Agrégalo a tu bio de IG."],
  ];
  const tipsHtml = tips.map(([title, desc]) => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid ${BORDER};">
        <p style="font-size:14px; font-weight:600; color:${INK}; margin:0 0 4px 0;">${title}</p>
        <p style="font-size:13px; color:${MUTED}; margin:0;">${desc}</p>
      </td>
    </tr>`).join("");
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Llevas un mes sin recibir nuevos bookings. Estas pequeñas mejoras en tu perfil pueden hacer una gran diferencia:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                ${tipsHtml}
              </table>
              <p style="margin:0 0 12px 0;">${ctaButton("Revisar mi press kit", profileUrl)}</p>
              <p style="margin:0 0 24px 0;"><a href="${escapeHtml(dashboardUrl)}" style="font-size:13px; color:${MUTED};">Ver mi dashboard</a></p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Algunos tips para conseguir tu próximo booking",
    preheader: "Pequeños cambios en tu perfil pueden atraer más bookers.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
  });
}

export function djRetencion30DiasEmailText(input: {
  djArtistName: string;
  profileUrl: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, profileUrl, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Llevas un mes sin recibir nuevos bookings. Algunos tips:",
    "",
    "1. Foto profesional — El 80% de los bookers mira primero la foto.",
    "2. Bio con estilo y géneros — Explica qué tipo de eventos tocas.",
    "3. Comparte tu press kit — Agrégalo a tu bio de IG.",
    "",
    `Revisar mi press kit: ${profileUrl}`,
    `Dashboard: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 17. Retención: 60 días sin actividad (reengagement)
// ---------------------------------------------------------------------------

export function djRetencion60DiasEmailHtml(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  const novedades = [
    "Nuevo sistema de seguimientos en el CRM",
    "Smart Match — bookers que buscan tu estilo",
    "Press kit con sección de sets y mixes",
  ];
  const novedadesHtml = novedades.map(n => `
    <li style="font-size:14px; color:${MUTED}; margin-bottom:8px;">${n}</li>`).join("");
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Hace un tiempo que no te vemos por acá. Mientras estabas afuera, DROP. creció bastante.
              </p>
              <p style="font-size:13px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO}; margin:0 0 12px 0;">Novedades</p>
              <ul style="padding-left:20px; margin:0 0 24px 0;">
                ${novedadesHtml}
              </ul>
              <p style="margin:0 0 24px 0;">${ctaButton("Volver a DROP.", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Te esperamos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Hace tiempo que no te vemos — novedades en DROP.",
    preheader: "Smart Match, CRM mejorado y más. Echa un vistazo.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}

export function djRetencion60DiasEmailText(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Hace un tiempo que no te vemos por acá. Mientras estabas afuera, DROP. creció bastante.",
    "",
    "Novedades:",
    "- Nuevo sistema de seguimientos en el CRM",
    "- Smart Match — bookers que buscan tu estilo",
    "- Press kit con sección de sets y mixes",
    "",
    `Volver a DROP.: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 18. Retención: Aniversario en DROP.
// ---------------------------------------------------------------------------

export function djAniversarioEmailHtml(input: {
  djArtistName: string;
  yearsLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, yearsLabel, dashboardUrl } = input;
  const content = `
              <p style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Aniversario</p>
              <p style="font-size:26px; font-weight:700; color:${INK}; margin:0 0 20px 0; line-height:1.2;">
                ${escapeHtml(yearsLabel)} en DROP<span style="color:${ORANGE};">.</span>
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; color:${MUTED}; margin:0 0 24px 0;">
                Hoy se cumple exactamente ${escapeHtml(yearsLabel)} desde que te sumaste a DROP.
                Gracias por ser parte de esto desde el principio.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver mi perfil", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Con cariño,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `${yearsLabel} en DROP. — feliz aniversario`,
    preheader: `Hoy se cumple ${yearsLabel} desde que te sumaste. Gracias.`,
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}

export function djAniversarioEmailText(input: {
  djArtistName: string;
  yearsLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, yearsLabel, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Hoy se cumple exactamente ${yearsLabel} desde que te sumaste a DROP.`,
    "Gracias por ser parte de esto desde el principio.",
    "",
    `Ver mi perfil: ${dashboardUrl}`,
    "",
    "--",
    "Con cariño, DROP. Team (dropgigs.com).",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 19. Operaciones: DJ suspendido — notificación al afectado
// ---------------------------------------------------------------------------

export function djSuspendidoEmailHtml(input: {
  djArtistName: string;
  reason?: string;
  contactEmail: string;
}): string {
  const { djArtistName, reason, contactEmail } = input;
  const reasonBlock = reason
    ? `<div style="background:${CREAM}; border-left:3px solid ${ORANGE}; padding:14px 18px; border-radius:4px; margin:0 0 24px 0;">
        <p style="font-size:13px; color:${MUTED}; margin:0 0 4px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Motivo</p>
        <p style="font-size:14px; color:${INK}; margin:0;">${escapeHtml(reason)}</p>
       </div>`
    : "";
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Tu cuenta en DROP. ha sido <strong>suspendida temporalmente</strong> por nuestro equipo de moderación.
              </p>
              ${reasonBlock}
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Si crees que esto es un error o quieres más información, escríbenos a
                <a href="mailto:${escapeHtml(contactEmail)}" style="color:${INK};">${escapeHtml(contactEmail)}</a>
                y lo revisamos.
              </p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu cuenta en DROP. ha sido suspendida",
    preheader: "Información importante sobre tu cuenta.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta en DROP. (dropgigs.com).",
  });
}

export function djSuspendidoEmailText(input: {
  djArtistName: string;
  reason?: string;
  contactEmail: string;
}): string {
  const { djArtistName, reason, contactEmail } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tu cuenta en DROP. ha sido suspendida temporalmente por nuestro equipo de moderación.",
    ...(reason ? ["", `Motivo: ${reason}`] : []),
    "",
    `Si crees que esto es un error, escríbenos a ${contactEmail}.`,
    "",
    "--",
    "DROP. Team (dropgigs.com).",
  ].join("\n");
}

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

// ---------------------------------------------------------------------------
// 24. CRM: follow-up vence mañana
// ---------------------------------------------------------------------------

export function followUpProximoEmailHtml(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 20px 0;">
                Tienes un seguimiento programado para <strong>mañana</strong> con <strong>${escapeHtml(contactName)}</strong>.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:18px 20px; margin:0 0 28px 0;">
                <p style="font-size:11px; color:${MUTED}; margin:0 0 6px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Fecha · ${escapeHtml(dueDateLabel)}</p>
                <p style="font-size:14px; color:${INK}; margin:0; font-style:italic;">"${escapeHtml(note)}"</p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Ir al CRM", input.dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Seguimiento mañana con ${contactName}`,
    preheader: `Recordatorio: tienes un follow-up pendiente para ${dueDateLabel}.`,
    content,
    footerReason: "Recibes este recordatorio porque tienes seguimientos activos en DROP. (dropgigs.com).",
  });
}

export function followUpProximoEmailText(input: {
  djArtistName: string;
  contactName: string;
  dueDateLabel: string;
  note: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, dueDateLabel, note, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Tienes un seguimiento programado para mañana (${dueDateLabel}) con ${contactName}.`,
    `Nota: "${note}"`,
    "",
    `Ir al CRM: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este recordatorio porque tienes seguimientos activos en DROP. (dropgigs.com).",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 25. CRM: contacto sin actividad en 90 días
// ---------------------------------------------------------------------------

export function contactoInactivoEmailHtml(input: {
  djArtistName: string;
  contactName: string;
  lastActivityLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, lastActivityLabel, dashboardUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                No hay actividad con <strong>${escapeHtml(contactName)}</strong> desde <strong>${escapeHtml(lastActivityLabel)}</strong>.
              </p>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                ¿Vale la pena retomar el contacto? Un mensaje corto puede reactivar la relación.
              </p>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver contacto", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `${contactName} lleva 90 días sin actividad`,
    preheader: "Puede ser momento de retomar el contacto.",
    content,
    footerReason: "Recibes este aviso porque tienes contactos en tu CRM de DROP. (dropgigs.com).",
  });
}

export function contactoInactivoEmailText(input: {
  djArtistName: string;
  contactName: string;
  lastActivityLabel: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, contactName, lastActivityLabel, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `No hay actividad con ${contactName} desde ${lastActivityLabel}.`,
    "¿Vale la pena retomar el contacto? Un mensaje corto puede reactivar la relación.",
    "",
    `Ver contacto: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este aviso porque tienes contactos en tu CRM de DROP. (dropgigs.com).",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 26. Calendario: recordatorio 7 días antes del show
// ---------------------------------------------------------------------------

export function eventoEn7DiasEmailHtml(input: {
  djArtistName: string;
  eventDate: string;
  venue?: string;
  amountClp?: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, eventDate, venue, amountClp, dashboardUrl } = input;
  const venueRow = venue
    ? `<tr><td style="padding:10px 0; border-bottom:1px solid ${BORDER};"><span style="font-size:11px; color:${MUTED}; text-transform:uppercase; font-family:${FONT_MONO};">Lugar</span><p style="font-size:14px; color:${INK}; margin:4px 0 0 0;">${escapeHtml(venue)}</p></td></tr>`
    : "";
  const amountRow = amountClp
    ? `<tr><td style="padding:10px 0;"><span style="font-size:11px; color:${MUTED}; text-transform:uppercase; font-family:${FONT_MONO};">Monto acordado</span><p style="font-size:14px; color:${INK}; font-weight:600; margin:4px 0 0 0;">$${amountClp.toLocaleString("es-CL")} CLP</p></td></tr>`
    : "";
  const content = `
              <p style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Faltan 7 días</p>
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 20px 0;">Tu próximo evento es en una semana. Aquí tienes todos los detalles:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER}; border-radius:6px; padding:4px 16px; margin:0 0 28px 0;">
                <tr><td style="padding:10px 0; border-bottom:1px solid ${BORDER};"><span style="font-size:11px; color:${MUTED}; text-transform:uppercase; font-family:${FONT_MONO};">Fecha</span><p style="font-size:14px; color:${INK}; font-weight:600; margin:4px 0 0 0;">${escapeHtml(eventDate)}</p></td></tr>
                ${venueRow}
                ${amountRow}
              </table>
              <p style="margin:0 0 24px 0;">${ctaButton("Ver en mi calendario", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: `Tu evento es en 7 días — ${eventDate}`,
    preheader: "Repasa los detalles antes del show.",
    content,
    footerReason: "Recibes este recordatorio porque tienes un evento agendado en DROP. (dropgigs.com).",
  });
}

export function eventoEn7DiasEmailText(input: {
  djArtistName: string;
  eventDate: string;
  venue?: string;
  amountClp?: number;
  dashboardUrl: string;
}): string {
  const { djArtistName, eventDate, venue, amountClp, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    `Tu próximo evento es el ${eventDate}.`,
    ...(venue ? [`Lugar: ${venue}`] : []),
    ...(amountClp ? [`Monto: $${amountClp.toLocaleString("es-CL")} CLP`] : []),
    "",
    `Ver en mi calendario: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este recordatorio porque tienes un evento agendado en DROP. (dropgigs.com).",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 27. Press kit: DJ sin slug configurado
// ---------------------------------------------------------------------------

export function djSinSlugEmailHtml(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djArtistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Tu press kit todavía no tiene una URL personalizada. En este momento tu link es
                largo y difícil de recordar.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 24px 0;">
                <p style="font-size:13px; color:${MUTED}; margin:0 0 6px 0; text-transform:uppercase; letter-spacing:0.1em; font-family:${FONT_MONO};">Con tu slug</p>
                <p style="font-size:15px; color:${INK}; font-weight:600; font-family:${FONT_MONO}; margin:0;">dropgigs.com/dj/<span style="color:${ORANGE};">tu-nombre</span></p>
              </div>
              <p style="margin:0 0 24px 0;">${ctaButton("Configurar mi URL", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu press kit no tiene URL personalizada",
    preheader: "dropgigs.com/dj/tu-nombre — configúralo en 30 segundos.",
    content,
    footerReason: "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
  });
}

export function djSinSlugEmailText(input: {
  djArtistName: string;
  dashboardUrl: string;
}): string {
  const { djArtistName, dashboardUrl } = input;
  return [
    `Hola ${djArtistName},`,
    "",
    "Tu press kit todavía no tiene una URL personalizada.",
    "Con un slug queda así: dropgigs.com/dj/tu-nombre",
    "",
    `Configurar mi URL: ${dashboardUrl}`,
    "",
    "--",
    "Recibes este mensaje porque tienes una cuenta activa en DROP. (dropgigs.com).",
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
// 30. Onboarding: DJ recién aprobado — primeros pasos
// ---------------------------------------------------------------------------

export function djOnboardingEmailHtml(input: {
  djArtistName: string;
  dashboardUrl: string;
  pressKitUrl: string;
}): string {
  const { djArtistName, dashboardUrl, pressKitUrl } = input;
  const pasos = [
    ["01", "Sube tu foto", "La primera impresión lo es todo. Usa una foto de alta calidad."],
    ["02", "Escribe tu bio", "Cuéntale a los bookers qué tipo de eventos tocas y cuál es tu estilo."],
    ["03", "Agrega tus géneros y ciudad", "Así apareces en las búsquedas de bookers cercanos."],
    ["04", "Configura tu URL", `Tu link quedará así: ${pressKitUrl}`],
    ["05", "Comparte tu press kit", "Agrégalo a tu bio de Instagram. Cada visita es un posible booking."],
  ];
  const pasosHtml = pasos.map(([num, title, desc]) => `
    <tr>
      <td style="padding:14px 0; border-bottom:1px solid ${BORDER}; vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px; vertical-align:top; padding-top:2px;">
            <span style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; font-weight:700;">${num}</span>
          </td>
          <td>
            <p style="font-size:14px; font-weight:600; color:${INK}; margin:0 0 3px 0;">${title}</p>
            <p style="font-size:13px; color:${MUTED}; margin:0;">${escapeHtml(desc)}</p>
          </td>
        </tr></table>
      </td>
    </tr>`).join("");
  const content = `
              <p style="font-size:11px; color:${ORANGE}; font-family:${FONT_MONO}; text-transform:uppercase; letter-spacing:0.15em; margin:0 0 8px 0;">Bienvenido a DROP.</p>
              <p style="font-size:24px; font-weight:700; color:${INK}; margin:0 0 20px 0; line-height:1.2;">
                Hola ${escapeHtml(djArtistName)},<br>estás dentro.
              </p>
              <p style="font-size:15px; color:${MUTED}; margin:0 0 24px 0;">
                Tu cuenta está aprobada. Sigue estos 5 pasos para empezar a recibir bookings:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                ${pasosHtml}
              </table>
              <p style="margin:0 0 24px 0;">${ctaButton("Completar mi perfil", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">
                Cualquier duda, responde este email.<br>
                DROP<span style="color:${ORANGE};">.</span> Team
              </p>`;
  return wrapEmail({
    title: "Tu acceso a DROP. está listo — 5 pasos para empezar",
    preheader: "Cuenta aprobada. Completa tu perfil y empieza a recibir bookings.",
    content,
    footerReason: "Recibes este mensaje porque tu solicitud a DROP. fue aprobada (dropgigs.com).",
  });
}

export function djOnboardingEmailText(input: {
  djArtistName: string;
  dashboardUrl: string;
  pressKitUrl: string;
}): string {
  const { djArtistName, dashboardUrl, pressKitUrl } = input;
  return [
    `Hola ${djArtistName}, estás dentro.`,
    "",
    "Tu cuenta está aprobada. 5 pasos para empezar:",
    "",
    "01. Sube tu foto — la primera impresión lo es todo.",
    "02. Escribe tu bio — cuéntale a los bookers tu estilo.",
    "03. Agrega géneros y ciudad — para aparecer en búsquedas.",
    `04. Configura tu URL — quedará: ${pressKitUrl}`,
    "05. Comparte tu press kit — agrégalo a tu bio de IG.",
    "",
    `Completar mi perfil: ${dashboardUrl}`,
    "",
    "Cualquier duda, responde este email.",
    "--",
    "DROP. Team (dropgigs.com).",
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

// ---------------------------------------------------------------------------
// 33. DJ hito 10 bookings — felicitación por milestone
// ---------------------------------------------------------------------------

export function djHito10BookingsEmailHtml(input: {
  djName: string;
  profileUrl: string;
}): string {
  const { djName, profileUrl } = input;
  const content = `
              <p style="font-size:16px; margin:0 0 20px 0;">Hola ${escapeHtml(djName)},</p>
              <div style="text-align:center; margin:0 0 32px 0;">
                <p style="font-size:48px; margin:0 0 8px 0; line-height:1;">🎉</p>
                <p style="font-size:22px; font-weight:700; color:${INK}; margin:0; letter-spacing:-0.02em;">
                  10 bookings recibidos
                </p>
              </div>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Acabas de alcanzar un hito real. Tu perfil en DROP. ha generado
                <strong>10 solicitudes de booking</strong> — lo que significa que hay gente
                que te busca, te encuentra y quiere trabajar contigo.
              </p>
              <div style="background:${CREAM}; border-radius:6px; padding:16px 20px; margin:0 0 24px 0; border-left:3px solid ${ORANGE};">
                <p style="font-size:14px; color:${INK}; margin:0;">
                  Un perfil completo con fotos, géneros y audio samples convierte
                  hasta <strong>3× más</strong> que uno sin contenido. Sigue sumando.
                </p>
              </div>
              <p style="font-size:14px; color:${MUTED}; margin:0 0 24px 0;">
                Revisa tu inbox — puede que haya solicitudes nuevas esperando respuesta.
              </p>
              <p style="margin:0 0 28px 0;">${ctaButton("Ver mi perfil", profileUrl)}</p>
              <p style="font-size:15px; margin:0;">DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "10 bookings. Un hito real.",
    preheader: "Tu perfil generó 10 solicitudes. Así se construye una carrera.",
    content,
    footerReason: "Recibes este mensaje porque eres DJ en DROP. (dropgigs.com).",
  });
}

export function djHito10BookingsEmailText(input: {
  djName: string;
  profileUrl: string;
}): string {
  const { djName, profileUrl } = input;
  return [
    `Hola ${djName},`,
    "",
    "🎉 10 bookings recibidos",
    "",
    "Acabas de alcanzar un hito real. Tu perfil en DROP. ha generado 10 solicitudes de booking",
    "— lo que significa que hay gente que te busca, te encuentra y quiere trabajar contigo.",
    "",
    "Un perfil completo convierte hasta 3× más que uno sin contenido. Sigue sumando.",
    "",
    "Revisa tu inbox — puede que haya solicitudes nuevas esperando respuesta.",
    "",
    `Ver mi perfil: ${profileUrl}`,
    "",
    "--",
    "Recibes este mensaje porque eres DJ en DROP. (dropgigs.com).",
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
