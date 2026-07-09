/**
 * Cliente Supabase para Server Components, Route Handlers y Server Actions.
 * Lee cookies de la sesión para Server-Side Rendering.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components no pueden setear cookies — el middleware lo hace.
          }
        },
      },
    }
  );
}

/**
 * Usuario autenticado del request actual, memoizado por-request con React
 * `cache()`. Antes cada helper (el layout + cada query helper) creaba su propio
 * cliente y llamaba `auth.getUser()` por separado → 2–5 round-trips a Supabase
 * Auth por navegación. Con esto comparten UNO solo dentro del mismo request.
 * Devuelve también el cliente para reutilizarlo. No tira: cada caller decide
 * qué hacer si `user` es null (patrón getUserOrThrow lo convierte en throw).
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
