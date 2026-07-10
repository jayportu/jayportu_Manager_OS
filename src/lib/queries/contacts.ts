import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  ContactStatus,
  ContactType,
} from "@/types/database";
import { computeScoreForContact } from "@/lib/scoring";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Backstop server-side: limpia email/whatsapp con formato inválido antes de
 * persistir (no guardar basura). Lenient a propósito (clear, no throw) para no
 * romper a ningún caller — ej. convertir un booking con email raro. Aplica a
 * createContact y bulkInsertContacts → "validación en servidor" cubierta sin
 * importar la vía de entrada (form manual, import o conversión de booking).
 */
function sanitizeContactInput<T extends ContactInsert>(input: T): T {
  const out = { ...input };
  if (typeof out.email === "string") {
    const e = out.email.trim();
    out.email = e && EMAIL_RE.test(e) ? e : "";
  }
  if (typeof out.whatsapp === "string") {
    const w = out.whatsapp.trim();
    out.whatsapp = w && w.replace(/[^\d]/g, "").length >= 8 ? w : "";
  }
  return out;
}

/**
 * Calcula y aplica el score automático a un patch de contacto.
 * Se usa al insertar y al actualizar.
 * Si la operación es un update parcial, mezcla con el contacto existente.
 */
async function applyAutoScore(
  current: Partial<Contact> | null,
  patch: Partial<Contact>,
  interactionsCount = 0,
  lastInteractionAt: string | null = null
): Promise<{ score: number; score_reason: string }> {
  const merged = { ...current, ...patch };
  const breakdown = computeScoreForContact(
    {
      type: (merged.type as ContactType) || "otro",
      status: (merged.status as ContactStatus) || "nuevo",
      city: merged.city || "",
      country: merged.country || "",
      email: merged.email || "",
      whatsapp: merged.whatsapp || "",
      instagram: merged.instagram || "",
      website: merged.website || "",
      contact_person: merged.contact_person || "",
      music_style: merged.music_style || "",
    },
    interactionsCount,
    lastInteractionAt
  );
  return { score: breakdown.score, score_reason: breakdown.reason };
}

export interface ListContactsParams {
  search?: string;
  type?: ContactType;
  status?: ContactStatus;
  city?: string;
  minScore?: number;
  orderBy?: "score" | "last_contact_at" | "created_at" | "name";
  /** Sprint 19 — Filtrar contactos que tengan TODOS estos tags (AND). */
  tags?: string[];
  /** Tope de filas a traer para la lista (default 1000). El total/KPIs reales
   *  van por getContactStats (count exacto), no por el largo de esta lista. */
  limit?: number;
}

