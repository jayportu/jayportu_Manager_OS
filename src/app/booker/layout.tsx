import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ensureBookerAccount,
  claimBookingsByEmail,
} from "@/lib/queries/booker";
import { consumeFoundingInviteIfAny } from "@/lib/queries/founding-invites";
import { BookerTopBar } from "./top-bar";

/**
 * Guard en memoria (por instancia del server) para no re-correr los backfills
 * en CADA navegación entre tabs. Las operaciones son idempotentes, así que un
 * reset en cold start solo significa correrlas una vez más — sin riesgo.
 */
const backfilledUsers = new Set<string>();

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

  // Backfills caros (writes/queries service_role): solo la primera vez que este
  // booker pasa por el layout en esta instancia, no en cada navegación.
  if (!backfilledUsers.has(user.id)) {
    // Fase 2 — si hay un invite Founding pendiente (cookie del link o por email),
    // auto-marca is_founding + verifica e invalida el token (single-use).
    await consumeFoundingInviteIfAny({
      userId: user.id,
      userEmail: user.email ?? null,
    });

    // Backfill: linkear bookings viejos hechos con este email
    await claimBookingsByEmail();

    backfilledUsers.add(user.id);
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <BookerTopBar
        fullName={booker.full_name || (user.email ?? "Booker")}
        email={user.email ?? ""}
      />
      <main className="flex-1">{children}</main>
      <footer className="bg-ink text-white border-t-2 border-orange py-3 px-6 text-center">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-fg-subtle">
          DROP<span className="text-orange">.</span> · BOOKER PORTAL · v0.13
        </div>
      </footer>
    </div>
  );
}
