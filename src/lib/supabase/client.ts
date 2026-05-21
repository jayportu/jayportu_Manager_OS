/**
 * Cliente Supabase para uso en Client Components (browser).
 * Usa SOLO la publishable/anon key — segura para frontend.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
