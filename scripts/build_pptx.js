/**
 * Generador del pitch deck "JAY Manager OS".
 * Presentación funcional descriptiva — qué tiene y qué tendrá la app.
 * Dark theme con accent #E8B923.
 */
const pptxgen = require("pptxgenjs");

// ─── Design tokens ──────────────────────────────────────────────────────
const C = {
  bg: "0F0F11",
  card: "18181B",
  border: "27272A",
  text: "FAFAFA",
  muted: "A1A1AA",
  subtle: "71717A",
  accent: "E8B923",
  accentSoft: "3E2F0A",
};

const FONT_DISPLAY = "Arial Black";
const FONT_BODY = "Inter";

const SLIDE_W = 10;
const SLIDE_H = 5.625;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Jay Portu";
pres.title = "JAY Manager OS";
pres.subject = "Funciones de la app";

pres.defineSlideMaster({
  title: "DARK",
  background: { color: C.bg },
});

function addSlide() {
  return pres.addSlide({ masterName: "DARK" });
}

function makeShadow() {
  return {
    type: "outer",
    color: "000000",
    blur: 12,
    offset: 3,
    angle: 90,
    opacity: 0.35,
  };
}

function addFooter(slide, n, total) {
  slide.addText("JAY Manager OS", {
    x: 0.4, y: SLIDE_H - 0.35, w: 5, h: 0.25,
    fontSize: 9, fontFace: FONT_BODY, color: C.subtle,
    align: "left", margin: 0,
  });
  slide.addText(`${n} / ${total}`, {
    x: SLIDE_W - 1.0, y: SLIDE_H - 0.35, w: 0.6, h: 0.25,
    fontSize: 9, fontFace: FONT_BODY, color: C.subtle,
    align: "right", margin: 0,
  });
}

function addAccentDot(slide, x, y) {
  slide.addShape(pres.shapes.OVAL, {
    x, y, w: 0.18, h: 0.18,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
}

function addFeatureCard(slide, { x, y, w, h, label, title, body }) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.card }, line: { color: C.border, width: 1 },
    shadow: makeShadow(),
  });
  if (label) {
    slide.addText(label, {
      x: x + 0.25, y: y + 0.2, w: w - 0.5, h: 0.25,
      fontSize: 8, fontFace: FONT_BODY, color: C.accent,
      bold: true, charSpacing: 3, margin: 0,
    });
  }
  slide.addText(title, {
    x: x + 0.25, y: y + (label ? 0.45 : 0.25), w: w - 0.5, h: 0.45,
    fontSize: 16, fontFace: FONT_DISPLAY, color: C.text,
    bold: true, margin: 0,
  });
  slide.addText(body, {
    x: x + 0.25, y: y + (label ? 0.95 : 0.75), w: w - 0.5,
    h: h - (label ? 1.15 : 0.95),
    fontSize: 11, fontFace: FONT_BODY, color: C.muted,
    margin: 0, valign: "top",
  });
}

// ════════════════════════════════════════════════════════════════════════
// Slides
// ════════════════════════════════════════════════════════════════════════

const TOTAL = 13;
let slideN = 0;
function n() { return ++slideN; }

// ─── 1. PORTADA ─────────────────────────────────────────────────────────
{
  const s = addSlide();

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: SLIDE_H,
    fill: { color: C.accent }, line: { width: 0 },
  });

  s.addText("v0.12", {
    x: 0.6, y: 0.55, w: 5, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });

  s.addText("JAY PORTU", {
    x: 0.6, y: 1.4, w: 5.4, h: 1.0,
    fontSize: 44, fontFace: FONT_DISPLAY, color: C.text,
    bold: true, charSpacing: 4, margin: 0,
  });

  s.addText("MANAGER OS", {
    x: 0.6, y: 2.4, w: 5.4, h: 0.5,
    fontSize: 24, fontFace: FONT_DISPLAY, color: C.accent,
    bold: true, charSpacing: 10, margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 3.45, w: 0.6, h: 0.04,
    fill: { color: C.accent }, line: { width: 0 },
  });

  s.addText("Una app que ayuda al DJ a organizar toda su carrera.", {
    x: 0.6, y: 3.65, w: 8.5, h: 0.5,
    fontSize: 18, fontFace: FONT_BODY, color: C.muted,
    italic: true, margin: 0,
  });

  s.addText("CRM · Press kit · Crecimiento · Calendario · IA", {
    x: 0.6, y: 4.15, w: 8.5, h: 0.4,
    fontSize: 12, fontFace: FONT_BODY, color: C.subtle, margin: 0,
  });

  // Card disclaimer nombre
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.4, y: 0.7, w: 3.2, h: 1.7,
    fill: { color: C.card }, line: { color: C.border, width: 1 },
  });
  s.addText("Nombre temporal", {
    x: 6.6, y: 0.85, w: 2.8, h: 0.3,
    fontSize: 9, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 3, margin: 0,
  });
  s.addText(
    "\"JAY Manager OS\" es el nombre interno de esta versión de prueba. " +
    "Cuando la app se abra al público vamos a inventar un nombre comercial distinto.",
    {
      x: 6.6, y: 1.2, w: 2.8, h: 1.15,
      fontSize: 10, fontFace: FONT_BODY, color: C.muted, margin: 0,
    }
  );

  addFooter(s, n(), TOTAL);
}

