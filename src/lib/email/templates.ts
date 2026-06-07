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
  return `<a href="${url}" style="display:inline-block; padding:14px 22px; background:${INK}; color:${ORANGE}; text-decoration:none; font-family:${FONT_MONO}; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; border:2px solid ${INK}; border-radius:2px;">${escapeHtml(label)} →</a>`;
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
                Si el botón no funciona, copia este link: ${input.inviteUrl}
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
                Si el botón no funciona, copia este link: ${input.inviteUrl}
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
// 2. Needs Beta Request (cuentas huérfanas)
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
                Si el botón no funciona, copia este link: ${input.betaUrl}
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
                  <a href="${p.url}" style="color:${INK}; text-decoration:underline; font-size:13px;">${p.url}</a>
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
                Te invito a chequear que todo se vea como esperás en estos lugares:
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

Te invito a chequear que todo se vea como esperás en estos lugares:

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
              <p style="font-size:15px; margin:0 0 12px 0;">Subila en 30 segundos:</p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 8px 0;">Abrí tu perfil en DROP.</li>
                <li style="margin:0 0 8px 0;">Click en el círculo gris arriba (donde van las iniciales).</li>
                <li style="margin:0 0 8px 0;">Elegí una foto cuadrada — JPG o PNG, hasta 10&nbsp;MB.</li>
              </ol>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Subir mi foto", input.profileUrl)}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                Tip: usá una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil. La misma queda como avatar en toda la app + en tu press kit público.
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

Subila en 30 segundos:
1. Abrí tu perfil en DROP.
2. Click en el círculo gris arriba (donde van las iniciales).
3. Elegí una foto cuadrada — JPG o PNG, hasta 10 MB.

Subir mi foto: ${input.profileUrl}

Tip: usá una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil. La misma queda como avatar en toda la app + en tu press kit público.

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
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
