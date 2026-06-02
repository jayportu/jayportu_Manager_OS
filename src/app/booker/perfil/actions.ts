"use server";

/**
 * Fase 1 booker — Actualización del perfil del booker.
 *
 * Usa la sesión del user (RLS: booker_accounts_update_own permite editar
 * la propia fila). El whitelist explícito de campos asegura que NUNCA se
 * toquen verified_at/verified_by desde acá (además el trigger DB
 * protect_booker_verification los blinda contra cualquier rol != service).
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { BookerType } from "@/types/database";
import { BOOKER_TYPES } from "@/types/database";

export interface BookerProfileInput {
  full_name: string;
  booker_type: string;
  city: string;
  country: string;
  whatsapp: string;
  website_url: string;
  instagram_url: string;
  bio: string;
  in_directory: boolean;
  accepts_pitches: boolean;
  newsletter_optin: boolean;
}

type Result = { ok: true } | { ok: false; error: string };

const VALID_TYPES = BOOKER_TYPES.map((t) => t.value) as readonly string[];

export async function updateBookerProfileAction(
  input: BookerProfileInput
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Vuelve a entrar." };

  const fullName = input.full_name.trim();
  if (!fullName) return { ok: false, error: "El nombre es obligatorio." };

  const bookerType: BookerType = (VALID_TYPES.includes(input.booker_type)
    ? input.booker_type
    : "otro") as BookerType;

  // Whitelist explícito — verified_at/verified_by NO se incluyen jamás.
  const { error } = await supabase
    .from("booker_accounts")
    .update({
      full_name: fullName.slice(0, 80),
      booker_type: bookerType,
      city: input.city.trim().slice(0, 60),
      country: input.country.trim().slice(0, 60),
      whatsapp: input.whatsapp.trim().slice(0, 30),
      website_url: input.website_url.trim().slice(0, 200),
      instagram_url: input.instagram_url.trim().slice(0, 200),
      bio: input.bio.trim().slice(0, 600),
      in_directory: !!input.in_directory,
      accepts_pitches: !!input.accepts_pitches,
      newsletter_optin: !!input.newsletter_optin,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/booker/perfil");
  return { ok: true };
}
