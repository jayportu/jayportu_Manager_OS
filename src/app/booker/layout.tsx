import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ensureBookerAccount,
  claimBookingsByEmail,
} from "@/lib/queries/booker";
import { BookerTopBar } from "./top-bar";

/**
 * Layout para todo /booker/*. Server component.
 *
 * Garantías:
 *   - User logueado (sino /login).
 *   - User NO es DJ (sino /dashboard).
 *   - booker_account existe (lazy-create desde user_metadata si falta).
 *   - Bookings huérfanos hechos antes del signup quedan linkeados por email.
 */
export default async function BookerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/booker/requests");

  // Si es DJ, no puede estar acá
  const { data: dj } = await supabase
    .from("dj_profile")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (dj) redirect("/dashboard");

  // Asegurar booker_account
  const booker = await ensureBookerAccount();
  if (!booker) {
    // Edge: pudimos haber fallado el create. Vamos a la landing.
    redirect("/?error=booker_init");
  }

  // Backfill: linkear bookings viejos hechos con este email
  await claimBookingsByEmail();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <BookerTopBar
        fullName={booker.full_name || (user.email ?? "Booker")}
        email={user.email ?? ""}
      />
      <main className="flex-1">{children}</main>
      <footer className="bg-ink text-cream border-t-2 border-orange py-3 px-6 text-center">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-fg-subtle">
          DROP<span className="text-orange">.</span> · BOOKER PORTAL · v0.13
        </div>
      </footer>
    </div>
  );
}
