const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber,
  Header, Footer, LevelFormat, PageBreak,
} = require("docx");

const INK = "0A0A0A", ORANGE = "FF5C00", MUTED = "5B554C", LIGHT = "F4EFE7";
const FONT = "Arial";

// ── helpers ──
const kicker = (t) => new Paragraph({
  spacing: { before: 260, after: 40 },
  children: [new TextRun({ text: t.toUpperCase(), font: FONT, size: 17, bold: true, color: ORANGE, characterSpacing: 30 })],
});
const sectionTitle = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 40, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE, space: 4 } },
  children: [new TextRun({ text: t, font: FONT, size: 30, bold: true, color: INK })],
});
const feature = (name, desc) => [
  new Paragraph({
    spacing: { before: 120, after: 10 },
    children: [new TextRun({ text: name, font: FONT, size: 23, bold: true, color: INK })],
  }),
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: desc, font: FONT, size: 21, color: "333333" })],
  }),
];

function featureSection(kick, titleText, items) {
  const out = [kicker(kick), sectionTitle(titleText)];
  items.forEach(([n, d]) => out.push(...feature(n, d)));
  return out;
}

// ── roadmap table ──
const rmHeader = ["SPRINT", "QUÉ SUMA", "ESTADO", "EST."];
const rmRows = [
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
const colW = [1100, 5360, 1700, 1200]; // sum 9360
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "D8D2C7" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
function tcell(text, i, opts = {}) {
  return new TableCell({
    borders, width: { size: colW[i], type: WidthType.DXA },
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: i >= 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, font: FONT, size: opts.size || 20, bold: !!opts.bold, color: opts.color || "333333" })],
    })],
  });
}
const roadmapTable = new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: colW,
  rows: [
    new TableRow({ tableHeader: true, children: rmHeader.map((h, i) => tcell(h, i, { fill: ORANGE, color: INK, bold: true })) }),
    ...rmRows.map((r, ri) => new TableRow({
      children: r.map((c, i) => tcell(c, i, {
        fill: ri % 2 === 0 ? "FAF7F1" : "FFFFFF",
        bold: i === 0,
        color: i === 0 ? "C24600" : "333333",
        size: i === 0 ? 21 : 20,
      })),
    })),
  ],
});

