import { redirect } from "next/navigation";
import { getMyBookerAccount } from "@/lib/queries/booker";
import { GlassPanel, MonoLabel, Badge } from "@/components/hos";
import { BookerProfileForm } from "./booker-profile-form";
import { BookerVerificationRequest } from "./verification-request";

/**
 * Fase 1 booker — Perfil editable del booker.
 *
 * El layout /booker ya garantiza sesión + que NO es DJ + que existe el
 * booker_account (lazy-create). Acá solo lo leemos y renderizamos el form.
 */
export const dynamic = "force-dynamic";

export default async function BookerPerfilPage() {
  const booker = await getMyBookerAccount();
  if (!booker) redirect("/booker/requests");

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* Hero */}
      <GlassPanel className="mb-6">
        <MonoLabel>MI PERFIL</MonoLabel>
        <div className="mt-2 flex flex-wrap items-end gap-3 justify-between">
          <h1
            className="leading-none"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "52px",
              letterSpacing: "-0.005em",
            }}
          >
            PERFIL<span className="text-orange">.</span>
          </h1>
          {booker.verified_at ? (
            <Badge tone="up">✓ Verificado por DROP.</Badge>
          ) : (
            <Badge tone="neutral">Sin verificar</Badge>
          )}
        </div>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Tus datos como booker. Lo que marques como visible aparece para los
          DJs cuando los contactes. El email es tu acceso y no se cambia acá.
        </p>
      </GlassPanel>

      <BookerVerificationRequest
        verified={!!booker.verified_at}
        requested={!!booker.verification_requested_at}
      />

      <BookerProfileForm
        initial={{
          full_name: booker.full_name || "",
          email: booker.email || "",
          booker_type: booker.booker_type || "otro",
          city: booker.city || "",
          country: booker.country || "",
          whatsapp: booker.whatsapp || "",
          website_url: booker.website_url || "",
          instagram_url: booker.instagram_url || "",
          bio: booker.bio || "",
          in_directory: !!booker.in_directory,
          accepts_pitches: !!booker.accepts_pitches,
          newsletter_optin: !!booker.newsletter_optin,
        }}
      />
    </div>
  );
}
