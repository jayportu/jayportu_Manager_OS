import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/booker/favorite-state?dj=<user_id>
 *
 * Devuelve { canFavorite: boolean, favorited: boolean }
 *   - canFavorite: true si el visitante es un booker logueado (no DJ, no anon)
 *   - favorited:   true si ya tiene a este DJ en booker_favorites
 *
 * El cliente <FavoriteButtonClient> usa esto al montar para decidir si
 * mostrarse y en qué estado. Esto permite que /p/[slug] siga cacheado
 * estáticamente (revalidate=60) y el botón es la única parte dinámica.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const djUserId = request.nextUrl.searchParams.get("dj");
  if (!djUserId) {
    return NextResponse.json({ canFavorite: false, favorited: false });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ canFavorite: false, favorited: false });

  // Si es DJ, no puede favoritar
  const { data: dj } = await supabase
    .from("dj_profile")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (dj) return NextResponse.json({ canFavorite: false, favorited: false });

  // Es booker (o user sin tipo todavía) — puede favoritar
  const { data: fav } = await supabase
    .from("booker_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("dj_user_id", djUserId)
    .maybeSingle();

  return NextResponse.json({ canFavorite: true, favorited: !!fav });
}
