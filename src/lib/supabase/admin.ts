/**
 * Cliente Supabase con SERVICE_ROLE — bypasea RLS.
 * Solo usar en server (route handlers, server actions) para casos
 * específicos donde necesitamos escribir sin sesión de usuario:
 *
 * - Insertar eventos de tracking desde la página pública
 * - Recibir formularios de booking de visitantes anónimos
 *
 * NUNCA importar desde Client Components.
 */
import "server-only";
import { createClient as createSbClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key || key.startsWith("sb_secret_REEMPLAZAR")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada. Setea en .env.local y Vercel."
    );
  }
  return createSbClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