async function getUserOrThrow() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listContacts(
  params: ListContactsParams = {}
): Promise<Contact[]> {
  const { supabase, user } = await getUserOrThrow();
  const orderBy = params.orderBy ?? "score";
  const ascending = orderBy === "name";

  let q = supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id);

  if (params.type) q = q.eq("type", params.type);
  if (params.status) q = q.eq("status", params.status);
  if (params.city) q = q.eq("city", params.city);
  if (typeof params.minScore === "number") q = q.gte("score", params.minScore);
  if (params.search && params.search.trim().length > 0) {
    // PostgREST .or() usa comas y paréntesis como separadores de condiciones:
    // un término con esos chars (ej. "club, bar") rompe el filtro y devuelve
    // vacío. Los neutralizamos a espacio antes de armar el or().
    const s = params.search
      .trim()
      .replace(/[,()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (s.length > 0) {
      q = q.or(
        `name.ilike.%${s}%,city.ilike.%${s}%,contact_person.ilike.%${s}%,music_style.ilike.%${s}%,notes.ilike.%${s}%`
      );
    }
  }
  // Sprint 19 — Filtro AND por tags (contiene TODOS los tags pedidos)
  if (params.tags && params.tags.length > 0) {
    q = q.contains("tags", params.tags);
  }

  const { data, error } = await q
    .order(orderBy, { ascending, nullsFirst: false })
    .limit(params.limit ?? 1000);

  if (error) {
    console.error("listContacts error:", error);
    return [];
  }
  return data as Contact[];
}

const PIPELINE_STATUSES = ["interesado", "propuesta_enviada", "negociando"];
const VENUE_TYPES = ["club", "bar", "rooftop", "festival", "productora"];

export interface ContactStats {
  /** Total REAL de contactos que matchean el filtro (count exacto, sin cap). */
  total: number;
  inPipeline: number;
  venuesCount: number;
  avgScore: number;
  /** true si los KPIs (no el total) se calcularon sobre una muestra capada. */
  sampled: boolean;
}

/**
 * Totales/KPIs HONESTOS del CRM para la cabecera, con los MISMOS filtros que
 * listContacts. El `total` es un count exacto (no miente arriba del cap de la
 * lista); los KPIs se computan sobre hasta 10k filas (suficiente para cualquier
 * CRM real — si se excede, `sampled=true` lo señala).
 */
export async function getContactStats(
  params: ListContactsParams = {}
): Promise<ContactStats> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("contacts")
    .select("status, score, type", { count: "exact" })
    .eq("user_id", user.id);

  // Mismos filtros que listContacts (mantener en sync).
  if (params.type) q = q.eq("type", params.type);
  if (params.status) q = q.eq("status", params.status);
  if (params.city) q = q.eq("city", params.city);
  if (typeof params.minScore === "number") q = q.gte("score", params.minScore);
  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim().replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
    if (s.length > 0) {
      q = q.or(
        `name.ilike.%${s}%,city.ilike.%${s}%,contact_person.ilike.%${s}%,music_style.ilike.%${s}%,notes.ilike.%${s}%`
      );
    }
  }
  if (params.tags && params.tags.length > 0) q = q.contains("tags", params.tags);

  const STATS_CAP = 10000;
  const { data, count, error } = await q.limit(STATS_CAP);
  if (error || !data) {
    return { total: 0, inPipeline: 0, venuesCount: 0, avgScore: 0, sampled: false };
  }
  const rows = data as Array<{ status: string; score: number | null; type: string }>;
  const total = count ?? rows.length;
  const pipeline = new Set(PIPELINE_STATUSES);
  const venues = new Set(VENUE_TYPES);
  const inPipeline = rows.filter((c) => pipeline.has(c.status)).length;
  const venuesCount = rows.filter((c) => venues.has(c.type)).length;
  const sumScore = rows.reduce((acc, c) => acc + (c.score || 0), 0);
  const avgScore = rows.length ? Math.round(sumScore / rows.length) : 0;
  return { total, inPipeline, venuesCount, avgScore, sampled: total > rows.length };
}

/**
 * Sprint 19 — Lista todos los tags únicos usados por el user en sus contactos,
 * con un conteo de cuántos contactos los tienen. Útil para autocomplete + filtros.
 */
export async function listAllUserTags(): Promise<
  { tag: string; count: number }[]
> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .select("tags")
    .eq("user_id", user.id);
  if (error) return [];
  const counts = new Map<string, number>();
  for (const row of (data || []) as { tags: string[] | null }[]) {
    for (const t of row.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getContact(id: string): Promise<Contact | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("getContact error:", error);
    return null;
  }
  return data as Contact;
}

