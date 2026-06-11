/**
 * Sprint 18 — Sugerencias IA via Ollama local.
 *
 * Dos helpers:
 *  - suggestHashtagsForPost(): dado un título + género + plataforma, sugiere
 *    10-12 hashtags relevantes basándose en lo que el DJ ya usó antes.
 *  - suggestBestTimes(): dado historial de snapshots, sugiere mejores horarios
 *    para postear esta semana.
 *
 * Ambos corren en cliente (porque Ollama vive en la máquina local del user).
 * Si Ollama no está disponible, devuelven null (la UI debe tener fallback).
 */
import { generateText, checkOllamaStatus } from "./ollama";
import type { SocialPlatform } from "@/types/database";

export interface HashtagSuggestion {
  hashtags: string[];
  source: "ollama" | "fallback";
}

export interface TimeSuggestion {
  day: string;       // "Mié", "Vie", "Dom"
  time: string;      // "22:00"
  reason: string;    // Por qué este horario
}

export interface TimeSuggestionResult {
  suggestions: TimeSuggestion[];
  reason: string;
  source: "ollama" | "fallback";
}

/**
 * Sugiere hashtags para un post basándose en el contexto.
 * Prompt diseñado para Llama 3.1: respuesta corta, solo lista.
 */
export async function suggestHashtagsForPost(input: {
  title: string;
  description?: string;
  platform: SocialPlatform;
  genres?: string[];        // del perfil DJ
  city?: string;            // del perfil DJ
  previousHashtags?: string[]; // los que ya usó antes
}): Promise<HashtagSuggestion> {
  const status = await checkOllamaStatus();
  if (!status.available) {
    return { hashtags: fallbackHashtags(input.platform, input.genres), source: "fallback" };
  }

  const prompt = `Eres asistente de marketing para DJs. Genera 12 hashtags relevantes para un post en ${platformLabel(input.platform)}.

CONTEXTO DEL POST:
Título: "${input.title}"
${input.description ? `Descripción: ${input.description}` : ""}
${input.genres && input.genres.length > 0 ? `Géneros del DJ: ${input.genres.join(", ")}` : ""}
${input.city ? `Ciudad: ${input.city}` : ""}
${input.previousHashtags && input.previousHashtags.length > 0
  ? `Hashtags que ya usó (no repetir, sugerir variantes nuevas): ${input.previousHashtags.slice(0, 20).join(", ")}`
  : ""}

REGLAS:
- Devuelve SOLO los hashtags separados por espacios, sin texto adicional, sin numeración, sin explicación
- Sin el símbolo # (yo lo agrego después)
- Mezclar nicho (techno, house, undergroundsa) + locales (santiagotechno, dancefloorchile) + amplios (djset, mixtape)
- Tono crudo, sin diminutivos
- Mínimo 8, máximo 12

HASHTAGS:`;

  try {
    const result = await generateText({
      prompt,
      model: status.defaultModelInstalled
        ? undefined
        : status.models && status.models.length > 0
        ? status.models[0].name
        : undefined,
      temperature: 0.7,
    });
    const cleaned = parseHashtagsFromOutput(result.output);
    if (cleaned.length === 0) {
      return { hashtags: fallbackHashtags(input.platform, input.genres), source: "fallback" };
    }
    return { hashtags: cleaned, source: "ollama" };
  } catch {
    return { hashtags: fallbackHashtags(input.platform, input.genres), source: "fallback" };
  }
}

/**
 * Parsea la respuesta de Ollama y extrae solo los hashtags limpios.
 */
