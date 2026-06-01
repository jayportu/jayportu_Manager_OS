/**
 * Auditoría visual responsive: screenshots full-page de las páginas públicas
 * de DROP. en 4 viewports (375, 393, 768, 1440). Genera 20 PNG en
 * /screenshots/ + drop_responsive_audit.html con grid 5×4 para review visual.
 *
 * Uso:
 *   node scripts/screenshot_responsive.mjs
 *   open drop_responsive_audit.html
 *
 * Páginas auditadas (5):
 *   1. /              landing
 *   2. /beta          form de solicitud de beta
 *   3. /login         login + Google OAuth
 *   4. /dj            directorio público de DJs
 *   5. /p/jay-bdba324d  press kit público de Belixza (DJ con datos completos)
 *
 * Viewports (4):
 *   - iPhone SE (375×667)
 *   - iPhone 14 Pro (393×852)
 *   - iPad (768×1024)
 *   - Desktop (1440×900)
 *
 * Notas:
 *   - Espera networkidle + delay extra para fonts (Anton) y embeds (Spotify/SC).
 *   - Reduce motion para evitar animaciones a medio renderizar.
 *   - fullPage: true → captura todo el scroll, no solo el viewport visible.
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL || "https://dropgigs.com";

const PAGES = [
  { name: "1-landing", path: "/", label: "Landing (/)" },
  { name: "2-beta", path: "/beta", label: "Solicitar beta (/beta)" },
  { name: "3-login", path: "/login", label: "Login (/login)" },
  { name: "4-directory", path: "/dj", label: "Directorio público (/dj)" },
  {
    name: "5-presskit-generated",
    path: "/p/jay-bdba324d",
    label: "Press kit Belixza (modo generated · /p/jay-bdba324d)",
  },
  {
    name: "6-presskit-with-pdf",
    path: "/p/jay-portu",
    label: "Press kit Jay Portu (con botón Ver PDF · /p/jay-portu)",
  },
];

const VIEWPORTS = [
  { name: "375-iphone-se", width: 375, height: 667, label: "iPhone SE · 375×667" },
  { name: "393-iphone-14", width: 393, height: 852, label: "iPhone 14 Pro · 393×852" },
  { name: "768-ipad", width: 768, height: 1024, label: "iPad · 768×1024" },
  { name: "1440-desktop", width: 1440, height: 900, label: "Desktop · 1440×900" },
];

const OUT_DIR = resolve(process.cwd(), "screenshots");
if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log(`▸ Base URL: ${BASE_URL}`);
console.log(`▸ Output:   ${OUT_DIR}`);
console.log(`▸ Capturando ${PAGES.length} páginas × ${VIEWPORTS.length} viewports = ${PAGES.length * VIEWPORTS.length} screenshots\n`);

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.width < 600 ? 2 : 1,
    isMobile: vp.width < 600,
    hasTouch: vp.width < 800,
    reducedMotion: "reduce",
    userAgent:
      vp.width < 600
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
  });

  for (const page of PAGES) {
    const url = BASE_URL + page.path;
    const file = `${vp.name}__${page.name}.png`;
    const outPath = resolve(OUT_DIR, file);

    try {
      const p = await context.newPage();
      await p.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      // Extra: esperar fonts + lazy embeds
      await p.waitForTimeout(1500);
      await p.screenshot({ path: outPath, fullPage: true });
      await p.close();
      console.log(`  ✓ ${vp.name} · ${page.name}`);
    } catch (err) {
      console.error(`  ✗ ${vp.name} · ${page.name}: ${err.message}`);
      // Continuar con la siguiente
    }
  }

  await context.close();
}

await browser.close();

// ────────────────────────────────────────────────────────────────────────
// Generar drop_responsive_audit.html
// ────────────────────────────────────────────────────────────────────────

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>DROP. — Auditoría responsive</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #1c1c1c; font-family: -apple-system, system-ui, sans-serif; color: #F4EFE7; }
    .head { padding: 28px 32px; background: #0A0A0A; border-bottom: 2px solid #FF5C00; position: sticky; top: 0; z-index: 10; }
    .head h1 { margin: 0; font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; letter-spacing: -1px; }
    .head .dot { color: #FF5C00; }
    .head p { margin: 8px 0 0 0; color: #9a9a9a; font-size: 13px; line-height: 1.5; }
    .legend { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; font-family: Consolas, monospace; font-size: 11px; }
    .legend span { padding: 4px 10px; background: #141414; border: 1px solid #333; }

    .grid { padding: 24px; }
    .row { margin-bottom: 48px; border: 1px solid #333; }
    .row-head { padding: 14px 18px; background: #0A0A0A; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 12px; }
    .row-head .num { font-family: Consolas, monospace; color: #FF5C00; font-size: 14px; font-weight: 700; }
    .row-head .label { font-size: 14px; font-weight: 600; }
    .row-head .path { font-family: Consolas, monospace; font-size: 11px; color: #7A7670; }

    .cells { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; background: #0A0A0A; }
    .cell { border-right: 1px solid #333; padding: 12px; min-height: 200px; }
    .cell:last-child { border-right: 0; }
    .cell-head { font-family: Consolas, monospace; font-size: 11px; color: #c4c0b8; margin-bottom: 8px; display: flex; justify-content: space-between; }
    .cell-head .tag { color: #FF5C00; font-weight: 700; }
    .cell img { width: 100%; display: block; background: #fff; border: 1px solid #444; }
    .cell .fail { color: #C53030; font-size: 11px; padding: 40px; text-align: center; background: #2a1414; border: 1px dashed #C53030; }

    @media (max-width: 1200px) {
      .cells { grid-template-columns: repeat(2, 1fr); }
      .cell:nth-child(2) { border-right: 0; }
      .cell:nth-child(3), .cell:nth-child(4) { border-top: 1px solid #333; }
    }
    @media (max-width: 700px) {
      .cells { grid-template-columns: 1fr; }
      .cell { border-right: 0; border-top: 1px solid #333; }
    }
  </style>
</head>
<body>
  <div class="head">
    <h1>DROP<span class="dot">.</span> — Auditoría responsive</h1>
    <p>Grid de 5 páginas públicas × 4 viewports. Buscá: texto que rebalsa, scroll horizontal indeseado, botones muy chicos, imágenes que rompen, spacing raro, overlay/modal mal posicionado. Anotá qué celda tiene issue y me decís cuál.</p>
    <div class="legend">
      ${VIEWPORTS.map((v) => `<span>${v.label}</span>`).join("")}
    </div>
  </div>
  <div class="grid">
    ${PAGES.map(
      (page, i) => `
    <div class="row" id="row-${i}">
      <div class="row-head">
        <span class="num">▸ ${i + 1}</span>
        <span class="label">${page.label}</span>
        <span class="path">${BASE_URL}${page.path}</span>
      </div>
      <div class="cells">
        ${VIEWPORTS.map(
          (vp) => `
        <div class="cell">
          <div class="cell-head">
            <span>${vp.label}</span>
            <span class="tag">${i + 1}.${vp.name.split("-")[0]}</span>
          </div>
          <img src="screenshots/${vp.name}__${page.name}.png" alt="${page.label} @ ${vp.label}" loading="lazy" />
        </div>`
        ).join("")}
      </div>
    </div>`
    ).join("")}
  </div>
</body>
</html>`;

const htmlPath = resolve(process.cwd(), "drop_responsive_audit.html");
writeFileSync(htmlPath, html);
console.log(`\n✓ Auditoría generada: ${htmlPath}`);
console.log(`  Abrí con: open drop_responsive_audit.html`);
