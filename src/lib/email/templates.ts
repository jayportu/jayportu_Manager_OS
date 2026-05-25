import "server-only";

/**
 * Sprint 23.5 — Templates HTML de emails.
 *
 * Inline styles para máxima compatibilidad con clientes de email
 * (Gmail, Outlook, Apple Mail). Sin CSS externo. Paleta Type Beat.
 */

export function betaInviteEmailHtml(input: {
  artistName: string;
  inviteUrl: string;
  fromName?: string;
}): string {
  const fromName = input.fromName || "Jay Portu";
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bienvenido a la beta de DROP.</title>
</head>
<body style="margin:0; padding:0; background:#F4EFE7; font-family:-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif; color:#0A0A0A;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4EFE7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background:#ffffff; border:3px solid #0A0A0A;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <div style="font-family:'Space Mono',Consolas,monospace; font-size:11px; font-weight:700; letter-spacing:2px; color:#FF5C00; text-transform:uppercase;">— BIENVENIDO A LA BETA</div>
              <div style="font-family:Impact,'Anton',sans-serif; font-size:48px; line-height:0.9; letter-spacing:-1px; margin-top:8px;">
                DROP<span style="color:#FF5C00;">.</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="font-size:18px; line-height:1.4; margin:0 0 16px 0;">
                Hola <strong>${escapeHtml(input.artistName)}</strong>,
              </p>
              <p style="font-size:15px; line-height:1.55; margin:0 0 16px 0;">
                Estás dentro. Te aprobamos para la beta cerrada de DROP —
                el sistema operativo para DJs independientes.
              </p>
              <p style="font-size:15px; line-height:1.55; margin:0 0 24px 0;">
                Tienes <strong>15 días</strong> de acceso completo. Cero restricciones.
                Para entrar, haz click en el botón de abajo: te lleva al login,
                ingresas tu email, te llega un magic link, y listo.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
                <tr>
                  <td>
                    <a href="${input.inviteUrl}"
                       style="display:inline-block; padding:14px 28px; background:#FF5C00; color:#0A0A0A; border:3px solid #0A0A0A; text-decoration:none; font-family:'Space Mono',Consolas,monospace; font-size:13px; font-weight:700; letter-spacing:2px; text-transform:uppercase; box-shadow:5px 5px 0 0 #0A0A0A;">
                      ENTRAR A DROP →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px; line-height:1.5; color:#7A7670; margin:0 0 8px 0;">
                Si el botón no funciona, copia y pega este link:
              </p>
              <p style="font-size:12px; line-height:1.5; word-break:break-all; margin:0 0 24px 0;">
                <a href="${input.inviteUrl}" style="color:#FF5C00;">${input.inviteUrl}</a>
              </p>

              <hr style="border:0; border-top:2px solid #0A0A0A; margin:24px 0;" />

              <p style="font-size:14px; line-height:1.5; margin:0 0 12px 0;">
                <strong>¿Cómo se usa la beta?</strong>
              </p>
              <ul style="font-size:14px; line-height:1.6; margin:0 0 16px 0; padding-left:20px;">
                <li>Tu feedback decide el roadmap. Hay un botón flotante &ldquo;Feedback&rdquo; en cada pantalla.</li>
                <li>Te haré 2 preguntas cortas (día 7 y día 15) para medir si te sirve.</li>
                <li>Si te queda, tienes prioridad en el lanzamiento abierto.</li>
              </ul>

              <p style="font-size:14px; line-height:1.5; margin:24px 0 0 0;">
                Cualquier duda me escribes directo a este mismo email.
              </p>
              <p style="font-size:14px; line-height:1.5; margin:8px 0 0 0;">
                — ${escapeHtml(fromName)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:2px solid #0A0A0A; padding:16px 32px; background:#F4EFE7;">
              <div style="font-family:'Space Mono',Consolas,monospace; font-size:10px; letter-spacing:2px; color:#7A7670; text-transform:uppercase; text-align:center;">
                DROP. · THE DJ OS · MADE IN SANTIAGO
              </div>
            </td>
          </tr>
        </table>

        <p style="font-size:11px; color:#7A7670; max-width:560px; line-height:1.5; margin:16px auto 0; padding:0 16px;">
          Recibes este email porque solicitaste acceso a la beta cerrada de DROP en drop.dj/beta.
          Si no fuiste tú, ignora este mensaje (sin tu acción, no se crea ninguna cuenta).
        </p>
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
  const fromName = input.fromName || "Jay Portu";
  return `Hola ${input.artistName},

Estás dentro. Te aprobamos para la beta cerrada de DROP — el sistema operativo para DJs independientes.

Tienes 15 días de acceso completo. Cero restricciones.

Para entrar, abre este link:
${input.inviteUrl}

Después: ingresas tu email, te llega un magic link, y listo.

¿Cómo se usa la beta?
- Tu feedback decide el roadmap. Hay un botón flotante "Feedback" en cada pantalla.
- Te haré 2 preguntas cortas (día 7 y día 15) para medir si te sirve.
- Si te queda, tienes prioridad en el lanzamiento abierto.

Cualquier duda me escribes directo a este mismo email.

— ${fromName}

—
DROP. · THE DJ OS · MADE IN SANTIAGO`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
