const pptxgen = require("pptxgenjs");

// ── DROP. brand (brutalist Type Beat) ──
const CREAM = "F4EFE7";
const INK = "0A0A0A";
const ORANGE = "FF5C00";
const WHITE = "FFFFFF";
const MUTED = "5B554C";
const DISPLAY = "Impact";        // Anton fallback (brand: Anton, Impact, system-ui)
const BODY = "Arial";
const MONO = "Consolas";         // Space Mono fallback

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";     // 13.33 x 7.5
pres.author = "DROP.";
pres.title = "DROP. — Estado del producto";

const W = 13.33, H = 7.5, M = 0.6;
const hardShadow = () => ({ type: "outer", color: ORANGE, blur: 0, offset: 5, angle: 135, opacity: 1 });
const inkShadow = () => ({ type: "outer", color: INK, blur: 0, offset: 5, angle: 135, opacity: 1 });

function dropLogo(slide, x, y, size, onDark) {
  slide.addText(
    [{ text: "DROP", options: { color: onDark ? CREAM : INK } }, { text: ".", options: { color: ORANGE } }],
    { x, y, w: size * 2.6, h: size * 0.9, fontFace: DISPLAY, fontSize: size * 50, margin: 0, align: "left", valign: "middle" }
  );
}

function kicker(slide, text, onDark) {
  slide.addText(text.toUpperCase(), {
    x: M, y: 0.45, w: W - 2 * M, h: 0.35, fontFace: MONO, fontSize: 12, bold: true,
    color: ORANGE, charSpacing: 3, margin: 0, align: "left", valign: "middle",
  });
}

function title(slide, text, onDark) {
  slide.addText(text, {
    x: M, y: 0.78, w: W - 2 * M, h: 0.95, fontFace: DISPLAY, fontSize: 40,
    color: onDark ? CREAM : INK, margin: 0, align: "left", valign: "middle", charSpacing: 0,
  });
}

function footer(slide, pageNo, onDark) {
  slide.addText(
    [{ text: "DROP", options: { color: onDark ? CREAM : INK } }, { text: ".", options: { color: ORANGE } },
     { text: "  ·  THE DJ OS  ·  MAYO 2026", options: { color: onDark ? CREAM : MUTED } }],
    { x: M, y: H - 0.5, w: 8, h: 0.3, fontFace: MONO, fontSize: 9, bold: true, charSpacing: 2, margin: 0, valign: "middle" }
  );
  if (pageNo) slide.addText(String(pageNo).padStart(2, "0"), {
    x: W - M - 1, y: H - 0.5, w: 1, h: 0.3, fontFace: MONO, fontSize: 9, bold: true,
    color: onDark ? CREAM : MUTED, align: "right", margin: 0, valign: "middle",
  });
}

// 2-column card grid of {t, d}
function cardGrid(slide, cards, opts = {}) {
  const topMin = opts.top || 1.9;
  const bottom = H - 0.85;
  const cols = 2, gap = 0.35;
  const cardW = (W - 2 * M - gap) / cols;
  const rows = Math.ceil(cards.length / cols);
  const fillH = (bottom - topMin - (rows - 1) * gap) / rows;
  const cardH = Math.min(fillH, opts.cardH || 1.8);
  const blockH = rows * cardH + (rows - 1) * gap;
  const top = topMin + Math.max(0, (bottom - topMin - blockH) / 2);
  cards.forEach((c, i) => {
    const r = Math.floor(i / cols), col = i % cols;
    const x = M + col * (cardW + gap);
    const y = top + r * (cardH + gap);
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w: cardW, h: cardH, fill: { color: WHITE }, line: { color: INK, width: 2 }, shadow: hardShadow() });
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.14, h: cardH, fill: { color: ORANGE } });
    slide.addText(c.t, { x: x + 0.34, y: y + 0.16, w: cardW - 0.55, h: 0.45, fontFace: BODY, fontSize: 15, bold: true, color: INK, margin: 0, valign: "top" });
    slide.addText(c.d, { x: x + 0.34, y: y + 0.62, w: cardW - 0.55, h: cardH - 0.74, fontFace: BODY, fontSize: 11.5, color: MUTED, margin: 0, valign: "top", lineSpacingMultiple: 1.02 });
  });
}

