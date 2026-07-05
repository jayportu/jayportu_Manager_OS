"use server";

import { updateMyProfile, getMyProfile } from "@/lib/queries/dj-profile";
import { isPresskitLiveReady } from "@/lib/match/completeness";
import { normalizeUrl } from "@/lib/format";
import { isSafePublicHttpUrl } from "@/lib/url-guard";
import {
  addRiderItem,
  updateRiderItem,
  deleteRiderItem,
} from "@/lib/queries/tech-rider";
import { assertBetaActive } from "@/lib/queries/beta-guard";
import { maybeSendPresskitLiveEmail } from "@/lib/queries/activation-emails";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSecurityEvent } from "@/lib/security-audit";
import { maskEmail } from "@/lib/log-safe";
import { revalidatePath, revalidateTag } from "next/cache";
import type {
  DjProfileUpdate,
  TechRiderItem,
  TechRiderItemInsert,
} from "@/types/database";

export async function saveProfileAction(
  patch: DjProfileUpdate
): Promise<
  { ok: true; normalized: DjProfileUpdate } | { ok: false; error: string }
> {
  try {
    // Beta vencida = cuenta congelada: no se puede editar nada hasta reaperturar
    // (consistente con addRiderItemAction y el copy del paywall).
    await assertBetaActive();
    // Estado live-ready ANTES de guardar → el correo E3 ("press kit vivo") solo
    // se dispara en la transición incompleto→completo, no en cada guardado de un
    // perfil que ya estaba completo.
    const before = await getMyProfile();
    const wasLiveReady = before ? isPresskitLiveReady(before) : false;
    // Normalizar URLs de redes/web antes de guardar: trim + https:// si falta.
    // Sin esto, una URL pegada sin protocolo (ej. "soundcloud.com/foo") rompe
    // el embed del player y deja los links públicos como rutas relativas.
    const normalized: DjProfileUpdate = { ...patch };
    if (typeof normalized.instagram_url === "string")
      normalized.instagram_url = normalizeUrl(normalized.instagram_url);
    if (typeof normalized.soundcloud_url === "string")
      normalized.soundcloud_url = normalizeUrl(normalized.soundcloud_url);
    if (typeof normalized.youtube_url === "string")
      normalized.youtube_url = normalizeUrl(normalized.youtube_url);
    if (typeof normalized.spotify_url === "string")
      normalized.spotify_url = normalizeUrl(normalized.spotify_url);
    if (typeof normalized.beatport_url === "string")
      normalized.beatport_url = normalizeUrl(normalized.beatport_url);
    if (typeof normalized.bandcamp_url === "string")
      normalized.bandcamp_url = normalizeUrl(normalized.bandcamp_url);
    if (typeof normalized.website === "string")
      normalized.website = normalizeUrl(normalized.website);

    // Fee: descartar valores <= 0 (evita "Desde $0") y corregir rango invertido.
    if (typeof normalized.fee_min === "number" && normalized.fee_min <= 0)
      normalized.fee_min = null;
    if (typeof normalized.fee_max === "number" && normalized.fee_max <= 0)
      normalized.fee_max = null;
    if (
      typeof normalized.fee_min === "number" &&
      typeof normalized.fee_max === "number" &&
      normalized.fee_min > normalized.fee_max
    ) {
      const tmp = normalized.fee_min;
      normalized.fee_min = normalized.fee_max;
      normalized.fee_max = tmp;
    }

    await updateMyProfile(normalized);
    // Revalidar el dashboard, la config Y el press kit público para que
    // refleje cambios de bio, contacto, etc. instantáneamente.
    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dj");
    revalidateTag("public-djs");
    // E3 · Correo "press kit vivo" (best-effort; solo en la transición
    // incompleto→completo, ver wasLiveReady arriba).
    await maybeSendPresskitLiveEmail(wasLiveReady);
    // Devolvemos lo normalizado para que el form re-sincronice sus inputs
    // (URL con https:// agregado, fee corregido) en vez de seguir mostrando
    // lo que tipeó el usuario.
    return { ok: true, normalized };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

/**
 * Sprint 20 — Actualiza la configuración de marketplace del DJ:
 * visibilidad en /dj + disponibilidad para tocar.
 */
export async function updateAvailabilityAction(patch: {
  hidden_from_directory: boolean;
  available_from: string | null;
  available_until: string | null;
  available_note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertBetaActive(); // consistente con saveProfileAction (decisión 2026-06-11)
    await updateMyProfile(patch as DjProfileUpdate);
    revalidatePath("/configuracion");
    revalidatePath("/dj");
    revalidatePath("/p/[slug]", "page");
    revalidateTag("public-djs");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

// ════════════════════════════════════════════════════════════════════
// Sprint 21 — Tech rider items
// ════════════════════════════════════════════════════════════════════

export async function addRiderItemAction(
  input: TechRiderItemInsert
): Promise<{ ok: true; item: TechRiderItem } | { ok: false; error: string }> {
  try {
    await assertBetaActive();
    const item = await addRiderItem(input);
    revalidatePath("/configuracion");
    revalidatePath(`/p/[slug]`, "page");
    return { ok: true, item };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

export async function updateRiderItemAction(
  id: string,
  patch: Partial<TechRiderItemInsert>
): Promise<{ ok: true; item: TechRiderItem } | { ok: false; error: string }> {
  try {
    const item = await updateRiderItem(id, patch);
    revalidatePath("/configuracion");
    revalidatePath(`/p/[slug]`, "page");
    return { ok: true, item };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

export async function deleteRiderItemAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteRiderItem(id);
    revalidatePath("/configuracion");
    revalidatePath(`/p/[slug]`, "page");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

/**
 * Limpia los textareas legacy de tech rider (tech_rider_ideal,
 * tech_rider_alt, hospitality) cuando el DJ ya migró todo al editor
 * estructurado. Self-serve desde TechRiderSection.
 */
export async function clearLegacyTechRiderAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await updateMyProfile({
      tech_rider_ideal: "",
      tech_rider_alt: "",
      hospitality: "",
    } as DjProfileUpdate);
    revalidatePath("/configuracion");
    revalidatePath("/perfil");
    revalidatePath("/p/[slug]", "page");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

/**
 * Sprint 21 — Actualiza la config del webhook de auto-post (Zapier/Make/n8n).
 */
export async function updateAutoPostAction(patch: {
  auto_post_enabled: boolean;
  auto_post_webhook_url: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertBetaActive(); // consistente con saveProfileAction (decisión 2026-06-11)
    // Anti-SSRF: si hay URL, debe ser http(s) pública (no localhost/IP interna).
    if (patch.auto_post_webhook_url && !isSafePublicHttpUrl(patch.auto_post_webhook_url)) {
      return {
        ok: false,
        error: "La URL del webhook debe ser http(s) y pública (no localhost ni IPs internas).",
      };
    }
    await updateMyProfile(patch as DjProfileUpdate);
    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

/**
 * BL-04 · Borrado de cuenta self-service (Ley 21.719 — derecho de supresión).
 *
 * Elimina la cuenta del usuario logueado:
 *   - Borra el auth.user → el cascade FK (migración 0001) limpia dj_profile /
 *     booker_accounts y todas las tablas owned.
 *   - Borra los objetos de Storage del usuario en los buckets públicos.
 *   - Purga los huérfanos con datos personales que NO cascada, por email
 *     (beta_requests, que además guarda IP; event_rsvps).
 *   - Registra el evento en security_audit_log.
 *
 * Conservación: NO se tocan documentos tributarios (obligación legal) ni la
 * lista email_suppressions (registro de oposición). Ver 07-retencion.
 *
 * IRREVERSIBLE. La UI exige escribir "ELIMINAR". Los admins no se autoeliminan
 * por esta vía (se derivan a contacto manual).
 */
export async function deleteMyAccountAction(
  confirmation: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (confirmation !== "ELIMINAR") {
      return { ok: false, error: "Confirmación inválida." };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado." };
    const userId = user.id;
    const email = user.email ?? null;

    const admin = createAdminClient();

    // Los admins no se autoeliminan por autoservicio (evita perder el único
    // admin por accidente).
    const { data: prof } = await admin
      .from("dj_profile")
      .select("is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    if (prof?.is_admin) {
      return {
        ok: false,
        error:
          "Las cuentas de administrador no se eliminan por autoservicio. Escríbenos a privacidad@dropgigs.com.",
      };
    }

    // 1) Borrar el auth user PRIMERO: es el paso crítico e irreversible. Si
    // falla, no tocamos nada más → la cuenta queda intacta y reintentable
    // (evita dejarla "a medio borrar"). El cascade FK (migración 0001) limpia
    // dj_profile / booker_accounts y todas las tablas owned.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return {
        ok: false,
        error: `No se pudo eliminar la cuenta: ${delErr.message}`,
      };
    }

    // A partir de aquí la cuenta YA no existe. Lo que sigue es limpieza
    // best-effort: aunque algo falle, la supresión principal ya se cumplió.

    // 2) Auditoría. actorUserId=null a propósito: el FK a auth.users rechazaría
    // un insert que apunte al usuario recién borrado; el id borrado queda en
    // target_id.
    await logSecurityEvent({
      action: "account.self_deleted",
      actorUserId: null,
      targetType: "auth.users",
      targetId: userId,
      metadata: { email: maskEmail(email) },
    });

    // 3) Borrar objetos de Storage del usuario (buckets públicos). Barrido de
    // 2 niveles: raíz `${userId}/` y subcarpetas (p. ej. `${userId}/gallery/`).
    for (const bucket of ["avatars", "press-kits"]) {
      try {
        await removeUserStorage(admin, bucket, userId);
      } catch {
        /* best-effort */
      }
    }

    // 4) Purgar huérfanos por email (no cubiertos por el cascade FK):
    // beta_requests (guarda IP) y event_rsvps.
    if (email) {
      try {
        await admin.from("beta_requests").delete().eq("email", email);
        await admin.from("event_rsvps").delete().eq("email", email);
      } catch {
        /* best-effort */
      }
    }

    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

/**
 * Borra todos los objetos de un bucket bajo `${userId}/`, incluyendo un nivel
 * de subcarpetas (Storage.list no es recursivo). Helper interno (no action).
 */
async function removeUserStorage(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  userId: string
): Promise<void> {
  const { data: top } = await admin.storage
    .from(bucket)
    .list(userId, { limit: 1000 });
  const paths: string[] = [];
  for (const entry of top ?? []) {
    // Storage marca las subcarpetas con id === null (no tienen metadata). El
    // tipo FileObject declara id como string, por eso el cast.
    if ((entry as { id: string | null }).id === null) {
      const { data: sub } = await admin.storage
        .from(bucket)
        .list(`${userId}/${entry.name}`, { limit: 1000 });
      for (const f of sub ?? []) {
        paths.push(`${userId}/${entry.name}/${f.name}`);
      }
    } else {
      paths.push(`${userId}/${entry.name}`);
    }
  }
  if (paths.length) await admin.storage.from(bucket).remove(paths);
}
