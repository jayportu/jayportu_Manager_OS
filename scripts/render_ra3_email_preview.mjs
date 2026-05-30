// Script local · Renderiza el email del cron RA-3 con data de ejemplo y
// lo escupe a drop_ra3_email_preview.html para que abras en el navegador
// y veas EXACTAMENTE lo que le llegaría a un booker.
//
// Uso: node scripts/render_ra3_email_preview.mjs

import { writeFileSync } from "node:fs";

// Replicamos escapeHtml del template (los .ts no se pueden importar
// directamente desde Node sin compilar — lo más simple es duplicar).
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Copia del template followUpdatesEmailHtml ───────────────────────
function followUpdatesEmailHtml(input) {
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

// ─── Sample input (3 escenarios de ejemplo) ──────────────────────────

const SAMPLE = {
  bookerName: "Fernanda",
  djArtistName: "Pablo Rocha",
  djSlug: "jay-01a16e87",
  siteUrl: "https://dropgigs.com",
  updates: [
    {
      type: "show_scheduled",
      title: "Agendó un show nuevo",
      detail: "OPEN AIR Norte · 12 de julio de 2026",
    },
    {
      type: "availability_updated",
      title: "Publicó disponibilidad nueva",
      detail: "12 de julio — 30 de agosto",
    },
  ],
};

// Wrapper para que el preview no se vea contra fondo blanco puro:
const inner = followUpdatesEmailHtml(SAMPLE);
const wrapped = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Preview · email RA-3</title>
<style>
  body { background: #f0eadf; margin: 0; padding: 32px 16px; }
  .header {
    max-width: 600px;
    margin: 0 auto 16px;
    font-family: 'Space Mono', monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #6B6B6B;
    text-transform: uppercase;
    background: #fff;
    border: 2px solid #0A0A0A;
    padding: 10px 14px;
  }
  .header b { color: #0A0A0A; }
  .header .orange { color: #FF5C00; }
  .frame { max-width: 600px; margin: 0 auto; background: #fff; border: 2px solid #0A0A0A; box-shadow: 10px 10px 0 0 #FF5C00; }
</style>
</head>
<body>
  <div class="header">
    <div><b>DE:</b> DROP<span class="orange">.</span> Team &lt;noreply@drop.gigs&gt;</div>
    <div><b>PARA:</b> fernanda@ejemplo.com</div>
    <div><b>ASUNTO:</b> Pablo Rocha actualizó su agenda</div>
  </div>
  <div class="frame">${inner}</div>
</body>
</html>`;

writeFileSync("drop_ra3_email_preview.html", wrapped, "utf8");
console.log("OK · escrito: drop_ra3_email_preview.html");