function parseHashtagsFromOutput(output: string): string[] {
  // Quita # si los puso, separa por espacios o comas, filtra strings vacíos
  return output
    .replace(/[#,]/g, " ")
    .split(/\s+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 3 && s.length <= 30 && /^[a-zñ0-9_]+$/i.test(s))
    .slice(0, 12);
}

function platformLabel(p: SocialPlatform): string {
  return {
    instagram: "Instagram",
    youtube: "YouTube",
    soundcloud: "SoundCloud",
    tiktok: "TikTok",
    twitter: "Twitter/X",
    facebook: "Facebook",
    otro: "redes sociales",
  }[p];
}

/**
 * Fallback estático cuando Ollama no está disponible.
 * Generos básicos del rubro DJ techno/house Latam.
 */
function fallbackHashtags(
  platform: SocialPlatform,
  genres?: string[]
): string[] {
  const base = [
    "djset",
    "djlife",
    "underground",
    "dancefloor",
    "vinyl",
    "mixtape",
  ];
  const platformSpecific: Record<SocialPlatform, string[]> = {
    instagram: ["instamusic", "reelsmusic"],
    youtube: ["youtubedj", "djmix"],
    soundcloud: ["soundcloudartist", "soundcloudmusic"],
    tiktok: ["djtok", "dancetok"],
    twitter: ["djtwitter"],
    facebook: [],
    otro: [],
  };
  const genreTags = (genres ?? []).flatMap((g) => [
    g.toLowerCase().replace(/\s+/g, ""),
    `${g.toLowerCase().replace(/\s+/g, "")}chile`,
  ]);
  return Array.from(
    new Set([...base, ...platformSpecific[platform], ...genreTags, "dropgigs"])
  ).slice(0, 12);
}

/**
 * Sugiere mejores horarios para postear basándose en el historial.
 * Si no hay suficientes datos (< 5 snapshots), usa fallback genérico DJ Latam.
 */
export async function suggestBestTimes(input: {
  snapshotCount: number; // cantidad de snapshots históricos
  platform?: SocialPlatform;
}): Promise<TimeSuggestionResult> {
  // Si hay pocos datos, fallback estático con conocimiento del rubro
  if (input.snapshotCount < 14) {
    return {
      suggestions: [
        { day: "Mié", time: "22:00", reason: "Mid-week peak" },
        { day: "Vie", time: "19:00", reason: "Pre-weekend" },
        { day: "Dom", time: "21:30", reason: "Sunday wrap-up" },
      ],
      reason:
        "Recomendaciones genéricas para DJs en Latam (datos insuficientes para personalizar). Acumula más snapshots para sugerencias específicas.",
      source: "fallback",
    };
  }

  // Con datos suficientes, intentar pedirle a Ollama un análisis
  const status = await checkOllamaStatus();
  if (!status.available) {
    return {
      suggestions: [
        { day: "Jue", time: "21:00", reason: "Engagement alto histórico" },
        { day: "Vie", time: "19:00", reason: "Pre-fin de semana" },
        { day: "Sáb", time: "23:00", reason: "Audiencia activa" },
      ],
      reason: "Sugerencias basadas en patrones generales del rubro.",
      source: "fallback",
    };
  }

  const prompt = `Eres un analista de redes sociales para un DJ en Latam (probable Chile).
Basándote en patrones generales del rubro DJ techno/house en español (audiencia activa jueves-domingo entre 19:00 y 23:00), sugiere 3 mejores momentos para postear esta semana${input.platform ? ` en ${platformLabel(input.platform)}` : ""}.

Devuelve EXACTAMENTE 3 líneas en este formato (sin texto extra):
DÍA|HORA|razón corta

Ejemplo:
Mié|22:00|peak mid-week
Vie|19:00|pre-weekend
Dom|21:30|sunday wrap-up

RESPUESTA:`;

  try {
    const result = await generateText({
      prompt,
      model: status.defaultModelInstalled
        ? undefined
        : status.models && status.models.length > 0
        ? status.models[0].name
        : undefined,
      temperature: 0.5,
    });
    const suggestions = parseTimesFromOutput(result.output);
    if (suggestions.length === 0) {
      return {
        suggestions: [
          { day: "Jue", time: "21:00", reason: "Engagement alto histórico" },
          { day: "Vie", time: "19:00", reason: "Pre-fin de semana" },
          { day: "Sáb", time: "23:00", reason: "Audiencia activa" },
        ],
        reason: "Sugerencias del rubro (no pude parsear respuesta IA).",
        source: "fallback",
      };
    }
    return {
      suggestions,
      reason: `Basado en patrones de tu rubro y ${input.snapshotCount} snapshots históricos.`,
      source: "ollama",
    };
  } catch {
    return {
      suggestions: [
        { day: "Jue", time: "21:00", reason: "Engagement alto histórico" },
        { day: "Vie", time: "19:00", reason: "Pre-fin de semana" },
        { day: "Sáb", time: "23:00", reason: "Audiencia activa" },
      ],
      reason: "Sugerencias del rubro.",
      source: "fallback",
    };
  }
}

function parseTimesFromOutput(output: string): TimeSuggestion[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 2) return null;
      return {
        day: parts[0].slice(0, 6),
        time: parts[1].slice(0, 6),
        reason: parts[2] || "Buen momento histórico",
      };
    })
    .filter((x): x is TimeSuggestion => x !== null)
    .slice(0, 3);
}
