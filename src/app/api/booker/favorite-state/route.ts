import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/booker/favorite-state?dj=<user_id>
 *
 * Devuelve { canFavorite, favorited, notifyEmail }:
 *   - canFavorite: true si el visitante es un booker logueado (no DJ, no anon)
 *   - favorited:   true si ya tiene a este DJ en booker_favorites
 *   - notifyEmail: true si tiene avisos por email activos (RA-3)
 *
 * El cliente <FavoriteButtonClient> + <FollowNotifyToggle> usan esto al
 * montar para decidir si mostrarse y en qué estado. Permite que
 * /p/[slug] siga cacheado estáticamente (revalidate=60).
 */
export const dynamic = "force-dynamic";

interface State {
  canFavorite: boolean;
  favorited: boolean;
  notifyEmail: boolean;
}

const EMPTY: State = { canFavorite: false, favorited: false, notifyEmail: false };

export async function GET(request: NextRequest) {
  const djUserId = request.nextUrl.searchParams.get("dj");
  if (!djUserId) return NextResponse.json(EMPTY);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(EMPTY);

  // Si es DJ, no puede favoritar / seguir
  const { data: dj } = await supabase
    .from("dj_profile")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (dj) return NextResponse.json(EMPTY);

  // Es booker — buscar row para conocer favorited + notify_email
  const { data: fav } = await supabase
    .from("booker_favorites")
    .select("id, notify_email")
    .eq("user_id", user.id)
    .eq("dj_user_id", djUserId)
    .maybeSingle();

  const favorited = !!fav;
  const notifyEmail = !!(fav as { notify_email?: boolean } | null)?.notify_email;

  return NextResponse.json({
    canFavorite: true,
    favorited,
    notifyEmail,
  } satisfies State);
}