// ─── 2. EL PROBLEMA ────────────────────────────────────────────────────
{
  const s = addSlide();

  s.addText("EL PROBLEMA", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("La carrera del DJ vive en muchos lugares distintos.", {
    x: 0.6, y: 0.85, w: 9, h: 0.8,
    fontSize: 28, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText(
    "Bookings por WhatsApp, contactos en notas del celular, fechas en Google Calendar, " +
    "press kit en un PDF perdido, métricas a ojo y plantillas que se reescriben cada vez.",
    {
      x: 0.6, y: 1.75, w: 9, h: 0.8,
      fontSize: 13, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
    }
  );

  const pains = [
    { label: "💬", text: "Conversaciones de booking que se pierden" },
    { label: "📒", text: "Contactos sin orden ni recordatorios" },
    { label: "📊", text: "Sin foto clara de cómo crece cada red" },
    { label: "📄", text: "Press kit desactualizado o inexistente" },
    { label: "✉️", text: "Mensajes a bookers repetidos cada vez" },
    { label: "🤖", text: "Asistencia IA fuera del flujo de trabajo" },
  ];
  const px = [0.6, 3.85, 7.1];
  const py = [2.85, 4.0];
  pains.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    s.addShape(pres.shapes.RECTANGLE, {
      x: px[col], y: py[row], w: 2.55, h: 0.95,
      fill: { color: C.card }, line: { color: C.border, width: 1 },
    });
    s.addText(p.label, {
      x: px[col] + 0.15, y: py[row] + 0.2, w: 0.55, h: 0.55,
      fontSize: 22, margin: 0, align: "center",
    });
    s.addText(p.text, {
      x: px[col] + 0.75, y: py[row] + 0.2, w: 1.7, h: 0.55,
      fontSize: 11, fontFace: FONT_BODY, color: C.text, margin: 0, valign: "middle",
    });
  });

  addFooter(s, n(), TOTAL);
}

// ─── 3. QUÉ ES ─────────────────────────────────────────────────────────
{
  const s = addSlide();

  s.addText("LA SOLUCIÓN", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Una sola app que unifica toda la operación del DJ.", {
    x: 0.6, y: 0.85, w: 9, h: 0.9,
    fontSize: 28, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });

  const blocks = [
    {
      kicker: "PERSONAL",
      title: "Manejo de la carrera",
      body: "Contactos, fechas, follow-ups, plantillas y métricas en un solo lugar. Cada DJ con su propia cuenta y data privada.",
    },
    {
      kicker: "PROFESIONAL",
      title: "Imagen pública",
      body: "Press kit con URL propia para compartir con bookers, métricas de visitas y formulario de contacto integrado al CRM.",
    },
    {
      kicker: "CRECIMIENTO",
      title: "Foco en métricas",
      body: "Crecimiento medido en SoundCloud, YouTube y otras redes. Campañas con objetivos numéricos y seguimiento real.",
    },
  ];
  const bw = 2.9;
  blocks.forEach((b, i) => {
    addFeatureCard(s, {
      x: 0.6 + i * (bw + 0.2), y: 2.05, w: bw, h: 3.0,
      label: b.kicker, title: b.title, body: b.body,
    });
  });

  addFooter(s, n(), TOTAL);
}

