/**
 * Mockup local para revisar dónde poner el correo oficial
 * hola@dropgigs.com antes de tocar código. Renderiza 5 secciones con
 * BEFORE / AFTER de los 4 cambios propuestos + bonus de email footer.
 *
 * Uso:
 *   node scripts/render_contact_mockups.mjs
 *   open drop_contact_mockups.html
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const INK = "#0A0A0A";
const CREAM = "#F4EFE7";
const ORANGE = "#FF5C00";
const MUTED = "#7A7670";
const SUBTLE = "#666";
const FONT_DISPLAY = "Anton, Impact, sans-serif";
const FONT_SANS = "-apple-system,BlinkMacSystemFont,'Inter',sans-serif";
const FONT_MONO = "'Space Mono', Consolas, monospace";

// ──────────────────────────────────────────────────────────────────────────
// Componentes reusables que replican estilos reales del repo
// ──────────────────────────────────────────────────────────────────────────

function frame(label, content, bg = "#1c1c1c") {
  return `
    <div class="frame" style="background:${bg};">
      <div class="frame-label">${label}</div>
      <div class="frame-body">${content}</div>
    </div>`;
}

// L1 — Landing footer (ink bg, border-top orange)
function landingFooter(withEmail) {
  return `
    <div style="background:${INK}; color:${CREAM}; border-top:2px solid ${ORANGE}; padding:18px 24px; text-align:center; font-family:${FONT_MONO}; font-size:9px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#7A7670;">
      DROP<span style="color:${ORANGE};">.</span> · MADE IN SANTIAGO · 2026${
        withEmail
          ? `&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:hola@dropgigs.com" style="color:${ORANGE}; text-decoration:none; letter-spacing:0.15em;">hola@dropgigs.com</a>`
          : ""
      }
    </div>`;
}

// L3 — Login card pie (max-w-md centered, fondo cream simulado)
function loginPie(withEmail) {
  return `
    <div style="background:#fff; border:1px solid #ddd; padding:24px; max-width:380px; margin:0 auto; font-family:${FONT_SANS}; color:${INK};">
      <div style="text-align:center; margin-bottom:24px;">
        <div style="font-family:${FONT_DISPLAY}; font-size:42px; line-height:0.9;">DROP<span style="color:${ORANGE};">.</span></div>
        <div style="font-family:${FONT_MONO}; font-size:10px; letter-spacing:0.3em; color:${MUTED}; margin-top:4px;">— THE DJ OS</div>
      </div>

      <div style="background:#f5f5f5; border:1px solid #ddd; padding:12px 14px; font-size:13px; color:#555; margin-bottom:12px;">[ Form de login · email + password ]</div>
      <div style="background:${INK}; color:${ORANGE}; padding:12px; text-align:center; font-family:${FONT_MONO}; font-size:10px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;">ENTRAR →</div>

      ${
        withEmail
          ? `
      <div style="text-align:center; margin-top:18px; font-family:${FONT_SANS}; font-size:11px; color:${MUTED}; line-height:1.5;">
        ¿Problemas para entrar?<br>
        <a href="mailto:hola@dropgigs.com" style="color:${INK}; text-decoration:underline;">hola@dropgigs.com</a>
      </div>`
          : ""
      }

      <div style="text-align:center; margin-top:18px; font-family:${FONT_MONO}; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:${MUTED};">
        DROP. · THE DJ OS · v0.13
      </div>
    </div>`;
}

// A1 — Sidebar footer (ink full height fragment)
function sidebarFooter(withEmail) {
  return `
    <div style="background:${INK}; width:260px; padding:12px 14px; border-right:2px solid ${ORANGE}; font-family:${FONT_SANS}; color:${CREAM};">
      <div style="background:#1f1f1f; padding:10px; display:flex; align-items:center; gap:10px;">
        <div style="width:32px; height:32px; background:${ORANGE}; color:${INK}; display:flex; align-items:center; justify-content:center; font-family:${FONT_DISPLAY}; font-size:18px;">J</div>
        <div style="flex:1; min-width:0;">
          <div style="font-family:${FONT_DISPLAY}; font-size:18px; line-height:0.9;">JAY PORTU</div>
          <div style="font-family:${FONT_MONO}; font-size:8px; color:${SUBTLE}; letter-spacing:0.04em; margin-top:2px;">jaime@example.com</div>
        </div>
      </div>
      <div style="border-top:1px solid #2a2a2a; margin-top:8px; padding-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <div style="font-family:${FONT_MONO}; font-size:8px; color:${SUBTLE}; letter-spacing:0.08em;">CONTACTOS</div>
          <div style="font-family:${FONT_DISPLAY}; font-size:18px; line-height:0.9; margin-top:2px;">—</div>
        </div>
        <div>
          <div style="font-family:${FONT_MONO}; font-size:8px; color:${SUBTLE}; letter-spacing:0.08em;">GIGS · MES</div>
          <div style="font-family:${FONT_DISPLAY}; font-size:18px; line-height:0.9; margin-top:2px;">—</div>
        </div>
      </div>
      ${
        withEmail
          ? `
      <div style="border-top:1px solid #2a2a2a; margin-top:12px; padding-top:10px;">
        <a href="mailto:hola@dropgigs.com" style="display:block; font-family:${FONT_MONO}; font-size:9px; color:${SUBTLE}; letter-spacing:0.08em; text-decoration:none; transition:color 0.15s;">
          <span style="color:${ORANGE};">→</span>&nbsp; CONTACTO<br>
          <span style="color:${CREAM}; font-family:${FONT_SANS}; font-size:11px; letter-spacing:0; text-transform:none;">hola@dropgigs.com</span>
        </a>
      </div>`
          : ""
      }
    </div>`;
}

// A2 — Mobile menu drawer footer
function mobileMenuFooter(withEmail) {
  return `
    <div style="background:${INK}; width:280px; padding:14px; border-right:2px solid ${ORANGE}; font-family:${FONT_SANS}; color:${CREAM};">
      <div style="margin-bottom:16px; padding:8px; background:#1f1f1f; display:flex; align-items:center; gap:10px;">
        <div style="width:38px; height:38px; background:${ORANGE}; color:${INK}; display:flex; align-items:center; justify-content:center; font-family:${FONT_DISPLAY}; font-size:22px;">J</div>
        <div style="flex:1; min-width:0;">
          <div style="font-family:${FONT_DISPLAY}; font-size:16px; line-height:0.9;">JAY PORTU</div>
          <div style="font-family:${FONT_MONO}; font-size:8px; color:${SUBTLE}; letter-spacing:0.04em; margin-top:2px;">jaime@example.com</div>
        </div>
      </div>
      ${
        withEmail
          ? `
      <div style="border-top:1px solid #2a2a2a; padding-top:12px;">
        <a href="mailto:hola@dropgigs.com" style="display:block; font-family:${FONT_MONO}; font-size:9px; color:${SUBTLE}; letter-spacing:0.08em; text-decoration:none;">
          <span style="color:${ORANGE};">→</span>&nbsp; CONTACTO<br>
          <span style="color:${CREAM}; font-family:${FONT_SANS}; font-size:11px; letter-spacing:0; text-transform:none;">hola@dropgigs.com</span>
        </a>
      </div>`
          : ""
      }
    </div>`;
}

// E1 — Email footer (replica del wrapEmail actual)
function emailFooter(withEmail) {
  return `
    <div style="background:#fff; max-width:560px; margin:0 auto; border:1px solid #E5E1D8; border-radius:6px; overflow:hidden;">
      <div style="background:${INK}; padding:24px; text-align:center; color:${CREAM};">
        <div style="font-family:${FONT_DISPLAY}; font-size:32px; line-height:1;">DROP<span style="color:${ORANGE};">.</span></div>
        <div style="font-family:${FONT_MONO}; font-size:9px; color:${MUTED}; letter-spacing:0.3em; margin-top:8px; text-transform:uppercase;">— The DJ OS —</div>
      </div>
      <div style="padding:24px 24px 8px 24px; font-family:${FONT_SANS}; color:${INK}; font-size:13px; line-height:1.5;">
        <p style="margin:0 0 12px 0;">Hola DJ,</p>
        <p style="margin:0;">[ contenido del email transaccional ]</p>
      </div>
      <div style="padding:16px 24px 22px 24px; border-top:1px solid #E5E1D8; font-family:${FONT_SANS}; font-size:11px; color:${MUTED}; line-height:1.5;">
        <p style="margin:8px 0 6px 0;">Recibes este correo porque [razón del envío].</p>
        <p style="margin:6px 0 0 0;">DROP<span style="color:${ORANGE};">.</span> — Santiago, Chile · <a href="https://dropgigs.com" style="color:${MUTED}; text-decoration:underline;">dropgigs.com</a>${
          withEmail
            ? ` · <a href="mailto:hola@dropgigs.com" style="color:${MUTED}; text-decoration:underline;">hola@dropgigs.com</a>`
            : ""
        }</p>
      </div>
    </div>`;
}

// ──────────────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "L1",
    title: "L1 · Footer del landing",
    note: "Agrega el email como enlace orange sutil después de 'MADE IN SANTIAGO · 2026'. Click → mailto:",
    before: frame("ANTES", landingFooter(false), "#0A0A0A"),
    after: frame("DESPUÉS", landingFooter(true), "#0A0A0A"),
  },
  {
    id: "L3",
    title: "L3 · Pie del /login",
    note: "Agrega 'Tienes problemas para entrar? hola@dropgigs.com' entre el form y la línea de versión. Captura el momento de frustración del user.",
    before: frame("ANTES", loginPie(false), "#F4EFE7"),
    after: frame("DESPUÉS", loginPie(true), "#F4EFE7"),
  },
  {
    id: "A1",
    title: "A1 · Footer del Sidebar (desktop)",
    note: "Bajo la sección 'CONTACTOS / GIGS · MES' agrega un bloque 'CONTACTO · hola@dropgigs.com' como link discreto. Siempre visible en escritorio.",
    before: frame("ANTES", sidebarFooter(false), "#1c1c1c"),
    after: frame("DESPUÉS", sidebarFooter(true), "#1c1c1c"),
  },
  {
    id: "A2",
    title: "A2 · Footer del Mobile Menu (drawer)",
    note: "Mismo bloque que A1 pero adaptado al drawer mobile. Aparece cuando el user abre el menú hamburguesa.",
    before: frame("ANTES", mobileMenuFooter(false), "#1c1c1c"),
    after: frame("DESPUÉS", mobileMenuFooter(true), "#1c1c1c"),
  },
  {
    id: "E1",
    title: "E1 · Footer de emails transaccionales",
    note: "Agrega ' · hola@dropgigs.com' al final de la línea 'DROP. — Santiago, Chile · dropgigs.com'. Solo afecta wrapEmail() — los 5 templates ya lo usan, no hay que tocar uno por uno.",
    before: frame("ANTES", emailFooter(false), "#F4EFE7"),
    after: frame("DESPUÉS", emailFooter(true), "#F4EFE7"),
  },
];

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>DROP. — Mockup correo de contacto</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #1c1c1c; font-family: ${FONT_SANS}; color: ${CREAM}; }
    .page-header { padding: 28px 32px; background: ${INK}; border-bottom: 2px solid ${ORANGE}; }
    .page-header h1 { margin: 0; font-family: ${FONT_DISPLAY}; font-size: 36px; letter-spacing: -1px; }
    .page-header h1 .dot { color: ${ORANGE}; }
    .page-header p { margin: 8px 0 0 0; color: #9a9a9a; font-size: 13px; line-height: 1.55; max-width: 760px; }

    .section { padding: 32px; border-bottom: 1px solid #333; }
    .section h2 { margin: 0 0 6px 0; font-family: ${FONT_DISPLAY}; font-size: 22px; color: ${CREAM}; letter-spacing: 0; }
    .section h2 .id { color: ${ORANGE}; font-family: ${FONT_MONO}; font-size: 13px; }
    .section .note { margin: 0 0 24px 0; color: #c4c0b8; font-size: 13px; line-height: 1.55; max-width: 760px; }

    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

    .frame { border: 1px solid #333; }
    .frame-label { padding: 8px 14px; background: #141414; border-bottom: 1px solid #333; font-family: ${FONT_MONO}; font-size: 11px; font-weight: 700; color: ${ORANGE}; letter-spacing: 0.12em; }
    .frame-body { padding: 24px; min-height: 200px; display: flex; align-items: center; justify-content: center; }

    @media (max-width: 900px) {
      .pair { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <h1>DROP<span class="dot">.</span> — Correo de contacto · mockups</h1>
    <p>4 lugares donde aparecería <strong>hola@dropgigs.com</strong> + el footer de los emails transaccionales. Cada sección muestra ANTES (estado actual) y DESPUÉS (con el cambio aplicado). Si te gustan, decime y aplico todos en un solo commit. Si querés ajustar tono, color o copy de alguno, decime cuál y lo reformulo antes de tocar código.</p>
  </div>
  ${SECTIONS.map(
    (s) => `
  <div class="section" id="${s.id}">
    <h2><span class="id">▸ ${s.id}</span>&nbsp;&nbsp;${s.title.replace(s.id + " · ", "")}</h2>
    <p class="note">${s.note}</p>
    <div class="pair">
      <div>${s.before}</div>
      <div>${s.after}</div>
    </div>
  </div>`
  ).join("\n")}
</body>
</html>`;

const outPath = resolve(process.cwd(), "drop_contact_mockups.html");
writeFileSync(outPath, html);
console.log(`✓ Generado: ${outPath}`);
console.log(`  Abrí con: open drop_contact_mockups.html`);