// ── document ──
const doc = new Document({
  creator: "DROP.",
  title: "DROP. — Estado del producto",
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: {
    config: [{
      reference: "steps",
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } }],
    }],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "DROP. · THE DJ OS · MAYO 2026 · pág. ", font: FONT, size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED })],
      })] }),
    },
    children: [
      // Cover block
      new Paragraph({ spacing: { after: 0 }, children: [
        new TextRun({ text: "DROP", font: FONT, size: 72, bold: true, color: INK }),
        new TextRun({ text: ".", font: FONT, size: 72, bold: true, color: ORANGE }),
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "THE DJ OS", font: FONT, size: 20, bold: true, color: MUTED, characterSpacing: 40 })] }),
      new Paragraph({ spacing: { before: 80, after: 60 }, children: [new TextRun({ text: "Estado del producto", font: FONT, size: 40, bold: true, color: INK })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Lo que ya está en producción + el roadmap pendiente · Mayo 2026", font: FONT, size: 22, color: MUTED, italics: true })] }),
      new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Sistema operativo para DJs independientes — CRM, press kit, bookings, IA y crecimiento en un solo lugar. App personal de JAY PORTU, en beta cerrada, con arquitectura multi-usuario desde el día 1.", font: FONT, size: 21, color: "333333" })] }),

      // Qué es + stack
      ...featureSection("Qué es DROP.", "El DJ OS, montado a costo $0", [
        ["Producto", "App de gestión de carrera DJ. Hoy en beta cerrada por invitación (acceso de 15 días). Arquitectura multi-usuario desde el día 1 (RLS por usuario en Postgres)."],
        ["Stack", "Next.js 14 (App Router) + TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage) · Vercel · Ollama (IA local) · Resend (mail transaccional)."],
        ["Costo de operación", "$0 — Supabase Free, Vercel Hobby e IA local con Ollama. Sin gateways de pago ni servicios externos que cobren."],
        ["Visión", "Probar valor con los beta testers actuales y evolucionar a SaaS para DJs con membresías (workspaces, planes, branding configurable)."],
      ]),

      new Paragraph({ pageBreakBefore: true, children: [] }),

      // EN PRODUCCIÓN intro
      kicker("En producción"),
      sectionTitle("Lo que ya está en producción"),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Todo lo siguiente está desplegado y funcionando end-to-end en producción. Organizado en seis áreas.", font: FONT, size: 21, color: "333333" })] }),

      ...featureSection("1 · Núcleo de gestión", "La operación diaria", [
        ["Dashboard", "Panel de inicio con la foto del estado: agenda, contactos, bookings y métricas clave en un vistazo."],
        ["CRM de contactos", "Contactos con tags, notas privadas, timeline de interacciones, follow-ups (incluye recurrentes) e importación masiva por CSV."],
        ["Calendario + finanzas", "Eventos con datos financieros por show (caché, gastos), edición rápida y sincronización automática con Google Calendar."],
        ["Plantillas", "Mensajes reutilizables con sistema de variables (nombre, fecha, evento…) para responder rápido y consistente."],
      ]),

      ...featureSection("2 · Press kit & bookings", "Del perfil al cierre del show", [
        ["Press kit público dual", "En /p/tu-nombre: bio, géneros, embeds de música y video, tech rider y stage plot. PDF subido o generado, con tracking de visitas y clics."],
        ["Inbox de bookings", "Los requests llegan a un inbox; cotizas el monto y se genera un follow-up automático en el CRM."],
        ["Máquina de estados + contraoferta", "Flujo bidireccional: leído → cotizado → contraofertado por el booker → agendado/rechazado. El booker responde sin login vía /b/[token]."],
        ["Timeline + notificaciones", "Cada cambio queda en un timeline con fecha y autor, y dispara push + mail automático a ambas partes."],
      ]),

      ...featureSection("3 · Crecimiento & IA", "Conseguir y cerrar más fechas", [
        ["Campañas outbound", "Campañas de mail en frío a contactos del CRM, con seguimiento de envíos y estado por contacto."],
        ["Growth & posts", "Módulo de crecimiento: planificación de posts (board) y snapshots de métricas para seguir el avance."],
        ["Descubrir leads", "Encuentra venues y locales por zona (datos OpenStreetMap/Overpass) y los pasa al CRM como leads."],
        ["IA local (Ollama)", "Asistente de estrategia y sugerencias para mails corriendo en local — sin costo de API y con tus datos en tu máquina."],
      ]),

      new Paragraph({ pageBreakBefore: true, children: [] }),

      ...featureSection("4 · Integraciones", "Conectado con tus herramientas", [
        ["Gmail", "Bandeja integrada con OAuth + sync automático: lees hilos y asocias correos a contactos del CRM sin salir de DROP."],
        ["Google Calendar", "Sincronización de eventos para que la agenda esté siempre al día."],
        ["YouTube & SoundCloud", "Auto-sync de tu contenido para alimentar el press kit y los embeds públicos."],
        ["PWA + Push", "App instalable en el teléfono (iOS/Android) con notificaciones push para bookings y recordatorios."],
      ]),

      ...featureSection("5 · Público & marketplace", "La cara pública de DROP.", [
        ["Landing DJ / Booker", "Página de entrada que comunica la propuesta de valor antes del gate de invite, dividida para DJs y bookers."],
        ["Directorio público /dj", "Catálogo de DJs verificados, filtrable por género, ciudad y disponibilidad, con datos estructurados para SEO."],
        ["Press kit público /p/[slug]", "Cada DJ con su perfil público navegable y compartible, con formulario de booking directo."],
        ["Portal Booker (Próximamente)", "Backend ya construido (cuentas, favoritos, requests, vista /b/[token]). El registro está deshabilitado hasta el lanzamiento; el directorio ya es navegable y los requests por perfil funcionan."],
      ]),

      ...featureSection("6 · Infra, beta & admin", "Lo que sostiene todo", [
        ["Beta 15 días + NPS", "Onboarding wizard, acceso de 15 días con lockout automático, encuesta NPS y captura de feedback de los testers."],
        ["Backoffice + roles", "Panel admin (solo tú): solicitudes de beta, feedback y analytics de uso. Roles de administrador."],
        ["Backups & confiabilidad", "Backups semanales automáticos (pg_dump) a repo privado. Crons para sync de Gmail, growth y envío de push."],
        ["Deliverability & SEO", "Emails con anti-spam compliance (List-Unsubscribe). Sitemap dinámico + robots.txt para indexar el directorio en Google."],
      ]),

      new Paragraph({ pageBreakBefore: true, children: [] }),

      // ROADMAP
      kicker("Roadmap pendiente"),
      sectionTitle("Lo que sigue"),
      new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: "Sprints planificados, en orden de prioridad. Los estimados son de desarrollo, sin contar revisiones, bugs ni pulido.", font: FONT, size: 21, color: "333333" })] }),
      roadmapTable,
      new Paragraph({ spacing: { before: 140, after: 240 }, children: [new TextRun({ text: "Total estimado restante: ~33-43 días de trabajo.", font: FONT, size: 21, bold: true, color: ORANGE })] }),

      // PRÓXIMOS PASOS
      kicker("Próximos pasos"),
      sectionTitle("Por dónde seguir"),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [
        new TextRun({ text: "Decidir firma electrónica. ", font: FONT, size: 21, bold: true, color: INK }),
        new TextRun({ text: "Simple (click-wrap + hash, gratis, Ley 19.799) vs avanzada. Define cómo se diseña S18.5 (Contratos).", font: FONT, size: 21, color: "333333" }),
      ] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [
        new TextRun({ text: "Decidir gateway de pago. ", font: FONT, size: 21, bold: true, color: INK }),
        new TextRun({ text: "Flow (Chile) primero o MercadoPago (LATAM). Define cómo se diseña S19 (Pagos).", font: FONT, size: 21, color: "333333" }),
      ] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [
        new TextRun({ text: "Lanzar el Booker. ", font: FONT, size: 21, bold: true, color: INK }),
        new TextRun({ text: "Backend listo. Falta decidir campos obligatorios, anti-spam en el signup y el timing (depende de tener suficientes DJs en /dj).", font: FONT, size: 21, color: "333333" }),
      ] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [
        new TextRun({ text: "Limpieza de orden (opcional). ", font: FONT, size: 21, bold: true, color: INK }),
        new TextRun({ text: "Deuda técnica documentada que no bloquea: unificar rutas de campañas y definir el gate de entrada. Atacar en sesiones cortas.", font: FONT, size: 21, color: "333333" }),
      ] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync("DROP_estado_producto.docx", buf); console.log("OK → DROP_estado_producto.docx"); });
