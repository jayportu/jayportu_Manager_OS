/**
 * Prompts reutilizables para Ollama y para ChatGPT Strategy Mode.
 * Diseñados para JAY PORTU específicamente.
 */

import type {
  Contact,
  DjProfile,
  Interaction,
} from "@/types/database";
import { CONTACT_TYPE_LABELS, CONTACT_STATUS_LABELS } from "@/types/database";

// ─── Sistema base ─────────────────────────────────────────────────────
export const JAY_SYSTEM_PROMPT = `
Eres asistente personal de JAY PORTU, un DJ chileno de música electrónica.
Estilos: House, Tech House, Jackin, Progressive, Melodic Techno.
Base: Santiago de Chile.
Tu objetivo: ayudar a JAY a gestionar su carrera de forma profesional.

Tono al redactar mensajes:
- Cercano pero profesional
- Tuteo chileno (tú/tienes), NO voseo argentino (vos/tenés)
- Sin modismos chilenos exagerados (nada de "bacán", "te tinca", "cachar")
- Directo, sin rodeos innecesarios
- Cero corporativo o aspirante

Cuando devuelvas mensajes para enviar:
- Siempre en castellano de Chile neutro
- Máximo 3 párrafos cortos
- Sin asunto si es WhatsApp
- Con asunto si es email
- Cierre cordial pero no efusivo
`.trim();

// ─── Builder: contexto de un contacto ────────────────────────────────
export function buildContactContext(
  contact: Contact,
  recentInteractions: Interaction[] = [],
  djProfile?: DjProfile | null
): string {
  const lines: string[] = [];

  lines.push(`Contacto: ${contact.name}`);
  lines.push(`Tipo: ${CONTACT_TYPE_LABELS[contact.type]}`);
  if (contact.city) lines.push(`Ciudad: ${contact.city}, ${contact.country}`);
  if (contact.contact_person)
    lines.push(`Persona de contacto: ${contact.contact_person}${contact.contact_role ? ` (${contact.contact_role})` : ""}`);
  if (contact.music_style)
    lines.push(`Estilo musical: ${contact.music_style}`);
  if (contact.main_channel)
    lines.push(`Canal principal: ${contact.main_channel}`);
  lines.push(`Estado en pipeline: ${CONTACT_STATUS_LABELS[contact.status]}`);
  lines.push(`Score: ${contact.score}/100 (${contact.score_reason})`);

  if (contact.notes) {
    lines.push("");
    lines.push("Notas internas:");
    lines.push(contact.notes);
  }

  if (recentInteractions.length > 0) {
    lines.push("");
    lines.push("Últimas interacciones (de la más reciente a la más vieja):");
    for (const i of recentInteractions.slice(0, 10)) {
      const date = new Date(i.happened_at).toLocaleDateString("es-CL");
      const dir = i.direction === "in" ? "ME ESCRIBIÓ" : "LE ESCRIBÍ";
      lines.push(`- ${date} · ${i.channel.toUpperCase()} · ${dir}`);
      if (i.note) lines.push(`  "${i.note}"`);
    }
  }

  if (djProfile?.artist_name) {
    lines.push("");
    lines.push(`Yo soy: ${djProfile.artist_name}`);
    if (djProfile.tagline) lines.push(`Tagline: ${djProfile.tagline}`);
    if (djProfile.genres.length > 0)
      lines.push(`Mis estilos: ${djProfile.genres.join(", ")}`);
  }

  return lines.join("\n");
}

// ─── Tipos de mensajes que podemos sugerir ───────────────────────────
export const REPLY_TYPES = [
  "primer_contacto",
  "follow_up",
  "envio_press_kit",
  "propuesta_fecha",
  "agradecimiento",
  "confirmacion_show",
  "respuesta_pregunta",
  "otro",
] as const;
export type ReplyType = (typeof REPLY_TYPES)[number];

export const REPLY_TYPE_LABELS: Record<ReplyType, string> = {
  primer_contacto: "Primer contacto",
  follow_up: "Follow-up",
  envio_press_kit: "Envío de press kit",
  propuesta_fecha: "Propuesta de fecha",
  agradecimiento: "Agradecimiento",
  confirmacion_show: "Confirmación de show",
  respuesta_pregunta: "Responder pregunta específica",
  otro: "Otro",
};

export const CHANNELS_FOR_REPLY = [
  "whatsapp",
  "email",
  "instagram",
] as const;
export type ChannelForReply = (typeof CHANNELS_FOR_REPLY)[number];

export const CHANNEL_LABELS: Record<ChannelForReply, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram DM",
};

