/**
 * Genera la imagen Open Graph (1200x630) de la landing → public/og.png.
 * Marca DROP. brutalist: fondo ink + wordmark oficial (Anton, public/brand) +
 * tagline. Uso: node scripts/render_og_image.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// Wordmark oficial (tipografía Anton + punto naranja) — versión clara para fondo ink.
const wordmark = readFileSync("public/brand/wordmark-light.png").toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:1200px;height:630px;background:#0E0E0E;overflow:hidden;position:relative;
    font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;}
  .wm{position:absolute;right:-50px;bottom:-160px;font-size:560px;font-weight:900;
    color:#FF5C00;opacity:0.07;line-height:0.7;letter-spacing:-0.04em;font-family:'Arial Black',sans-serif;}
  .wrap{position:absolute;inset:0;padding:84px;display:flex;flex-direction:column;justify-content:center;}
  .kicker{font-family:'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:0.34em;
    color:#FF5C00;text-transform:uppercase;margin-bottom:30px;}
  /* width explícito + height:auto mantiene la proporción del wordmark (512x214);
     align-self:flex-start evita que el flex-column lo estire a todo el ancho
     (eso lo dejaba "achatado"). */
  .logo{width:560px;height:auto;display:block;align-self:flex-start;}
  .headline{font-size:46px;font-weight:800;color:#F4EFE7;line-height:1.05;letter-spacing:-0.01em;
    max-width:920px;margin-top:40px;}
  .headline .o{color:#FF5C00;}
  .sub{font-family:'Courier New',monospace;font-size:23px;font-weight:700;color:#8c8c8c;
    letter-spacing:0.05em;margin-top:26px;text-transform:uppercase;}
  .bar{position:absolute;left:0;bottom:0;height:16px;width:100%;background:#FF5C00;}
</style></head><body>
  <div class="wm">D.</div>
  <div class="wrap">
    <div class="kicker">— The DJ OS · LATAM</div>
    <img class="logo" src="data:image/png;base64,${wordmark}" alt="DROP." />
    <div class="headline">El sistema operativo para <span class="o">DJs</span> independientes.</div>
    <div class="sub">CRM · Press kit · Bookings · IA · Directorio de DJs</div>
  </div>
  <div class="bar"></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "networkidle" });
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("✓ public/og.png generado (1200x630) con wordmark Anton");
