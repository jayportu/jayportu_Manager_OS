import "server-only";

/**
 * Sprint 23.5 — Templates HTML de emails.
 *
 * Diseñados para deliverability primero, estética después. Cambios vs
 * primera versión (que caía en spam por dominio sin reputación):
 *   - Sin emoji en subject (algunos filtros lo penalizan).
 *   - Sin caps lock en headlines (penalty fuerte de Gmail).
 *   - Menos peso de HTML decorativo: layout simple basado en texto,
 *     una sola CTA, sin grandes bloques de color.
 *   - HTML+plain text balanceados (mismo contenido).
 *   - Bordes y colores mínimos: el orange queda solo en accent point.
 *   - Sin palabras spammy típicas (FREE, URGENT, ACCESS NOW, click here).
 *
 * Inline styles para compatibilidad con Gmail/Outlook/Apple Mail.
 */

export function betaInviteEmailHtml(input: {
  artistName: string;
  inviteUrl: string;
  fromName?: string;
}): string {
  // Firma default: "DROP. Team" con el punto naranja matcheando el branding.
  // Si el caller pasa un fromName (futuro: firma personal), se escapa y usa tal cual.
  const signatureHtml = input.fromName
    ? escapeHtml(input.fromName)
    : `DROP<span style="color:#FF5C00;">.</span> Team`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Tu acceso a DROP</title>
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif; color:#0A0A0A; line-height:1.5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">

          <!-- Brand line discreta -->
          <tr>
            <td style="padding:0 8px 24px 8px;">
              <div style="font-size:13px; color:#555; letter-spacing:0.5px;">
                DROP<span style="color:#FF5C00;">.</span> &nbsp;—&nbsp; The DJ OS
              </div>
            </td>
          </tr>

          <!-- Body principal -->
          <tr>
            <td style="padding:0 8px;">
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
                <a href="${input.inviteUrl}" style="color:#0A0A0A; text-decoration:underline;">${input.inviteUrl}</a>
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
              </p>
            </td>
          </tr>

          <!-- Footer minimalista -->
          <tr>
            <td style="padding:32px 8px 0 8px; border-top:1px solid #E5E1D8; margin-top:32px;">
              <p style="font-size:12px; color:#7A7670; margin:16px 0 4px 0;">
                Recibes este email porque solicitaste acceso a la beta de DROP en jayportu-manager-os.vercel.app/beta. Si no fuiste tú, puedes ignorar este mensaje — sin acción de tu parte no se crea ninguna cuenta.
              </p>
              <p style="font-size:12px; color:#7A7670; margin:8px 0 0 0;">
                DROP — Santiago, Chile
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
DROP — The DJ OS — Santiago, Chile
Recibes este email porque solicitaste acceso a la beta en jayportu-manager-os.vercel.app/beta.`;
}

/**
 * Email recordatorio para usuarios beta activos. Personalizado por DJ con
 * nombre + días restantes. Mismas reglas anti-spam que betaInvite:
 *   - Sin caps en headlines / subject.
 *   - Sin emoji en subject.
 *   - HTML simple + plain text balanceado.
 *   - Footer con razón del email.
 */
export function betaReminderEmailHtml(input: {
  artistName: string;
  daysRemaining: number;
  dashboardUrl: string;
}): string {
  const dias = input.daysRemaining;
  const diasLabel = dias === 1 ? "1 día" : `${dias} días`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Tu beta de DROP — ${diasLabel} restantes</title>
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif; color:#0A0A0A; line-height:1.5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">

          <!-- Brand line discreta -->
          <tr>
            <td style="padding:0 8px 24px 8px;">
              <div style="font-size:13px; color:#555; letter-spacing:0.5px;">
                DROP<span style="color:#FF5C00;">.</span> &nbsp;—&nbsp; The DJ OS
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 8px;">
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
                <a href="${input.dashboardUrl}" style="color:#0A0A0A; text-decoration:underline;">Abrir DROP</a>
              </p>

              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:#FF5C00;">.</span> Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 8px 0 8px; border-top:1px solid #E5E1D8; margin-top:32px;">
              <p style="font-size:12px; color:#7A7670; margin:16px 0 4px 0;">
                Recibes este correo porque estás participando en la beta cerrada de DROP. Si prefieres no recibir más mensajes, respondes "unsubscribe" y te quito de la lista.
              </p>
              <p style="font-size:12px; color:#7A7670; margin:8px 0 0 0;">
                DROP — Santiago, Chile
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
DROP — The DJ OS — Santiago, Chile
Recibes este correo porque estás participando en la beta cerrada. Si no quieres más mensajes, respondes "unsubscribe" y te quito.`;
}