// ─── 4. DASHBOARD ──────────────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("FUNCIÓN · 01", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Dashboard", {
    x: 0.6, y: 0.85, w: 6, h: 0.7,
    fontSize: 36, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Lo primero que se ve al entrar.", {
    x: 0.6, y: 1.5, w: 8, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  // Mockup KPIs
  const mx = 0.6;
  const my = 2.2;
  const kpis = [
    { label: "CONTACTOS", value: "5" },
    { label: "PIPELINE", value: "2" },
    { label: "FOLLOW-UPS", value: "0" },
    { label: "SCORE", value: "87" },
  ];
  const kpiW = 1.0;
  kpis.forEach((k, i) => {
    const x = mx + i * (kpiW + 0.1);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: my, w: kpiW, h: 1.0,
      fill: { color: C.card }, line: { color: C.border, width: 1 },
    });
    s.addText(k.label, {
      x: x + 0.1, y: my + 0.1, w: kpiW - 0.2, h: 0.2,
      fontSize: 7, fontFace: FONT_BODY, color: C.muted,
      bold: true, charSpacing: 2, margin: 0,
    });
    s.addText(k.value, {
      x: x + 0.1, y: my + 0.32, w: kpiW - 0.2, h: 0.6,
      fontSize: 28, fontFace: FONT_DISPLAY,
      color: i === 3 ? C.accent : C.text,
      bold: true, margin: 0,
    });
  });

  const fx = 5.4;
  const fy = 2.2;
  const features = [
    "Saludo personalizado y resumen del día",
    "Indicadores clave: contactos, pipeline, follow-ups, score",
    "Follow-ups pendientes con prioridades y atrasos resaltados",
    "Contactos top por relevancia para no perderlos de vista",
    "Actividad reciente del CRM",
    "Guía de primeros pasos para usuarios nuevos",
  ];
  features.forEach((f, i) => {
    const y = fy + i * 0.32;
    addAccentDot(s, fx, y + 0.06);
    s.addText(f, {
      x: fx + 0.28, y, w: 4.2, h: 0.3,
      fontSize: 11, fontFace: FONT_BODY, color: C.text, margin: 0,
    });
  });

  addFooter(s, n(), TOTAL);
}

// ─── 5. CRM ────────────────────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("FUNCIÓN · 02", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("CRM para DJs", {
    x: 0.6, y: 0.85, w: 7, h: 0.7,
    fontSize: 36, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Cada booker, club y productora con su historial completo.", {
    x: 0.6, y: 1.5, w: 9, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  const cards = [
    {
      label: "CONTACTOS",
      title: "Clasificados y con puntaje",
      body: "Cada contacto tiene tipo (club, bar, festival, productora, etc.) y estado en el pipeline. El puntaje se calcula automáticamente según las interacciones recientes.",
    },
    {
      label: "INTERACCIONES",
      title: "Cada conversación queda registrada",
      body: "WhatsApp, email, mensaje por Instagram. Se anota en pocos segundos y la ficha del contacto se mantiene actualizada sola.",
    },
    {
      label: "FOLLOW-UPS",
      title: "No se olvida nadie",
      body: "Por contacto, con fecha y prioridad. Los atrasados se resaltan en el dashboard y llega aviso al celular cuando vencen.",
    },
    {
      label: "IMPORTAR / EXPORTAR",
      title: "Sin dependencia",
      body: "Importar agenda existente desde CSV. Descargar respaldo completo en JSON en cualquier momento. La data siempre es del usuario.",
    },
  ];
  const cw = 4.4;
  const ch = 1.5;
  cards.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    addFeatureCard(s, {
      x: 0.6 + col * (cw + 0.2),
      y: 2.0 + row * (ch + 0.15),
      w: cw, h: ch,
      label: c.label, title: c.title, body: c.body,
    });
  });

  addFooter(s, n(), TOTAL);
}

// ─── 6. PRESS KIT ──────────────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("FUNCIÓN · 03", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Press kit público", {
    x: 0.6, y: 0.85, w: 8, h: 0.7,
    fontSize: 36, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Una URL propia para compartir con bookers y clubes.", {
    x: 0.6, y: 1.5, w: 9, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  addFeatureCard(s, {
    x: 0.6, y: 2.0, w: 4.4, h: 3.1,
    label: "MODO 1 · GENERADO",
    title: "La app arma la página",
    body:
      "Con la bio, géneros, ciudad, embeds de SoundCloud y YouTube, tech rider y formulario de booking. " +
      "La URL es personalizable. " +
      "Cada visita y formulario enviado queda registrado con métricas. " +
      "Los bookings recibidos entran directo al CRM como nuevos leads.",
  });
  addFeatureCard(s, {
    x: 5.2, y: 2.0, w: 4.2, h: 3.1,
    label: "MODO 2 · PDF PROPIO",
    title: "El DJ sube el suyo y se ve tal cual",
    body:
      "Si el DJ ya tiene un press kit diseñado en PDF, lo sube y la página pública lo muestra a pantalla completa. " +
      "Sin marcos ni branding de la app encima — se ve tal cual lo diseñó. " +
      "Botones de contacto y descarga incluidos. " +
      "Se puede alternar entre los dos modos sin perder data.",
  });

  addFooter(s, n(), TOTAL);
}

