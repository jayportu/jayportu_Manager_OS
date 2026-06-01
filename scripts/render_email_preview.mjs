/**
 * Script local para previsualizar el diseño de los emails brandeados
 * sin tener que deployar. Reimplementa wrapEmail() + los 5 templates
 * (sin "server-only" para que corra standalone) y genera un archivo HTML
 * con 5 ejemplos uno debajo del otro.
 *
 * Uso:
 *   node scripts/render_email_preview.mjs
 *   open drop_email_preview.html
 *
 * Para el preview LOCAL, la URL del logo se sustituye por el path absoluto
 * al PNG en disco (file://). Así el preview funciona aunque Vercel todavía
 * no haya deployado.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Path absoluto al wordmark local
const WORDMARK_LOCAL_PATH = resolve(
  process.cwd(),
  "public/brand/wordmark-light.png"
);
const WORDMARK_URL = `file://${WORDMARK_LOCAL_PATH}`;

// ──────────────────────────────────────────────────────────────────────────
// Tokens (mismos de templates.ts)
// ──────────────────────────────────────────────────────────────────────────

const INK = "#0A0A0A";
const CREAM = "#F4EFE7";
const ORANGE = "#FF5C00";
const MUTED = "#7A7670";
const BORDER = "#E5E1D8";

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
const FONT_MONO = "Consolas,'Courier New',monospace";

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ctaButton(label, url) {
  return `<a href="${url}" style="display:inline-block; padding:14px 22px; background:${INK}; color:${ORANGE}; text-decoration:none; font-family:${FONT_MONO}; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; border:2px solid ${INK}; border-radius:2px;">${escapeHtml(label)} →</a>`;
}

function wrapEmail({ title, preheader = "", content, footerReason }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${FONT_SANS}; color:${INK};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM};">
    <tr>
      <td align="center" style="padding:24px 16px 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background:#ffffff; border:1px solid ${BORDER}; border-radius:6px;">
          <tr>
            <td align="center" style="background:${INK}; padding:36px 24px 32px 24px; border-radius:6px 6px 0 0;">
              <a href="https://dropgigs.com" style="text-decoration:none; display:inline-block;">
                <img src="${WORDMARK_URL}" alt="DROP." width="200" height="84" style="display:block; margin:0 auto; width:200px; height:auto; max-width:200px; border:0; outline:none; text-decoration:none;" />
              </a>
              <div style="font-family:${FONT_MONO}; font-size:10px; color:${MUTED}; letter-spacing:0.3em; margin-top:14px; text-transform:uppercase;">
                — The DJ OS —
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 16px 32px; font-family:${FONT_SANS}; color:${INK}; line-height:1.5;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px; border-top:1px solid ${BORDER};">
              <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; line-height:1.5; margin:12px 0 8px 0;">${footerReason}</p>
              <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; margin:8px 0 0 0;">
                DROP<span style="color:${ORANGE};">.</span> — Santiago, Chile · <a href="https://dropgigs.com" style="color:${MUTED}; text-decoration:underline;">dropgigs.com</a>
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

// ──────────────────────────────────────────────────────────────────────────
// 5 ejemplos con datos sample
// ──────────────────────────────────────────────────────────────────────────

const SAMPLES = [
  {
    label: "1 · Beta Invite (acceso aprobado)",
    html: wrapEmail({
      title: "Tu acceso a DROP.",
      preheader: "Tu acceso a la beta cerrada de DROP. está listo, Mauro.",
      content: `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola Mauro,</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Te confirmo tu acceso a DROP, el sistema operativo que estoy construyendo para DJs independientes. Estás aprobado para la beta cerrada de 15 días.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">Para activar tu cuenta, abre el siguiente enlace:</p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Activar mi cuenta", "https://dropgigs.com/login?invite=abc123")}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 24px 0;">
                Si el botón no funciona, copia este link: https://dropgigs.com/login?invite=abc123
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
              <p style="font-size:15px; margin:0;">Saludos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`,
      footerReason:
        "Recibes este email porque solicitaste acceso a la beta de DROP. en dropgigs.com/beta. Si no fuiste tú, puedes ignorar este mensaje — sin acción de tu parte no se crea ninguna cuenta.",
    }),
  },
  {
    label: "2 · Beta Reminder (días restantes)",
    html: wrapEmail({
      title: "Tu beta de DROP. — 7 días restantes",
      preheader: "Te quedan 7 días de tu beta cerrada. Tres cosas que ayudan estos días.",
      content: `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola Mauro,</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Quería pasarme rápido a saber cómo va. Te quedan <strong>7 días</strong> de tu beta cerrada de DROP.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">Tres cosas que ayudan un montón estos días:</p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 10px 0;"><strong>Sigue usándolo.</strong> La beta vive de que lo rompas y uses todo.</li>
                <li style="margin:0 0 10px 0;"><strong>Repórtame cualquier bug</strong> respondiendo este correo y me llega directo. Cada bug que encuentras evita que otros lo sufran.</li>
                <li style="margin:0 0 10px 0;"><strong>Ideas, feedback, lo que te frustra</strong> — eso define qué construyo primero.</li>
              </ol>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Dentro de la app también hay un botón flotante de feedback si prefieres dejarlo ahí.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Abrir DROP", "https://dropgigs.com/dashboard")}
              </p>
              <p style="font-size:15px; margin:0;">Saludos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`,
      footerReason:
        'Recibes este correo porque estás participando en la beta cerrada de DROP. Si prefieres no recibir más mensajes, respondes "unsubscribe" y te quito de la lista.',
    }),
  },
  {
    label: "3 · Follow Update (digest a booker)",
    html: wrapEmail({
      title: "Lucia Rodríguez actualizó su agenda",
      preheader: "Novedades de Lucia Rodríguez en DROP.",
      content: `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola Fernanda,</p>
              <p style="font-size:15px; margin:0 0 16px 0;"><strong>Lucia Rodríguez</strong>, que sigues, tiene novedades:</p>
              <ul style="font-size:15px; margin:0 0 20px 20px; padding:0; list-style:none;">
                <li style="margin:0 0 12px 0;">
                  <strong>Agendó un show nuevo</strong><br/>
                  <span style="color:${MUTED}; font-size:14px;">OPEN AIR Norte · 12 de julio de 2026</span>
                </li>
                <li style="margin:0 0 12px 0;">
                  <strong>Actualizó su disponibilidad</strong><br/>
                  <span style="color:${MUTED}; font-size:14px;">Open para bookings de agosto en adelante</span>
                </li>
              </ul>
              <p style="font-size:15px; margin:0 0 24px 0;">
                ${ctaButton("Ver perfil de Lucia Rodríguez", "https://dropgigs.com/p/lucia-rodriguez")}
              </p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                ¿Recibes muchos avisos? Puedes pausar las notificaciones desde el perfil del DJ o desde tu feed de seguidos en DROP.
              </p>
              <p style="font-size:15px; margin:0;">Saludos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`,
      footerReason:
        "Recibes este email porque sigues a Lucia Rodríguez con avisos activados en DROP. Puedes pausarlos en cualquier momento desde su perfil.",
    }),
  },
];

// ──────────────────────────────────────────────────────────────────────────
// Render a un solo HTML con todos los samples uno debajo del otro
// ──────────────────────────────────────────────────────────────────────────

const previewHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>DROP. — Email Templates Preview</title>
  <style>
    body { margin:0; padding:0; background:#1c1c1c; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif; color:#F4EFE7; }
    .header { padding:32px 24px; background:#0A0A0A; border-bottom:1px solid #333; }
    .header h1 { font-family:Impact,'Arial Black',sans-serif; font-size:36px; color:#F4EFE7; margin:0; letter-spacing:-1px; }
    .header .dot { color:#FF5C00; }
    .header p { color:#9a9a9a; margin:8px 0 0 0; font-size:13px; }
    .label { padding:16px 24px; color:#F4EFE7; font-size:14px; font-weight:600; background:#0A0A0A; border-top:1px solid #333; }
    .label .badge { color:#FF5C00; font-family:Consolas,monospace; }
    iframe { display:block; border:0; width:100%; height:1200px; background:#F4EFE7; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DROP<span class="dot">.</span> — Email Preview</h1>
    <p>3 ejemplos de templates brandeados (uso real con sample data). Logo desde disco local — funcionará igual en prod cuando termine el deploy de Vercel.</p>
  </div>
${SAMPLES.map((s, i) => `
  <div class="label"><span class="badge">▸</span> ${s.label}</div>
  <iframe srcdoc='${s.html.replace(/'/g, "&apos;")}' loading="lazy"></iframe>`).join("\n")}
</body>
</html>`;

const outPath = resolve(process.cwd(), "drop_email_preview.html");
writeFileSync(outPath, previewHtml);

console.log(`✓ Preview generado: ${outPath}`);
console.log(`  Logo source: ${WORDMARK_URL}`);
console.log(`  Para ver: open drop_email_preview.html`);
