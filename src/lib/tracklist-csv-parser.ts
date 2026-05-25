/**
 * Sprint 21 — Parser de exports CSV de Rekordbox / Serato / Traktor.
 *
 * Cada software tiene un formato distinto de columnas. Detectamos el formato
 * leyendo los headers de la primera línea. Si no calza con ninguno conocido,
 * intentamos un parseo genérico (Artista, Título, BPM, Key, Label).
 *
 * Devuelve filas ya con shape de TracklistTrackInsert (sin tracklist_id).
 */

export interface ParsedTrack {
  artist: string;
  title: string;
  label: string;
  bpm: number | null;
  music_key: string;
  played_at: string | null;
  sort_order: number;
}

export interface ParseResult {
  format: "rekordbox" | "serato" | "traktor" | "generic" | "unknown";
  tracks: ParsedTrack[];
  errors: string[];
}

/**
 * Parser robusto que soporta CSV y TSV (Rekordbox exporta tabs por default).
 * Maneja comillas dobles para campos con coma/tab embebidos.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(headerLine: string): string {
  const tabs = (headerLine.match(/\t/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  if (tabs >= commas && tabs >= semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Convierte "9A" / "Cmaj" / "1B" en string normalizado en mayúsculas.
 */
function normalizeKey(k: string): string {
  if (!k) return "";
  return k.trim().toUpperCase().slice(0, 6);
}

function parseBpm(s: string): number | null {
  if (!s) return null;
  // Acepta "128", "128.5", "128,5"
  const n = parseFloat(s.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 250) return null;
  return Math.round(n * 10) / 10;
}

export function parseTracklistCsv(raw: string): ParseResult {
  const errors: string[] = [];
  const cleaned = raw
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (cleaned.length === 0) {
    return { format: "unknown", tracks: [], errors: ["Archivo vacío"] };
  }
  const headerLine = cleaned[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = parseCsvLine(headerLine, delimiter).map(normalizeHeader);

  // Detectar formato
  let format: ParseResult["format"] = "unknown";
  if (headers.includes("trackno") || headers.includes("artwork") || headers.includes("filename")) {
    format = "rekordbox";
  } else if (headers.includes("playtime") || headers.includes("starttime")) {
    format = "serato";
  } else if (headers.includes("traktor")) {
    format = "traktor";
  } else if (
    headers.includes("artist") ||
    headers.includes("title") ||
    headers.includes("artista") ||
    headers.includes("nombre")
  ) {
    format = "generic";
  }

  // Mapeo de aliases por columna
  const idx = {
    artist: pickIndex(headers, ["artist", "artists", "artista"]),
    title: pickIndex(headers, ["title", "track", "trackname", "name", "nombre", "titulo"]),
    label: pickIndex(headers, ["label", "sello"]),
    bpm: pickIndex(headers, ["bpm", "tempo"]),
    key: pickIndex(headers, ["key", "tonalidad", "tonality"]),
    playedAt: pickIndex(headers, [
      "starttime",
      "playtime",
      "playedat",
      "start",
      "time",
    ]),
  };

  if (idx.artist === -1 && idx.title === -1) {
    return {
      format,
      tracks: [],
      errors: ["No se detectó columna 'Artist' ni 'Title'."],
    };
  }

  const tracks: ParsedTrack[] = [];
  for (let i = 1; i < cleaned.length; i++) {
    const cells = parseCsvLine(cleaned[i], delimiter);
    const artist = idx.artist >= 0 ? cells[idx.artist] || "" : "";
    const title = idx.title >= 0 ? cells[idx.title] || "" : "";
    if (!artist && !title) continue;
    tracks.push({
      artist,
      title,
      label: idx.label >= 0 ? cells[idx.label] || "" : "",
      bpm: idx.bpm >= 0 ? parseBpm(cells[idx.bpm] || "") : null,
      music_key: idx.key >= 0 ? normalizeKey(cells[idx.key] || "") : "",
      played_at: null, // No es trivial parsear timestamp en cada formato
      sort_order: tracks.length + 1,
    });
  }

  if (tracks.length === 0) {
    errors.push("No se encontró ninguna fila con datos.");
  }

  return { format, tracks, errors };
}

function pickIndex(headers: string[], aliases: string[]): number {
  for (const a of aliases) {
    const i = headers.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}