// ─── 7. GROWTH ─────────────────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("FUNCIÓN · 04", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Crecimiento de audiencia", {
    x: 0.6, y: 0.85, w: 9, h: 0.7,
    fontSize: 34, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("El crecimiento en cada plataforma, medido en serio.", {
    x: 0.6, y: 1.5, w: 9, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  const items = [
    {
      label: "MEDICIONES",
      title: "Manual + automático",
      body: "El DJ puede registrar sus seguidores cuando quiera. Y SoundCloud + YouTube se actualizan solos todos los días sin que tenga que hacer nada.",
    },
    {
      label: "PUBLICACIONES",
      title: "Registro de contenido",
      body: "Cada post, reel o track publicado queda guardado con su formato, plataforma y resultados. Sirve para entender qué tipo de contenido funciona mejor.",
    },
    {
      label: "CAMPAÑAS",
      title: "Objetivos con seguimiento",
      body: "Definir una meta (ej: +500 seguidores en 3 meses) con fecha. La app mide el avance automáticamente y muestra si funcionó o no.",
    },
  ];
  const w = 2.9;
  items.forEach((it, i) => {
    addFeatureCard(s, {
      x: 0.6 + i * (w + 0.2), y: 2.0, w, h: 3.1,
      label: it.label, title: it.title, body: it.body,
    });
  });

  addFooter(s, n(), TOTAL);
}

// ─── 8. COMUNICACIÓN ──────────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("FUNCIÓN · 05", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Comunicación y agenda", {
    x: 0.6, y: 0.85, w: 9, h: 0.7,
    fontSize: 32, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Email, calendario y plantillas conectadas al CRM.", {
    x: 0.6, y: 1.5, w: 9, h: 0.4,
    fontSize: 13, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  const cards = [
    {
      label: "EMAIL",
      title: "Conversaciones asociadas",
      body: "La cuenta de Gmail del DJ se conecta a la app y los hilos relevantes se asocian a cada contacto del CRM. El envío sigue siendo manual desde Gmail.",
    },
    {
      label: "CALENDARIO",
      title: "Fechas sincronizadas",
      body: "Los eventos de Google Calendar entran automáticamente. Cada gig se enriquece con datos del venue. Los bookings confirmados crean fecha con un clic.",
    },
    {
      label: "PLANTILLAS",
      title: "Mensajes que se autocompletan",
      body: "Plantillas para WhatsApp, email e Instagram con variables como nombre del contacto, fecha y link del press kit. La app arma el mensaje listo para enviar.",
    },
  ];
  const w = 2.9;
  cards.forEach((c, i) => {
    addFeatureCard(s, {
      x: 0.6 + i * (w + 0.2), y: 2.05, w, h: 3.0,
      label: c.label, title: c.title, body: c.body,
    });
  });

  addFooter(s, n(), TOTAL);
}

// ─── 9. IA + DESCUBRIR ────────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("FUNCIÓN · 06", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Asistente IA y búsqueda de oportunidades", {
    x: 0.6, y: 0.85, w: 9, h: 0.7,
    fontSize: 26, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Inteligencia integrada y búsqueda de venues por ciudad.", {
    x: 0.6, y: 1.55, w: 9, h: 0.4,
    fontSize: 13, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  addFeatureCard(s, {
    x: 0.6, y: 2.05, w: 4.4, h: 3.0,
    label: "IA",
    title: "Asistente integrado",
    body:
      "Resúmenes automáticos de las conversaciones del CRM, sugerencias de mensajes, " +
      "puntaje de contactos según comportamiento reciente. " +
      "Modo estratégico para temas complejos: la app arma el contexto y el DJ recibe ideas accionables.",
  });
  addFeatureCard(s, {
    x: 5.2, y: 2.05, w: 4.2, h: 3.0,
    label: "DESCUBRIR",
    title: "Venues por ciudad",
    body:
      "Búsqueda de clubes, bares y festivales filtrada por ciudad y tipo de venue. " +
      "Los resultados pueden agregarse directo al CRM como leads. " +
      "También se pueden cargar contactos pegando una lista de texto o subiendo un CSV.",
  });

  addFooter(s, n(), TOTAL);
}

