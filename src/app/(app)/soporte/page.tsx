import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { isResendConfigured } from "@/lib/email/resend";
import { SupportForm } from "./support-form";
import { LifeBuoy } from "lucide-react";

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
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-accent" />
          Soporte
        </h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xl">
          ¿Dudas o problemas? Escríbenos y te respondemos a tu correo.
        </p>
      </div>

      {configured ? (
        <SupportForm
          defaultNombre={profile?.artist_name ?? ""}
          defaultEmail={user.email ?? ""}
        />
      ) : (
        <p className="text-sm text-fg-muted border-2 border-dashed border-border p-6">
          Escríbenos directamente a{" "}
          <a href="mailto:hola@dropgigs.com" className="text-accent underline">
            hola@dropgigs.com
          </a>
          .
        </p>
      )}
    </div>
  );
}