/**
 * Email puntual de agradecimiento + invitación a probar un fix específico.
 * Pensado para usuarios beta que reportaron un bug y queremos cerrarles el
 * loop cuando se deploya el arreglo. Tres "puntos a verificar" custom.
 */
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
                <strong>${escapeHtml(p.label)}</strong> —
                <a href="${p.url}" style="color:#0A0A0A; text-decoration:underline;">${p.url}</a>
              </li>`
    )
    .join("");
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Tu reporte: ${escapeHtml(input.bugTitle)}</title>
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif; color:#0A0A0A; line-height:1.5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td style="padding:0 8px 24px 8px;">
              <div style="font-size:13px; color:#555; letter-spacing:0.5px;">
                DROP<span style="color:#FF5C00;">.</span> &nbsp;—&nbsp; The DJ OS
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 8px;">
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.artistName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Antes que nada, <strong>gracias por avisar del problema con el tech rider</strong>. Reportes así son lo que más me ayuda a mejorar DROP durante esta beta.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                ${escapeHtml(input.fixSummary)}
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">
                Te invito a chequear que todo se vea como esperás en estos tres lugares:
              </p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                ${points}
              </ol>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Si algo todavía no calza, respondes este correo y lo seguimos puliendo. Cualquier feedback adicional es bienvenido.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                <a href="${input.dashboardUrl}" style="color:#0A0A0A; text-decoration:underline;">Abrir DROP</a>
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:#FF5C00;">.</span> Team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 8px 0 8px; border-top:1px solid #E5E1D8; margin-top:32px;">
              <p style="font-size:12px; color:#7A7670; margin:16px 0 4px 0;">
                Recibes este correo porque reportaste un bug en la beta de DROP y queremos cerrarte el loop. Si prefieres no recibir más, respondes "unsubscribe".
              </p>
              <p style="font-size:12px; color:#7A7670; margin:8px 0 0 0;">
                DROP — Santiago, Chile
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

Antes que nada, gracias por avisar del problema con el tech rider. Reportes así son lo que más me ayuda a mejorar DROP durante esta beta.

${input.fixSummary}

Te invito a chequear que todo se vea como esperás en estos tres lugares:

${points}

Si algo todavía no calza, respondes este correo y lo seguimos puliendo. Cualquier feedback adicional es bienvenido.

Abrir DROP: ${input.dashboardUrl}

Saludos,
DROP. Team

--
DROP — The DJ OS — Santiago, Chile
Recibes este correo porque reportaste un bug en la beta. Si no quieres más, respondes "unsubscribe".`;
}

/**
 * Sprint RA-3 — Email digest de updates de un DJ para sus followers.
 * Se manda diariamente vía cron a cada booker con notify_email=true,
 * agregando todos los updates del DJ en las últimas 24h.
 */
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
                  ? `<br/><span style="color:#7A7670; font-size:14px;">${escapeHtml(u.detail)}</span>`
                  : ""
              }
              </li>`
    )
    .join("");
  const profileUrl = `${input.siteUrl}/p/${input.djSlug}`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(input.djArtistName)} actualizó su agenda</title>
</head>
<body style="margin:0; padding:0; background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif; color:#0A0A0A; line-height:1.5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td style="padding:0 8px 24px 8px;">
              <div style="font-size:13px; color:#555; letter-spacing:0.5px;">
                DROP<span style="color:#FF5C00;">.</span> &nbsp;—&nbsp; The DJ OS
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 8px;">
              <p style="font-size:16px; margin:0 0 16px 0;">
                Hola ${escapeHtml(input.bookerName)},
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                <strong>${escapeHtml(input.djArtistName)}</strong>, que sigues, tiene novedades:
              </p>
              <ul style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                ${updatesHtml}
              </ul>
              <p style="font-size:15px; margin:0 0 24px 0;">
                <a href="${profileUrl}" style="display:inline-block; padding:12px 18px; background:#0A0A0A; color:#FF5C00; text-decoration:none; font-family:'Space Mono',monospace; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; border:2px solid #0A0A0A;">Ver perfil de ${escapeHtml(input.djArtistName)} →</a>
              </p>
              <p style="font-size:13px; color:#7A7670; margin:0 0 16px 0;">
                ¿Recibes muchos avisos? Puedes pausar las notificaciones desde el perfil del DJ o desde tu feed de seguidos en DROP.
              </p>
              <p style="font-size:15px; margin:0;">
                Saludos,<br>
                DROP<span style="color:#FF5C00;">.</span> Team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 8px 0 8px; border-top:1px solid #E5E1D8;">
              <p style="font-size:12px; color:#7A7670; margin:16px 0 4px 0;">
                Recibes este email porque sigues a ${escapeHtml(input.djArtistName)} con avisos activados en DROP. Puedes pausarlos en cualquier momento desde su perfil.
              </p>
              <p style="font-size:12px; color:#7A7670; margin:8px 0 0 0;">
                DROP — Santiago, Chile
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
DROP — The DJ OS — Santiago, Chile
Recibes este correo porque sigues a ${input.djArtistName} con avisos activados. Puedes pausarlos en cualquier momento desde su perfil.`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