// ─── 10. NOTIFICACIONES + APP MÓVIL ────────────────────────────────────
{
  const s = addSlide();
  s.addText("FUNCIÓN · 07", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Notificaciones y app móvil", {
    x: 0.6, y: 0.85, w: 9, h: 0.7,
    fontSize: 30, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Se instala como app nativa y avisa lo importante.", {
    x: 0.6, y: 1.5, w: 9, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  const items = [
    { label: "📱", title: "Instalable en el celular", body: "Se agrega a la pantalla de inicio del iPhone o Android y se abre como cualquier app." },
    { label: "🔔", title: "Follow-ups vencidos", body: "Aviso diario si quedaron compromisos atrasados con algún contacto." },
    { label: "🔥", title: "Crecimiento detectado", body: "Cuando los seguidores crecen significativamente, llega un aviso para aprovechar el momento." },
    { label: "📅", title: "Recordatorio semanal", body: "Cada lunes en la mañana, recordatorio para revisar las métricas de la semana." },
  ];
  const w = 2.15;
  items.forEach((it, i) => {
    const x = 0.6 + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.0, w, h: 3.1,
      fill: { color: C.card }, line: { color: C.border, width: 1 },
      shadow: makeShadow(),
    });
    s.addText(it.label, {
      x, y: 2.2, w, h: 0.6, fontSize: 30, align: "center", margin: 0,
    });
    s.addText(it.title, {
      x: x + 0.15, y: 2.95, w: w - 0.3, h: 0.5,
      fontSize: 13, fontFace: FONT_DISPLAY, color: C.text,
      bold: true, align: "center", margin: 0,
    });
    s.addText(it.body, {
      x: x + 0.15, y: 3.5, w: w - 0.3, h: 1.5,
      fontSize: 10, fontFace: FONT_BODY, color: C.muted,
      align: "center", margin: 0, valign: "top",
    });
  });

  addFooter(s, n(), TOTAL);
}

// ─── 11. ESTADO ACTUAL ─────────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("ESTADO ACTUAL", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Todo esto ya funciona hoy.", {
    x: 0.6, y: 0.85, w: 9, h: 0.8,
    fontSize: 32, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Cada función descrita está construida y deployada en producción.", {
    x: 0.6, y: 1.6, w: 9, h: 0.4,
    fontSize: 13, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  const features = [
    "Cuenta personal con datos privados",
    "Dashboard con indicadores clave",
    "CRM completo (contactos, interacciones, follow-ups)",
    "Press kit público con métricas",
    "Press kit en modo PDF subido",
    "Crecimiento con mediciones manuales",
    "Sincronización automática de SoundCloud",
    "Sincronización automática de YouTube",
    "Posts y campañas con seguimiento",
    "Email y calendario conectados",
    "Plantillas multi-canal con variables",
    "Asistente IA integrado",
    "Búsqueda de venues por ciudad",
    "Instalable como app móvil",
    "Notificaciones automáticas",
    "Importar y exportar la data",
    "Onboarding guiado para nuevos usuarios",
    "Respaldo automático semanal",
  ];
  const colCount = 3;
  const itemsPerCol = Math.ceil(features.length / colCount);
  const colWidth = 2.95;
  for (let col = 0; col < colCount; col++) {
    for (let row = 0; row < itemsPerCol; row++) {
      const idx = col * itemsPerCol + row;
      if (idx >= features.length) break;
      const x = 0.6 + col * (colWidth + 0.15);
      const y = 2.2 + row * 0.45;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: colWidth, h: 0.4,
        fill: { color: C.card }, line: { color: C.border, width: 1 },
      });
      s.addText("✓", {
        x: x + 0.1, y: y + 0.05, w: 0.3, h: 0.3,
        fontSize: 14, fontFace: FONT_BODY, color: C.accent,
        bold: true, align: "center", margin: 0,
      });
      s.addText(features[idx], {
        x: x + 0.45, y, w: colWidth - 0.55, h: 0.4,
        fontSize: 10, fontFace: FONT_BODY, color: C.text,
        margin: 0, valign: "middle",
      });
    }
  }

  addFooter(s, n(), TOTAL);
}

