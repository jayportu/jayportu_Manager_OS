import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { isResendConfigured } from "@/lib/email/resend";
import { SupportForm } from "./support-form";
import { SectionHero, Alert } from "@/components/hos";

/**
 * Fase 7 — Soporte. Reemplaza el placeholder ComingSoon.
 * Formulario que manda la consulta por email (sin base de datos).
 */
export const dynamic = "force-dynamic";

export default async function SoportePage() {
  const { user } = await getCachedUser();
  if (!user) redirect("/login");
  const profile = await getMyProfile();

  const configured = isResendConfigured();

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <SectionHero
        kicker="Sistema · Soporte"
        title="Soporte"
        sub="¿Dudas o problemas? Escríbenos y te respondemos a tu correo."
      />

      {configured ? (
        <SupportForm
          defaultNombre={profile?.artist_name ?? ""}
          defaultEmail={user.email ?? ""}
        />
      ) : (
        <Alert tone="info">
          Escríbenos directamente a{" "}
          <a href="mailto:hola@dropgigs.com" className="text-accent underline">
            hola@dropgigs.com
          </a>
          .
        </Alert>
      )}
    </div>
  );
}