// ───────────────────────── 1 · COVER ─────────────────────────
let s = pres.addSlide();
s.background = { color: INK };
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.18, fill: { color: ORANGE } });
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: ORANGE } });
// watermark D.
s.addText([{ text: "D", options: { color: "1A1A1A" } }, { text: ".", options: { color: "241000" } }], {
  x: 8.4, y: 1.5, w: 6, h: 6, fontFace: DISPLAY, fontSize: 320, margin: 0, align: "left", valign: "middle",
});
dropLogo(s, M, 1.0, 1.0, true);
s.addText("— ESTADO DEL PRODUCTO", { x: M, y: 2.5, w: 10, h: 0.4, fontFace: MONO, fontSize: 14, bold: true, color: ORANGE, charSpacing: 3, margin: 0 });
s.addText("LO QUE YA ESTÁ\nEN PRODUCCIÓN\n+ EL ROADMAP.", { x: M, y: 2.95, w: 7.6, h: 2.7, fontFace: DISPLAY, fontSize: 58, color: CREAM, margin: 0, lineSpacingMultiple: 0.92 });
s.addText("Sistema operativo para DJs independientes · CRM, press kit, bookings, IA, crecimiento — todo en un solo lugar.", {
  x: M, y: 5.8, w: 6.6, h: 1.0, fontFace: BODY, fontSize: 15, color: CREAM, margin: 0,
});
s.addText("MAYO 2026", { x: W - M - 3, y: 1.05, w: 3, h: 0.4, fontFace: MONO, fontSize: 12, bold: true, color: CREAM, charSpacing: 2, align: "right", margin: 0 });

// ───────────────────────── 2 · QUÉ ES + STACK ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— Qué es DROP.");
title(s, "EL DJ OS, MONTADO A COSTO $0.");
cardGrid(s, [
  { t: "Producto", d: "App de gestión de carrera DJ. Hoy en beta cerrada por invitación (acceso 15 días). Arquitectura multi-usuario desde el día 1 (RLS por usuario)." },
  { t: "Stack", d: "Next.js 14 (App Router) + TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage) · Vercel · Ollama IA local · Resend mail." },
  { t: "Costo de operación", d: "$0 — Supabase Free, Vercel Hobby, IA local con Ollama. Sin gateways pagos ni servicios externos que cobren." },
  { t: "Visión", d: "Probar valor con beta testers → evolucionar a SaaS para DJs con membresías (workspaces, planes, branding configurable)." },
], { top: 1.95 });
footer(s, 2);

// ───────────────────────── 3 · NÚCLEO DE GESTIÓN ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— En producción · 1/6 · Núcleo de gestión");
title(s, "LA OPERACIÓN DIARIA.");
cardGrid(s, [
  { t: "Dashboard", d: "Panel de inicio con la foto del estado: agenda, contactos, bookings y métricas clave en un vistazo." },
  { t: "CRM de contactos", d: "Contactos con tags, notas privadas, timeline de interacciones, follow-ups (incluye recurrentes) e importación masiva por CSV." },
  { t: "Calendario + finanzas", d: "Eventos con datos financieros por show (caché, gastos), edición rápida y sincronización automática con Google Calendar." },
  { t: "Plantillas", d: "Mensajes reutilizables con sistema de variables (nombre, fecha, evento…) para responder rápido y consistente." },
], { top: 1.95 });
footer(s, 3);

// ───────────────────────── 4 · PRESS KIT & BOOKINGS ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— En producción · 2/6 · Press kit & bookings");
title(s, "DEL PERFIL AL CIERRE DEL SHOW.");
cardGrid(s, [
  { t: "Press kit público dual", d: "En /p/tu-nombre: bio, géneros, embeds (música/video), tech rider y stage plot. PDF subido o generado, con tracking de visitas y clics." },
  { t: "Inbox de bookings", d: "Los requests llegan a un inbox; cotizas el monto y se genera follow-up automático en el CRM." },
  { t: "Máquina de estados + contraoferta", d: "Flujo bidireccional: leído → cotizado → contraofertado por el booker → agendado/rechazado. El booker responde sin login vía /b/[token]." },
  { t: "Timeline + notificaciones", d: "Cada cambio queda en un timeline con fecha y autor, y dispara push + mail automático a ambas partes." },
], { top: 1.95 });
footer(s, 4);

