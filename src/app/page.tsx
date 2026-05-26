import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Raíz pública:
 *   - Si hay sesión activa → redirige a /dashboard
 *   - Si NO hay sesión → redirige a /beta (landing pública para DJs nuevos)
 *
 * Antes redirigía siempre a /dashboard y el middleware tiraba a /login
 * a los visitantes anónimos, lo que perdía DJs potenciales que llegaban
 * al dominio raíz sin saber qué era la app.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/beta");
  }
}
