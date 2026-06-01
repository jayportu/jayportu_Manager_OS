/**
 * Manda recordatorios a los DJs beta que NO tienen avatar_url cargado.
 * Usa el template avatarReminderEmailHtml (header brandeado, CTA a /perfil).
 *
 * Filtros aplicados:
 *   - hidden_from_directory = false (perfiles públicos)
 *   - onboarding_completed_at NOT NULL (signup completo)
 *   - artist_name + public_slug NOT NULL
 *   - avatar_url IS NULL OR = ''  AND  hero_image_url IS NULL OR = ''
 *   - beta_status = 'active' (NO mandamos a expired/canceled)
 *
 * Por defecto corre en --dry: solo muestra la lista, no manda nada.
 * Pasar --send para mandar realmente.
 *
 * Uso:
 *   node scripts/send_avatar_reminder.mjs                # dry (preview)
 *   RESEND_API_KEY=re_xxx node scripts/send_avatar_reminder.mjs --send
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DRY = !process.argv.includes("--send");
const SITE = "https://dropgigs.com";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const apiKey = process.env.RESEND_API_KEY;
if (!DRY && !apiKey) {
  console.error("ERROR: con --send necesitas RESEND_API_KEY como env var.");
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────
// Tokens & template (copia 1:1 de src/lib/email/templates.ts)
// ────────────────────────────────────────────────────────────────────────

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
        <a href="https://dropgigs.com" style="text-decoration:none; display:inline-block;"><img src="${WORDMARK_URL}" alt="DROP." width="200" height="84" style="display:block; margin:0 auto; width:200px; height:auto; max-width:200px; border:0; outline:none; text-decoration:none;" /></a>
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

function avatarReminderEmailHtml({ artistName, profileUrl, directoryUrl }) {
  const content = `
              <p style="font-size:16px; margin:0 0 16px 0;">Hola ${escapeHtml(artistName)},</p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Pasé revisando los perfiles de los DJs en la beta y vi que el tuyo todavía no tiene foto cargada.
              </p>
              <p style="font-size:15px; margin:0 0 16px 0;">
                Sin foto, tu card en el <a href="${directoryUrl}" style="color:${INK}; text-decoration:underline;">directorio público</a> sale con tus iniciales en vez de tu cara. Los bookers que entran a buscar DJ se enganchan con quien identifican rápido — y la foto es lo primero que ven.
              </p>
              <p style="font-size:15px; margin:0 0 12px 0;">Subila en 30 segundos:</p>
              <ol style="font-size:15px; margin:0 0 20px 20px; padding:0;">
                <li style="margin:0 0 8px 0;">Abrí tu perfil en DROP.</li>
                <li style="margin:0 0 8px 0;">Click en el círculo gris arriba (donde van las iniciales).</li>
                <li style="margin:0 0 8px 0;">Elegí una foto cuadrada — JPG o PNG, hasta 10&nbsp;MB.</li>
              </ol>
              <p style="font-size:15px; margin:0 0 24px 0;">${ctaButton("Subir mi foto", profileUrl)}</p>
              <p style="font-size:13px; color:${MUTED}; margin:0 0 16px 0;">
                Tip: usá una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil. La misma queda como avatar en toda la app + en tu press kit público.
              </p>
              <p style="font-size:15px; margin:0 0 24px 0;">Cualquier duda — o si algo no carga — respondes este correo y te ayudo directo.</p>
              <p style="font-size:15px; margin:0;">Saludos,<br>DROP<span style="color:${ORANGE};">.</span> Team</p>`;
  return wrapEmail({
    title: "Tu perfil en DROP. está casi listo",
    preheader: "Falta tu foto. Sin ella, tu card en el directorio sale con iniciales.",
    content,
    footerReason: 'Recibes este correo porque estás en la beta de DROP. y tu perfil aún no tiene foto. Si prefieres no recibir más mensajes, respondes "unsubscribe" y te quito de la lista.',
  });
}

function avatarReminderEmailText({ artistName, profileUrl, directoryUrl }) {
  return `Hola ${artistName},

Pasé revisando los perfiles de los DJs en la beta y vi que el tuyo todavía no tiene foto cargada.

Sin foto, tu card en el directorio público (${directoryUrl}) sale con tus iniciales en vez de tu cara. Los bookers que entran a buscar DJ se enganchan con quien identifican rápido — y la foto es lo primero que ven.

Subila en 30 segundos:
1. Abrí tu perfil en DROP.
2. Click en el círculo gris arriba (donde van las iniciales).
3. Elegí una foto cuadrada — JPG o PNG, hasta 10 MB.

Subir mi foto: ${profileUrl}

Tip: usá una foto donde se te vea la cara claramente, sin filtros raros. Lo que pondrías en tu Instagram de perfil.

Cualquier duda — o si algo no carga — respondes este correo y te ayudo directo.

Saludos,
DROP. Team

--
DROP. — The DJ OS — Santiago, Chile — dropgigs.com
Recibes este correo porque estás en la beta y tu perfil aún no tiene foto. Si no quieres más, respondes "unsubscribe".`;
}

// ────────────────────────────────────────────────────────────────────────
// Query: DJs sin foto, activos en la beta
// ────────────────────────────────────────────────────────────────────────

const { data: profiles, error } = await supabase
  .from("dj_profile")
  .select("user_id, artist_name, public_slug, beta_status, avatar_url, hero_image_url")
  .eq("hidden_from_directory", false)
  .not("onboarding_completed_at", "is", null)
  .not("public_slug", "is", null)
  .not("artist_name", "is", null);

if (error) {
  console.error("Query error:", error);
  process.exit(1);
}

const candidates = profiles.filter(
  (p) =>
    (!p.avatar_url || p.avatar_url === "") &&
    (!p.hero_image_url || p.hero_image_url === "") &&
    p.beta_status === "active"
);

console.log(`\n— Candidatos para avatar reminder —`);
console.log(`Total DJs públicos: ${profiles.length}`);
console.log(`Sin foto Y beta activa: ${candidates.length}\n`);

// Para cada candidato, obtener email vía auth.users
const recipients = [];
for (const p of candidates) {
  try {
    const { data: u } = await supabase.auth.admin.getUserById(p.user_id);
    const email = u?.user?.email;
    if (email) {
      recipients.push({
        artist_name: p.artist_name,
        email,
        profile_url: `${SITE}/perfil`,
        directory_url: `${SITE}/dj`,
      });
      console.log(`  · ${p.artist_name.padEnd(25)} → ${email}`);
    } else {
      console.log(`  · ${p.artist_name.padEnd(25)} → (sin email, skipped)`);
    }
  } catch (e) {
    console.log(`  · ${p.artist_name.padEnd(25)} → (error fetching user, skipped)`);
  }
}

console.log(`\nTotal a enviar: ${recipients.length}`);

if (DRY) {
  console.log(`\n[DRY RUN] No se envió nada. Para enviar real:`);
  console.log(`  RESEND_API_KEY=re_xxx node scripts/send_avatar_reminder.mjs --send\n`);
  process.exit(0);
}

// ────────────────────────────────────────────────────────────────────────
// Enviar (--send mode)
// ────────────────────────────────────────────────────────────────────────

console.log(`\n— Enviando ${recipients.length} emails —\n`);
let sent = 0;
let failed = 0;
for (const r of recipients) {
  const html = avatarReminderEmailHtml({
    artistName: r.artist_name,
    profileUrl: r.profile_url,
    directoryUrl: r.directory_url,
  });
  const text = avatarReminderEmailText({
    artistName: r.artist_name,
    profileUrl: r.profile_url,
    directoryUrl: r.directory_url,
  });
  const payload = {
    from: "DROP. <hola@dropgigs.com>",
    to: [r.email],
    reply_to: "hola@dropgigs.com",
    subject: "Tu perfil en DROP. está casi listo",
    html,
    text,
  };
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
      console.log(`  ✗ ${r.artist_name.padEnd(25)} → HTTP ${res.status}: ${json.message || json.error}`);
      failed++;
    } else {
      console.log(`  ✓ ${r.artist_name.padEnd(25)} → ${json.id}`);
      sent++;
    }
  } catch (e) {
    console.log(`  ✗ ${r.artist_name.padEnd(25)} → ${e.message}`);
    failed++;
  }
  // Rate-limit cortesía: 500ms entre envíos (Resend free tier = 10/seg)
  await new Promise((r) => setTimeout(r, 500));
}

console.log(`\n— Resumen —`);
console.log(`  Enviados: ${sent}`);
console.log(`  Fallidos: ${failed}`);