export async function createContact(rawInput: ContactInsert): Promise<Contact> {
  const { supabase, user } = await getUserOrThrow();
  const input = sanitizeContactInput(rawInput); // backstop email/whatsapp server-side
  // Auto-score
  const { score, score_reason } = await applyAutoScore(null, input, 0, null);
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...input, score, score_reason, user_id: user.id })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function updateContact(
  id: string,
  patch: ContactUpdate
): Promise<Contact> {
  const { supabase, user } = await getUserOrThrow();

  // Leer estado actual + interactions count para recalcular score
  const current = await getContact(id);
  if (!current) throw new Error("Contacto no encontrado");

  const { count } = await supabase
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("contact_id", id);

  const lastInteractionAt = current.last_contact_at;

  const { score, score_reason } = await applyAutoScore(
    current,
    patch,
    count ?? 0,
    lastInteractionAt
  );

  const { data, error } = await supabase
    .from("contacts")
    .update({ ...patch, score, score_reason })
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

/** Recalcula y guarda solo el score (usado después de addInteraction) */
export async function recomputeContactScore(contactId: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const current = await getContact(contactId);
  if (!current) return;
  const { count } = await supabase
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("contact_id", contactId);
  const { score, score_reason } = await applyAutoScore(
    current,
    {},
    count ?? 0,
    current.last_contact_at
  );
  await supabase
    .from("contacts")
    .update({ score, score_reason })
    .eq("user_id", user.id)
    .eq("id", contactId);
}

export async function deleteContact(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function bulkInsertContacts(
  rows: ContactInsert[]
): Promise<{ inserted: number; skipped: number }> {
  const { supabase, user } = await getUserOrThrow();
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  // Dedup: contra los contactos existentes del user Y dentro del propio lote
  // (antes re-importar el mismo CSV duplicaba todo). Clave = nombre+ciudad
  // normalizados; email no vacío como clave secundaria.
  const { data: existing } = await supabase
    .from("contacts")
    .select("name, city, email")
    .eq("user_id", user.id);
  const nameKey = (n?: string | null, c?: string | null) =>
    `${(n ?? "").trim().toLowerCase()}|${(c ?? "").trim().toLowerCase()}`;
  const seenNames = new Set<string>();
  const seenEmails = new Set<string>();
  for (const e of (existing ?? []) as {
    name: string;
    city: string | null;
    email: string | null;
  }[]) {
    seenNames.add(nameKey(e.name, e.city));
    if (e.email) seenEmails.add(e.email.trim().toLowerCase());
  }

  const fresh: ContactInsert[] = [];
  let skipped = 0;
  for (const raw of rows) {
    const r = sanitizeContactInput(raw); // backstop email/whatsapp server-side
    const nk = nameKey(r.name, r.city);
    const ek = r.email ? r.email.trim().toLowerCase() : "";
    if (seenNames.has(nk) || (ek && seenEmails.has(ek))) {
      skipped++;
      continue;
    }
    seenNames.add(nk);
    if (ek) seenEmails.add(ek);
    fresh.push(r);
  }
  if (fresh.length === 0) return { inserted: 0, skipped };

  const payload = await Promise.all(
    fresh.map(async (r) => {
      // Respetar el score que vino en el CSV (si la columna lo trajo); si no,
      // auto-score. Antes SIEMPRE se auto-scoreaba → el score del CSV que el
      // preview mostraba se perdía en silencio.
      if (typeof r.score === "number") {
        // Clamp server-side a 0–100 (CHECK de migración 0002). El form ya
        // clampea al parsear, pero sin esto un score fuera de rango que llegue
        // al helper viola el CHECK y aborta el batch entero (un solo mal valor).
        const score = Math.min(100, Math.max(0, Math.round(r.score)));
        return { ...r, score, score_reason: "Importado del CSV", user_id: user.id };
      }
      const { score, score_reason } = await applyAutoScore(null, r, 0, null);
      return { ...r, score, score_reason, user_id: user.id };
    })
  );
  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("id");
  if (error) throw new Error(error.message);
  return { inserted: data?.length ?? 0, skipped };
}

export async function countContacts(): Promise<{
  total: number;
  avgScore: number;
  byStatus: Record<string, number>;
}> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .select("status, score")
    .eq("user_id", user.id);
  if (error || !data) return { total: 0, avgScore: 0, byStatus: {} };

  const total = data.length;
  const sumScore = data.reduce((acc, c) => acc + (c.score || 0), 0);
  const avgScore = total ? Math.round(sumScore / total) : 0;
  const byStatus: Record<string, number> = {};
  for (const c of data) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }
  return { total, avgScore, byStatus };
}
