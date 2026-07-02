import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DjProfile } from "@/types/database";

export type VerifyDecision = "verified" | "needs_review" | "not_eligible";
export type VerifyCheckKey = "profile" | "presskit" | "socials" | "sets";

export const MISSING_LABELS: Record<VerifyCheckKey, string> = {
  profile: "Perfil completo (avatar, bio ≥ 40, ≥ 1 género)",
  presskit: "Press kit vivo",
  socials: "Instagram",
  sets: "Al menos un set (SoundCloud o mix destacado)",
};

/** Subconjunto de dj_profile que la evaluación necesita. */
type EvaluableProfile = Pick<
  DjProfile,
  | "avatar_url"
  | "bio_short"
  | "genres"
  | "press_kit_mode"
  | "press_kit_pdf_url"
  | "public_slug"
  | "onboarding_completed_at"
  | "instagram_url"
  | "soundcloud_url"
  | "featured_sets"
>;

/** Los 4 chequeos. Función pura → fácil de razonar y de verificar a mano. */
export function evaluateDjVerification(p: EvaluableProfile): {
  score: number;
  checks: Record<VerifyCheckKey, boolean>;
  missing: VerifyCheckKey[];
} {
  const profile =
    !!p.avatar_url?.trim() &&
    (p.bio_short?.trim().length ?? 0) >= 40 &&
    (p.genres?.length ?? 0) >= 1;

  const presskit =
    p.press_kit_mode === "pdf"
      ? !!p.press_kit_pdf_url?.trim()
      : !!p.public_slug?.trim() && !!p.onboarding_completed_at;

  const socials = !!p.instagram_url?.trim();

  const sets =
    !!p.soundcloud_url?.trim() || (p.featured_sets?.length ?? 0) >= 1;

  const checks = { profile, presskit, socials, sets };
  const missing = (Object.keys(checks) as VerifyCheckKey[]).filter(
    (k) => !checks[k]
  );
  const score = 4 - missing.length;
  return { score, checks, missing };
}

/**
 * Lee el perfil por service_role, evalúa y —si 4/4— verifica.
 * Idempotente: si ya está verificado (verified_at != null) no reevalúa.
 * verified_by = null marca la verificación automática (vs manual).
 */
export async function evaluateAndVerify(userId: string): Promise<{
  decision: VerifyDecision;
  score: number;
  missing: VerifyCheckKey[];
  artist_name: string | null;
}> {
  const admin = createAdminClient();
  const { data: prof, error } = await admin
    .from("dj_profile")
    .select(
      "artist_name, verified_at, verifications, avatar_url, bio_short, genres, press_kit_mode, press_kit_pdf_url, public_slug, onboarding_completed_at, instagram_url, soundcloud_url, featured_sets"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!prof) return { decision: "not_eligible", score: 0, missing: [], artist_name: null };

  const artist_name = (prof.artist_name as string) ?? null;

  // Ya verificado → no-op.
  if (prof.verified_at) {
    return { decision: "verified", score: 4, missing: [], artist_name };
  }

  const { score, missing } = evaluateDjVerification(prof as EvaluableProfile);

  if (score < 3) return { decision: "not_eligible", score, missing, artist_name };
  if (score === 3) return { decision: "needs_review", score, missing, artist_name };

  // score === 4 → verificar. Union con chips existentes (preserva 'identity').
  const current: string[] = (prof.verifications as string[] | null) ?? [];
  const nextVerifications = Array.from(new Set([...current, "socials", "sets"]));

  const { error: updErr } = await admin
    .from("dj_profile")
    .update({
      verifications: nextVerifications,
      verified_at: new Date().toISOString(),
      verified_by: null,
    })
    .eq("user_id", userId);

  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin");
  revalidatePath("/dj");
  revalidatePath("/p/[slug]", "page");
  revalidateTag("public-djs");

  return { decision: "verified", score: 4, missing: [], artist_name };
}
