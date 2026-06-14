"use server";

/**
 * Fase 3 booker — "⭐ me gustaría tocar acá".
 * Fase 4a booker — pitch DJ→Lugar (cuesta 🪙1 token).
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getPitchTokenBalance } from "@/lib/queries/booker";
import { assertBetaActive } from "@/lib/queries/beta-guard";

type Result =
  | { ok: true; interested: boolean }
  | { ok: false; error: string };

/**
 * Guard de escritura → devuelve el mensaje de error en vez de lanzar, para
 * encajar con el tipo Result de estas actions. Bloquea cuentas
 * suspendidas/baneadas y beta expirada.
 */
async function guardOrError(): Promise<string | null> {
  try {
    await assertBetaActive();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "No autorizado.";
  }
}

export async function toggleVenueInterestAction(
  bookerUserId: string
): Promise<Result> {
  const blocked = await guardOrError();
  if (blocked) return { ok: false, error: blocked };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  if (!bookerUserId) return { ok: false, error: "Lugar inválido." };
  if (bookerUserId === user.id)
    return { ok: false, error: "No puedes marcarte a ti mismo." };

  const { data: existing } = await supabase
    .from("venue_interest")
    .select("id")
    .eq("dj_user_id", user.id)
    .eq("booker_user_id", bookerUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("venue_interest")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/lugares");
    return { ok: true, interested: false };
  }

  const { error } = await supabase
    .from("venue_interest")
    .insert({ dj_user_id: user.id, booker_user_id: bookerUserId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/lugares");
  return { ok: true, interested: true };
}

type PitchResult = { ok: true } | { ok: false; error: string };

/**
 * Fase 4a — El DJ manda un pitch a un lugar que acepta pitches. Consume
 * 🪙1 token (validado contra el balance computado). El lugar debe tener
 * accepts_pitches=true. Un pitch por (dj, lugar) — unique en DB.
 */
export async function sendPitchAction(
  bookerUserId: string,
  message: string,
  availability: string
): Promise<PitchResult> {
  const blocked = await guardOrError();
  if (blocked) return { ok: false, error: blocked };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  if (!bookerUserId) return { ok: false, error: "Lugar inválido." };

  const msg = message.trim().slice(0, 600);
  if (msg.length < 10)
    return { ok: false, error: "Escribe un mensaje (mín. 10 caracteres)." };

  // El lugar debe aceptar pitches (lectura service_role: RLS es select-own)
  const admin = createAdminClient();
  const { data: venue } = await admin
    .from("booker_accounts")
    .select("accepts_pitches, verified_at, in_directory")
    .eq("user_id", bookerUserId)
    .maybeSingle();
  if (!venue || !venue.accepts_pitches || !venue.verified_at || !venue.in_directory) {
    return { ok: false, error: "Este lugar no está recibiendo pitches." };
  }

  // ¿Ya pitcheó a este lugar?
  const { data: existing } = await supabase
    .from("venue_pitches")
    .select("id")
    .eq("dj_user_id", user.id)
    .eq("booker_user_id", bookerUserId)
    .maybeSingle();
  if (existing) return { ok: false, error: "Ya le mandaste un pitch a este lugar." };

  // Token disponible
  const balance = await getPitchTokenBalance();
  if (balance.available <= 0) {
    return {
      ok: false,
      error: "Te quedaste sin tokens de pitch este mes. Renuevan el 1.",
    };
  }

  const { error } = await supabase.from("venue_pitches").insert({
    dj_user_id: user.id,
    booker_user_id: bookerUserId,
    message: msg,
    availability: availability.trim().slice(0, 200),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/lugares");
  return { ok: true };
}
