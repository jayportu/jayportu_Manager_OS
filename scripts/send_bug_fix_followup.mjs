/**
 * Script one-shot para mandar un Bug Fix Followup via Resend API.
 * Reimplementa wrapEmail + ctaButton + bugFixFollowupEmailHtml (copia
 * 1:1 de src/lib/email/templates.ts, sin "server-only" para correr standalone).
 *
 * Uso:
 *   RESEND_API_KEY=re_xxx node scripts/send_bug_fix_followup.mjs \
 *     --to mrbelixza@gmail.com \
 *     --name Belixza \
 *     --bug "la fecha del calendario" \
 *     --summary "Ya está arreglado: ..." \
 *     --check "Tu agenda|https://dropgigs.com/calendario" \
 *     --dashboard https://dropgigs.com/calendario
 *
 * Múltiples --check pueden pasarse repitiendo el flag. Formato "label|url".
 */

// Parse argv
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    if (k === "check") {
      args.checks = args.checks || [];
      args.checks.push(process.argv[++i]);
    } else {
      args[k] = process.argv[++i];
    }
  }
}

const apiKey = process.env.RESEND_API_KEY;
const to = args.to;
const artistName = args.name;
const bugTitle = args.bug;
const fixSummary = args.summary;
const dashboardUrl = args.dashboard || "https://dropgigs.com/dashboard";
const checks = (args.checks || []).map((s) => {
  const i = s.indexOf("|");
  return { label: s.slice(0, i), url: s.slice(i + 1) };
});

if (!apiKey || !to || !artistName || !bugTitle || !fixSummary) {
  console.error(
    "Usage: RESEND_API_KEY=re_xxx node scripts/send_bug_fix_followup.mjs --to <email> --name <artist> --bug <title> --summary <text> --check <label|url> [--check ...] [--dashboard <url>]"
  );
  process.exit(1);
}

// ── Tokens & helpers (copia 1:1 de src/lib/email/templates.ts) ────────────
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
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${FONT_SANS}; color:${INK};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden; mso-hide:all; height:0; width:0; font-size:0; line-height:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM};"><tr><td align="center" style="padding:24px 16px 40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background:#ffffff; border:1px solid ${BORDER}; border-radius:6px;">
      <tr><td align="center" style="background:${INK}; padding:36px 24px 32px 24px; border-radius:6px 6px 0 0;">
        <a href="https://dropgigs.com" style="text-decoration:none; display:inline-block;"><img src="${WORDMARK_URL}" alt="DROP." width="200" height="84" style="display:block; margin:0 auto; width:200px; height:auto; max-width:200px; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;" /></a>
        <div style="font-family:${FONT_MONO}; font-size:10px; color:${MUTED}; letter-spacing:0.3em; margin-top:14px; text-transform:uppercase;">— The DJ OS —</div>
      </td></tr>
      <tr><td style="padding:32px 32px 16px 32px; font-family:${FONT_SANS}; color:${INK}; line-height:1.5;">${content}</td></tr>
      <tr><td style="padding:20px 32px 28px 32px; border-top:1px solid ${BORDER};">
        <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; line-height:1.5; margin:12px 0 8px 0;">${footerReason}</p>
        <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; margin:8px 0 0 0;">DROP<span style="color:${ORANGE};">.</span> — Santiago, Chile · <a href="https://dropgigs.com" style="color:${MUTED}; text-decoration:underline;">dropgigs.com</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// ── Render bugFixFollowupEmailHtml ────────────────────────────────────────
const pointsHtml = checks
  .map(
    (p) => `
                <li style="margin:0 0 10px 0;">
                  <strong>${escapeHtml(p.label)}</strong><br/>
                  <a href="${p.url}" style="color:${INK}; text-decoration:underline; font-size:13px;">${p.url}</a>
                </li>`
  )
  .join("");

const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Antes que nada, <strong>gracias por avisar del problema con ${escapeHtml(bugTitle)}</strong>. Reportes así son lo que más me ayuda a mejorar DROP durante esta beta.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">${escapeHtml(fixSummary)}</p>
              <p style="font-size:15px; margin:0 0 12px 0;">Te invito a chequear que todo se vea como esperás en estos lugares:</p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">${pointsHtml}</ol>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Si algo todavía no calza, respondes este correo y lo seguimos puliendo. Cualquier feedback adicional es bienvenido.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">${ctaButton("Abrir DROP", dashboardUrl)}</p>
              <p style="font-size:15px; margin:0;">Saludos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;

const html = wrapEmail({
  title: `Tu reporte: ${bugTitle}`,
  preheader: `Gracias por avisar. Tu reporte ya tiene una respuesta — chequéalo.`,
  content,
  footerReason:
    'Recibes este correo porque reportaste un bug en la beta de DROP. y queremos cerrarte el loop. Si prefieres no recibir más, respondes "unsubscribe".',
});

const text = `Hola ${artistName},

Antes que nada, gracias por avisar del problema con ${bugTitle}. Reportes así son lo que más me ayuda a mejorar DROP durante esta beta.

${fixSummary}

Te invito a chequear que todo se vea como esperás en estos lugares:

${checks.map((p, i) => `${i + 1}. ${p.label} — ${p.url}`).join("\n")}

Si algo todavía no calza, respondes este correo y lo seguimos puliendo. Cualquier feedback adicional es bienvenido.

Abrir DROP: ${dashboardUrl}

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque reportaste un bug en la beta. Si no quieres más, respondes "unsubscribe".`;

const payload = {
  from: "DROP. <hola@dropgigs.com>",
  to: [to],
  reply_to: "hola@dropgigs.com",
  subject: `Tu reporte: ${bugTitle}`,
  html,
  text,
};

console.log(`Sending bug fix followup to ${to}...`);
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