// ───────────────────────── 5 · CRECIMIENTO & IA ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— En producción · 3/6 · Crecimiento & IA");
title(s, "CONSEGUIR Y CERRAR MÁS FECHAS.");
cardGrid(s, [
  { t: "Campañas outbound", d: "Campañas de mail en frío a contactos del CRM, con seguimiento de envíos y estado por contacto." },
  { t: "Growth & posts", d: "Módulo de crecimiento: planificación de posts (board) y snapshots de métricas para seguir el avance." },
  { t: "Descubrir leads", d: "Encuentra venues y locales por zona (datos OpenStreetMap/Overpass) y los pasa al CRM como leads." },
  { t: "IA local (Ollama)", d: "Asistente de estrategia y sugerencias para mails corriendo en local — sin costo de API y con tus datos en tu máquina." },
], { top: 1.95 });
footer(s, 5);

// ───────────────────────── 6 · INTEGRACIONES ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— En producción · 4/6 · Integraciones");
title(s, "CONECTADO CON TUS HERRAMIENTAS.");
cardGrid(s, [
  { t: "Gmail", d: "Bandeja integrada con OAuth + sync automático: lees hilos y asocias correos a contactos del CRM sin salir de DROP." },
  { t: "Google Calendar", d: "Sincronización de eventos en ambos sentidos para que la agenda esté siempre al día." },
  { t: "YouTube & SoundCloud", d: "Auto-sync de tu contenido para alimentar el press kit y los embeds públicos." },
  { t: "PWA + Push", d: "App instalable en el teléfono (iOS/Android) con notificaciones push para bookings y recordatorios." },
], { top: 1.95 });
footer(s, 6);

// ───────────────────────── 7 · PÚBLICO & MARKETPLACE ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— En producción · 5/6 · Público & marketplace");
title(s, "LA CARA PÚBLICA DE DROP.");
cardGrid(s, [
  { t: "Landing DJ / Booker", d: "Página de entrada que comunica la propuesta de valor antes del gate de invite, dividida para DJs y bookers." },
  { t: "Directorio público /dj", d: "Catálogo de DJs verificados, filtrable por género, ciudad y disponibilidad, con datos estructurados para SEO." },
  { t: "Press kit público /p/[slug]", d: "Cada DJ con su perfil público navegable y compartible, con formulario de booking directo." },
  { t: "Portal Booker (próximamente)", d: "Backend ya construido (cuentas, favoritos, requests, /b/[token]). Registro deshabilitado hasta el lanzamiento; el directorio ya es navegable." },
], { top: 1.95 });
footer(s, 7);

// ───────────────────────── 8 · INFRA, BETA & ADMIN ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— En producción · 6/6 · Infra, beta & admin");
title(s, "LO QUE SOSTIENE TODO.");
cardGrid(s, [
  { t: "Beta 15 días + NPS", d: "Onboarding wizard, acceso de 15 días con lockout automático, encuesta NPS y captura de feedback de los testers." },
  { t: "Backoffice + roles", d: "Panel admin (solo tú): solicitudes de beta, feedback, analytics de uso. Roles de administrador." },
  { t: "Backups & confiabilidad", d: "Backups semanales automáticos (pg_dump) a repo privado. Crons para sync de Gmail, growth y envío de push." },
  { t: "Deliverability & SEO", d: "Emails con anti-spam compliance (List-Unsubscribe). Sitemap dinámico + robots.txt para indexar el directorio." },
], { top: 1.95 });
footer(s, 8);

