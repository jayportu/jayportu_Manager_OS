/**
 * Mockup local del hero del landing con 4 variaciones lado a lado:
 *   - ACTUAL: lo que está en prod (lineHeight 0.82, fontSize 104, tracking -0.005em)
 *   - VAR A: solo "aire vertical" — lineHeight 0.95 (resto igual)
 *   - VAR B: aire + 20% menos tamaño — lineHeight 0.95, clamp 48/6.5vw/84
 *   - VAR C: aire + 27% menos + más tracking — lineHeight 1.0, clamp 44/6vw/76,
 *            letterSpacing 0.015em
 *
 * Uso:
 *   node scripts/render_landing_hero_mockup.mjs
 *   open drop_landing_mockup.html
 *
 * El user elige y aplicamos esos valores en src/app/page.tsx (h1 izquierdo
 * y derecho, ambos tienen la misma definición de estilos).
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const VARIANTS = [
  {
    label: "ACTUAL (prod)",
    note: "Como está hoy. lineHeight=0.82 es la causa de 'letras pegadas'.",
    style: {
      fontSize: "clamp(56px, 8vw, 104px)",
      lineHeight: "0.82",
      letterSpacing: "-0.005em",
    },
  },
  {
    label: "VAR A · solo aire vertical",
    note: "Solo cambio lineHeight 0.82 → 0.95. Resto igual. Resuelve el 'pegado' sin tocar el tamaño imponente. Si querés conservar el impacto display.",
    style: {
      fontSize: "clamp(56px, 8vw, 104px)",
      lineHeight: "0.95",
      letterSpacing: "-0.005em",
    },
  },
  {
    label: "VAR B · aire + 20% menos tamaño",
    note: "lineHeight 0.95 + clamp 48/6.5vw/84. Balance: sigue siendo display fuerte pero no abruma. Probablemente la mejor para escritorio normal.",
    style: {
      fontSize: "clamp(48px, 6.5vw, 84px)",
      lineHeight: "0.95",
      letterSpacing: "0",
    },
  },
  {
    label: "VAR C · refinado (aire + 27% menos + tracking)",
    note: "lineHeight 1.0 + clamp 44/6vw/76 + tracking abierto 0.015em. Más editorial, menos brutal. Trade-off: pierde algo del impacto display.",
    style: {
      fontSize: "clamp(44px, 6vw, 76px)",
      lineHeight: "1.0",
      letterSpacing: "0.015em",
    },
  },
];

function panel(v) {
  const heroStyle = `
    font-family: 'Anton', Impact, system-ui, sans-serif;
    font-weight: 400;
    font-size: ${v.style.fontSize};
    line-height: ${v.style.lineHeight};
    letter-spacing: ${v.style.letterSpacing};
    color: #F4EFE7;
    margin: 0;
  `.replace(/\s+/g, " ").trim();
  return `
    <section class="col">
      <header class="col-head">
        <div class="col-label">${v.label}</div>
        <div class="col-note">${v.note}</div>
        <div class="col-css">
          fontSize: ${v.style.fontSize}<br>
          lineHeight: ${v.style.lineHeight}<br>
          letterSpacing: ${v.style.letterSpacing}
        </div>
      </header>

      <div class="hero hero-dark">
        <div class="kicker"><span>— ERES DJ</span><span class="kicker-line"></span><span class="kicker-tag">BETA CERRADA</span></div>
        <h1 style="${heroStyle}">
          TOMA EL<br>
          CONTROL DE<br>
          TU CARRERA<span style="color:#FF5C00;">.</span>
        </h1>
        <p class="lede">CRM, press kit público, bookings, IA, métricas de crecimiento. El sistema operativo para DJs independientes.</p>
      </div>

      <div class="hero hero-light">
        <div class="kicker kicker-light"><span>— ERES BOOKER</span><span class="kicker-line"></span><span class="kicker-tag">PRÓXIMAMENTE</span></div>
        <h1 style="${heroStyle.replace("#F4EFE7", "#0A0A0A")}">
          ENCUENTRA<br>
          AL DJ<br>
          INDICADO<span style="color:#FF5C00;">.</span>
        </h1>
        <p class="lede lede-light">Directorio de DJs verificados en LATAM. Filtra por género, ciudad y disponibilidad.</p>
      </div>
    </section>
  `;
}

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>DROP. — Landing Hero · Mockup variaciones</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #1c1c1c; font-family: 'Inter', system-ui, sans-serif; color: #F4EFE7; }
    .page-header { padding: 28px 32px; background: #0A0A0A; border-bottom: 2px solid #FF5C00; }
    .page-header h1 { margin: 0; font-family: 'Anton', Impact, sans-serif; font-size: 32px; color: #F4EFE7; letter-spacing: 0; }
    .page-header .dot { color: #FF5C00; }
    .page-header p { margin: 8px 0 0 0; color: #9a9a9a; font-size: 13px; line-height: 1.5; max-width: 720px; }

    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
    .col { border-right: 1px solid #333; min-height: 100vh; }
    .col:last-child { border-right: 0; }
    .col-head { padding: 18px 18px 14px 18px; background: #0A0A0A; border-bottom: 1px solid #333; }
    .col-label { font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; color: #FF5C00; letter-spacing: 0.1em; text-transform: uppercase; }
    .col-note { font-size: 12px; color: #c4c0b8; margin-top: 8px; line-height: 1.45; min-height: 56px; }
    .col-css { font-family: 'Space Mono', monospace; font-size: 10px; color: #7A7670; margin-top: 10px; line-height: 1.45; background: #141414; padding: 8px 10px; border: 1px solid #333; }

    .hero { padding: 24px 20px 28px 20px; }
    .hero-dark { background: #0A0A0A; }
    .hero-light { background: #F4EFE7; color: #0A0A0A; }

    .kicker { font-family: 'Space Mono', monospace; font-size: 9px; font-weight: 700; color: #FF5C00; letter-spacing: 0.18em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .kicker-line { flex: 1; height: 1px; background: rgba(255,255,255,0.18); max-width: 80px; }
    .kicker-tag { color: rgba(244,239,231,0.5); }
    .kicker-light { color: #FF5C00; }
    .kicker-light .kicker-line { background: rgba(10,10,10,0.18); }
    .kicker-light .kicker-tag { color: rgba(10,10,10,0.5); }

    .lede { font-size: 13px; color: rgba(244,239,231,0.85); margin: 14px 0 0 0; line-height: 1.55; max-width: 90%; }
    .lede-light { color: rgba(10,10,10,0.85); }

    @media (max-width: 1400px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
      .col:nth-child(2) { border-right: 0; }
      .col:nth-child(3) { border-top: 1px solid #333; }
      .col:nth-child(4) { border-top: 1px solid #333; }
    }
    @media (max-width: 800px) {
      .grid { grid-template-columns: 1fr; }
      .col { border-right: 0; border-top: 1px solid #333; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <h1>DROP<span class="dot">.</span> — Landing hero · variaciones</h1>
    <p>4 columnas con los mismos textos en distintos parámetros de display. Bug reportado: "letras muy pegadas" (causa: lineHeight=0.82) + "muy imponente" (causa: clamp top 104px). Mirá las 4 versiones en escritorio. Las cards de "ERES DJ" (oscuro) y "ERES BOOKER" (claro) replican fielmente los dos sectores de la home.</p>
  </div>
  <div class="grid">
    ${VARIANTS.map(panel).join("\n")}
  </div>
</body>
</html>`;

const outPath = resolve(process.cwd(), "drop_landing_mockup.html");
writeFileSync(outPath, html);
console.log(`✓ Generado: ${outPath}`);
console.log(`  Abrí con: open drop_landing_mockup.html`);
