/**
 * Script one-shot para mandar un Beta Reminder de prueba via Resend API.
 * Reimplementa wrapEmail + ctaButton + betaReminderEmailHtml (copia del .ts,
 * sin "server-only" para correr standalone). Idéntico al HTML que la app
 * en producción manda — la única diferencia es que acá la API call no
 * pasa por src/lib/email/resend.ts, va directo a la API.
 *
 * Uso:
 *   RESEND_API_KEY=re_xxx node scripts/send_test_reminder.mjs <to-email> [days]
 *
 * Ejemplo:
 *   RESEND_API_KEY=re_xxx node scripts/send_test_reminder.mjs jaimeportugueis@gmail.com 15
 */

const apiKey = process.env.RESEND_API_KEY;
const to = process.argv[2];
const days = parseInt(process.argv[3] || "15", 10);

if (!apiKey || !to) {
  console.error(
    "Usage: RESEND_API_KEY=re_xxx node scripts/send_test_reminder.mjs <to-email> [days]"
  );
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────────────
// Tokens & helpers (copia 1:1 de src/lib/email/templates.ts)
// ──────────────────────────────────────────────────────────────────────────

const INK = "#0A0A0A";
const CREAM = "#F4EFE7";
const ORANGE = "#FF5C00";
const MUTED = "#7A7670";
const BORDER = "#E5E1D8";

const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
const FONT_MONO = "Consolas,'Courier New',monospace";

const WORDMARK_URL = "https://dropgigs.com/brand/wordmark-light.png";

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
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${FONT_SANS}; color:${INK};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden; mso-hide:all; height:0; width:0; font-size:0; line-height:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM};">
    <tr>
      <td align="center" style="padding:24px 16px 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background:#ffffff; border:1px solid ${BORDER}; border-radius:6px;">
          <tr>
            <td align="center" style="background:${INK}; padding:36px 24px 32px 24px; border-radius:6px 6px 0 0;">
              <a href="https://dropgigs.com" style="text-decoration:none; display:inline-block;">
                <img src="${WORDMARK_URL}" alt="DROP." width="200" height="84" style="display:block; margin:0 auto; width:200px; height:auto; max-width:200px; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;" />
              </a>
              <div style="font-family:${FONT_MONO}; font-size:10px; color:${MUTED}; letter-spacing:0.3em; margin-top:14px; text-transform:uppercase;">— The DJ OS —</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 16px 32px; font-family:${FONT_SANS}; color:${INK}; line-height:1.5;">${content}</td>
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
// betaReminderEmailHtml + betaReminderEmailText (sample con datos de prueba)
// ──────────────────────────────────────────────────────────────────────────

const artistName = "Jaime";
const dashboardUrl = "https://dropgigs.com/dashboard";
const diasLabel = days === 1 ? "1 día" : `${days} días`;

const html = wrapEmail({
  title: `Tu beta de DROP. — ${diasLabel} restantes`,
  preheader: `Te quedan ${diasLabel} de tu beta cerrada. Tres cosas que ayudan estos días.`,
  content: `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Quería pasarme rápido a saber cómo va. Te quedan <strong>${diasLabel}</strong> de tu beta cerrada de DROP.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">Tres cosas que ayudan un montón estos días:</p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 10px 0;"><strong>Sigue usándolo.</strong> La beta vive de que lo rompas y uses todo.</li>
                <li style="margin:0 0 10px 0;"><strong>Repórtame cualquier bug</strong> respondiendo este correo y me llega directo. Cada bug que encuentras evita que otros lo sufran.</li>
                <li style="margin:0 0 10px 0;"><strong>Ideas, feedback, lo que te frustra</strong> — eso define qué construyo primero.</li>
              </ol>
              <p style="font-size:15px; margin:0 0 16px 0;">Dentro de la app también hay un botón flotante de feedback si prefieres dejarlo ahí.</p>
              <p style="font-size:15px; margin:0 0 24px 0;">${ctaButton("Abrir DROP", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Saludos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`,
  footerReason:
    'Recibes este correo porque estás participando en la beta cerrada de DROP. Si prefieres no recibir más mensajes, respondes "unsubscribe" y te quito de la lista.',
});

const text = `Hola ${artistName},

Quería pasarme rápido a saber cómo va. Te quedan ${diasLabel} de tu beta cerrada de DROP.

Tres cosas que ayudan un montón estos días:

1. Sigue usándolo. La beta vive de que lo rompas y uses todo.
2. Repórtame cualquier bug respondiendo este correo y me llega directo. Cada bug que encuentras evita que otros lo sufran.
3. Ideas, feedback, lo que te frustra — eso define qué construyo primero.

Dentro de la app también hay un botón flotante de feedback si prefieres dejarlo ahí.

Abrir DROP: ${dashboardUrl}

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque estás participando en la beta cerrada. Si no quieres más mensajes, respondes "unsubscribe" y te quito.`;

// ──────────────────────────────────────────────────────────────────────────
// Resend API call
// ──────────────────────────────────────────────────────────────────────────

const payload = {
  from: "DROP. <hola@dropgigs.com>",
  to: [to],
  reply_to: "hola@dropgigs.com",
  subject: `Tu beta de DROP. — ${diasLabel} restantes`,
  html,
  text,
};

console.log(`Sending to ${to}...`);

try {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`✗ Failed (HTTP ${res.status}):`, json);
    process.exit(1);
  }
  console.log(`✓ Sent! Email ID: ${json.id}`);
  console.log(`  Check inbox of ${to} in ~10-30 seconds.`);
} catch (err) {
  console.error(`✗ Network error:`, err.message);
  process.exit(1);
}