const REPLY_TYPE_GUIDANCE: Record<ReplyType, string> = {
  primer_contacto:
    "Mensaje breve, presentarme, mencionar que me interesa su espacio/agenda, ofrecer link al press kit. Sin pedir fecha aún.",
  follow_up:
    "Retomar conversación sin sonar insistente. Mencionar contexto previo. Hacer una pregunta concreta.",
  envio_press_kit:
    "Mensaje corto, adjuntar link al press kit, ofrecerme para conversar sobre fechas. Cerrar con CTA.",
  propuesta_fecha:
    "Proponer una fecha concreta. Mencionar horario tentativo. Pedir confirmación.",
  agradecimiento:
    "Agradecer brevemente, sin sobrar. Si fue un show: mencionar 1 detalle bueno. Cierre cordial.",
  confirmacion_show:
    "Confirmar fecha + hora + lugar + duración + condiciones técnicas. Pedir confirmar rider.",
  respuesta_pregunta:
    "Responder directo a lo que preguntaron. Si hace falta más info, pedirla.",
  otro: "Mensaje a medida según contexto.",
};

// ─── Prompt: sugerir respuesta ───────────────────────────────────────
export function buildReplyPrompt(args: {
  contactContext: string;
  replyType: ReplyType;
  channel: ChannelForReply;
  extraInstructions?: string;
  presskitUrl?: string;
}): string {
  const channelGuidance: Record<ChannelForReply, string> = {
    whatsapp: "Formato WhatsApp: sin asunto, sin formalidades, máximo 2-3 párrafos cortos.",
    email: "Formato email: con línea de Asunto: al inicio, saludo, cuerpo, cierre cordial.",
    instagram: "Formato DM de Instagram: muy corto, casual, sin asunto.",
  };

  return `
Necesito redactar un mensaje a este contacto. Datos:

${args.contactContext}

═══════════════════════════════════════════════════════
Tipo de mensaje: ${REPLY_TYPE_LABELS[args.replyType]}
Canal: ${CHANNEL_LABELS[args.channel]}
${channelGuidance[args.channel]}

Guía específica para este tipo:
${REPLY_TYPE_GUIDANCE[args.replyType]}

${args.presskitUrl ? `Si necesitas mencionar press kit, usa este link: ${args.presskitUrl}\n` : ""}
${args.extraInstructions ? `Instrucciones adicionales:\n${args.extraInstructions}\n` : ""}
═══════════════════════════════════════════════════════

Redacta SOLO el mensaje final que se va a enviar (sin preámbulo, sin notas tuyas).
Nada de "Aquí tienes:" ni "Espero que te sirva". Solo el texto del mensaje, listo para copiar.
`.trim();
}

// ─── Prompt: resumir contacto ────────────────────────────────────────
export function buildSummaryPrompt(contactContext: string): string {
  return `
Resume en máximo 5 bullet points lo más importante de este contacto, en castellano.
Foco: qué pidió, qué falta hacer, qué oportunidad representa, próximos pasos.

${contactContext}

Devuelve SOLO los bullets, sin preámbulo. Cada bullet empieza con "• " y va en una línea.
`.trim();
}

// ─── Prompt: refinar score ───────────────────────────────────────────
export function buildScoreRefinePrompt(contactContext: string): string {
  return `
Analiza este contacto y dame:

1. Un score de 0 a 100 (donde 100 = altísima prioridad para JAY)
2. 3 razones concretas que justifiquen el score (basadas en data real, no genéricas)
3. 1 acción concreta recomendada para los próximos 7 días

${contactContext}

Formato de respuesta:
SCORE: 87
RAZONES:
• razón 1
• razón 2
• razón 3
ACCIÓN:
texto de 1 línea
`.trim();
}

// ─── Prompt para ChatGPT (Strategy Mode) ─────────────────────────────
export function buildStrategyPrompt(args: {
  contactContext: string;
  question: string;
  djProfile?: DjProfile | null;
}): string {
  return `
${JAY_SYSTEM_PROMPT}

═══════════════════════════════════════════════════════
CONTEXTO DEL CONTACTO:

${args.contactContext}

═══════════════════════════════════════════════════════
PREGUNTA / SITUACIÓN:

${args.question}

═══════════════════════════════════════════════════════

Por favor responde de forma estratégica, considerando:
- Mi posicionamiento como DJ
- El estado actual del pipeline con este contacto
- Próximos pasos concretos (no consejos vagos)
- Si recomiendas un mensaje, dámelo redactado listo para copiar

Sé directo y útil. No me cuentes cosas que ya están en el contexto.
`.trim();
}