// ───────────────────────── 9 · ROADMAP ─────────────────────────
s = pres.addSlide();
s.background = { color: INK };
s.addText("— ROADMAP PENDIENTE", { x: M, y: 0.45, w: 10, h: 0.35, fontFace: MONO, fontSize: 12, bold: true, color: ORANGE, charSpacing: 3, margin: 0 });
s.addText("LO QUE SIGUE.", { x: M, y: 0.78, w: W - 2 * M, h: 0.9, fontFace: DISPLAY, fontSize: 40, color: CREAM, margin: 0, valign: "middle" });
const rows = [
  ["S18.5", "Contratos digitales con firma electrónica simple", "Siguiente", "4-5 d"],
  ["S19", "Pagos integrados (Flow + MercadoPago)", "Pendiente", "5-7 d"],
  ["S20", "Marketplace v2 · filtros pro + calendario público", "Pendiente", "3 d"],
  ["S20.5", "Cotizador público por DJ (opcional)", "Opcional", "2 d"],
  ["S21", "Operación del show · tech rider editor + tracklists", "SQL listo", "3 d"],
  ["S22", "Campañas + Ads tracker (Meta/Google, ROI)", "Pendiente", "4-5 d"],
  ["S23", "IA en mails + bio adaptable (Ollama clasifica Gmail)", "Pendiente", "3-4 d"],
  ["S24", "Música personal · biblioteca de tracks + wantlist", "Pendiente", "3 d"],
  ["S25", "Membresías + dominio propio + sitio legal", "Pendiente", "5-7 d"],
];
const head = ["", "SPRINT", "ESTADO", "EST."].map((t, i) => ({
  text: i === 0 ? "SPRINT" : ["SPRINT", "QUÉ SUMA", "ESTADO", "EST."][i],
  options: { fill: { color: ORANGE }, color: INK, bold: true, fontFace: MONO, fontSize: 11, align: i > 1 ? "center" : "left", valign: "middle" },
}));
const tableData = [
  [
    { text: "SPRINT", options: { fill: { color: ORANGE }, color: INK, bold: true, fontFace: MONO, fontSize: 11, valign: "middle" } },
    { text: "QUÉ SUMA", options: { fill: { color: ORANGE }, color: INK, bold: true, fontFace: MONO, fontSize: 11, valign: "middle" } },
    { text: "ESTADO", options: { fill: { color: ORANGE }, color: INK, bold: true, fontFace: MONO, fontSize: 11, align: "center", valign: "middle" } },
    { text: "EST.", options: { fill: { color: ORANGE }, color: INK, bold: true, fontFace: MONO, fontSize: 11, align: "center", valign: "middle" } },
  ],
  ...rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? "161616" : "1E1E1E";
    return [
      { text: r[0], options: { fill: { color: bg }, color: ORANGE, bold: true, fontFace: MONO, fontSize: 12, valign: "middle" } },
      { text: r[1], options: { fill: { color: bg }, color: CREAM, fontFace: BODY, fontSize: 12, valign: "middle" } },
      { text: r[2], options: { fill: { color: bg }, color: CREAM, fontFace: MONO, fontSize: 10, align: "center", valign: "middle" } },
      { text: r[3], options: { fill: { color: bg }, color: CREAM, fontFace: MONO, fontSize: 10, align: "center", valign: "middle" } },
    ];
  }),
];
s.addTable(tableData, {
  x: M, y: 1.85, w: W - 2 * M, colW: [1.3, 7.4, 1.9, 1.53], rowH: 0.46,
  border: { type: "solid", pt: 1, color: INK }, valign: "middle",
});
s.addText("Total estimado restante: ~33-43 días de trabajo (sin contar revisiones, bugs ni pulido).", {
  x: M, y: 6.55, w: W - 2 * M, h: 0.3, fontFace: MONO, fontSize: 10, bold: true, color: ORANGE, charSpacing: 1, margin: 0, valign: "middle",
});
footer(s, 9, true);

// ───────────────────────── 10 · PRÓXIMOS PASOS ─────────────────────────
s = pres.addSlide();
s.background = { color: CREAM };
kicker(s, "— Próximos pasos");
title(s, "POR DÓNDE SEGUIR.");
cardGrid(s, [
  { t: "1 · Decidir firma electrónica", d: "Simple (click-wrap + hash, gratis, Ley 19.799) vs avanzada. Define cómo se diseña S18.5 (Contratos)." },
  { t: "2 · Decidir gateway de pago", d: "Flow (Chile) primero o MercadoPago (LATAM). Define cómo se diseña S19 (Pagos)." },
  { t: "3 · Lanzar el Booker", d: "Backend listo. Falta decidir campos obligatorios, anti-spam en signup y el timing (depende de tener suficientes DJs en /dj)." },
  { t: "4 · Limpieza de orden (opcional)", d: "Deuda técnica documentada que no bloquea: unificar rutas de campañas, definir gate de entrada. Atacar en sesiones cortas." },
], { top: 1.95 });
footer(s, 10);

pres.writeFile({ fileName: "DROP_estado_producto.pptx" }).then((f) => console.log("OK →", f));