// ─── 12. PRÓXIMAS FUNCIONES ────────────────────────────────────────────
{
  const s = addSlide();
  s.addText("PRÓXIMAS FUNCIONES", {
    x: 0.6, y: 0.5, w: 8, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 6, margin: 0,
  });
  s.addText("Lo que viene.", {
    x: 0.6, y: 0.85, w: 9, h: 0.8,
    fontSize: 36, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("Funciones planificadas en el roadmap.", {
    x: 0.6, y: 1.6, w: 9, h: 0.4,
    fontSize: 13, fontFace: FONT_BODY, color: C.muted, italic: true, margin: 0,
  });

  const rows = [
    [
      { text: "ÁREA", options: { fill: { color: C.card }, color: C.accent, bold: true, fontFace: FONT_BODY, fontSize: 9, charSpacing: 3 } },
      { text: "QUÉ TRAE", options: { fill: { color: C.card }, color: C.accent, bold: true, fontFace: FONT_BODY, fontSize: 9, charSpacing: 3 } },
    ],
    ["Campañas de marketing", "Planificador de contenido, seguimiento de campañas pagadas en Meta y Google, cálculo de retorno por campaña"],
    ["CRM avanzado", "Seguimiento financiero de gigs, etiquetas personalizadas, notas privadas por venue, recordatorios recurrentes"],
    ["Directorio público de DJs", "Perfil indexable y buscable por género y ciudad, indicador \"disponible para tocar\", inbox unificado de bookings"],
    ["Operación de show", "Tech rider editable visualmente, registro de tracklists post-show con exportación a redes"],
    ["IA más profunda", "Clasificación automática de emails, bio adaptable según el destinatario"],
    ["Instagram automático", "Sincronización de seguidores de Instagram (a evaluar más adelante)"],
    ["Música personal", "Biblioteca propia de tracks (BPM, key, género) y lista de pendientes"],
    ["Membresías", "Modelo de suscripción y dominio propio cuando la app esté lista para abrirse al público"],
  ];
  s.addTable(rows, {
    x: 0.6, y: 2.1, w: 8.8,
    colW: [2.6, 6.2],
    fontSize: 10, fontFace: FONT_BODY, color: C.text,
    fill: { color: C.bg },
    border: { type: "solid", pt: 0.5, color: C.border },
    rowH: 0.32,
  });

  addFooter(s, n(), TOTAL);
}

// ─── 13. CIERRE + DISCLAIMER ───────────────────────────────────────────
{
  const s = addSlide();

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.15, h: SLIDE_H,
    fill: { color: C.accent }, line: { width: 0 },
  });

  s.addText("La carrera del DJ", {
    x: 0.6, y: 1.0, w: 9, h: 0.9,
    fontSize: 40, fontFace: FONT_DISPLAY, color: C.text, bold: true, margin: 0,
  });
  s.addText("en un solo lugar.", {
    x: 0.6, y: 1.95, w: 9, h: 0.7,
    fontSize: 32, fontFace: FONT_DISPLAY, color: C.accent, bold: true, margin: 0,
  });

  // Disclaimer del nombre
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 3.4, w: 8.8, h: 1.4,
    fill: { color: C.accentSoft }, line: { color: C.accent, width: 1 },
  });
  s.addText("SOBRE EL NOMBRE", {
    x: 0.8, y: 3.55, w: 8, h: 0.3,
    fontSize: 9, fontFace: FONT_BODY, color: C.accent,
    bold: true, charSpacing: 4, margin: 0,
  });
  s.addText(
    "\"JAY Manager OS\" es solo el nombre interno de esta versión de prueba. " +
    "El producto público va a llevar un nombre comercial neutro, no vinculado a la marca personal de DJ.",
    {
      x: 0.8, y: 3.9, w: 8.4, h: 0.8,
      fontSize: 12, fontFace: FONT_BODY, color: C.text, margin: 0,
    }
  );

  addFooter(s, n(), TOTAL);
}

// ─── Save ───────────────────────────────────────────────────────────────
pres.writeFile({
  fileName: "/Users/jayportu/Desktop/jayportu_Manager_OS/JAY_Manager_OS_funcionalidades.pptx",
}).then((file) => {
  console.log("✓ Pitch generado:", file);
  console.log(`  Total slides: ${TOTAL}`);
});
