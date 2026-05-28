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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
