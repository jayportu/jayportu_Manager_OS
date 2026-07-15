import { getMyProfile } from "@/lib/queries/dj-profile";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SectionHero, MonoLabel } from "@/components/hos";
import { ExportButton } from "./export-button";
import { GmailSetup } from "./gmail-setup";
import { PushSetup } from "./push-setup";
import { TechRiderSection } from "./tech-rider-section";
import { AutoPostSection } from "./auto-post-section";
import { ChangePasswordSection } from "./change-password-section";

export default async function ConfiguracionPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const gmailConnection = await getMyGmailConnection();
  const gmailConfigured =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <SectionHero kicker="Sistema · Configuración" title="Configuración" />
      <p className="mb-8 text-sm text-white/55">
        Ajustes de la app e integraciones. Tu identidad como DJ ahora vive en{" "}
        <Link
          href="/perfil"
          className="text-orange underline underline-offset-2 hover:no-underline"
        >
          Perfil
        </Link>
        .
      </p>

      {/* S19 — Link a gestión de suscripción (oculto para legacy beta users) */}
      {!["active", "expired"].includes(profile?.beta_status ?? "") && (
        <Link
          href="/configuracion/suscripcion"
          className="group mb-8 block overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <MonoLabel>Suscripción</MonoLabel>
              <div className="mt-1.5 font-display text-2xl leading-none">
                Mi suscripción<span className="text-orange">.</span>
              </div>
              <p className="text-xs text-white/45 mt-1">
                Estado, próximo cobro, historial y cancelación.
              </p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-white/45 group-hover:text-orange transition-colors">
              Ver →
            </span>
          </div>
        </Link>
      )}

      <div id="tech-rider" className="mt-12 pt-8 border-t border-border scroll-mt-24">
        <TechRiderSection
          initialIdeal={profile.tech_rider_ideal}
          initialAlt={profile.tech_rider_alt}
          initialHospitality={profile.hospitality}
          artistName={profile.artist_name}
        />
      </div>

      <div id="auto-post" className="mt-12 pt-8 border-t border-border scroll-mt-24">
        <AutoPostSection profile={profile} />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-4 space-y-2">
          <MonoLabel>Correo</MonoLabel>
          <p className="text-sm text-white/55">
            Conecta tu cuenta de Google para enviar correos a tus contactos del
            CRM y sincronizar tu calendario. DROP. no lee tu bandeja. Setup
            gratis con Google Cloud Console.
          </p>
        </div>
        <GmailSetup
          serverConfigured={gmailConfigured}
          connectedEmail={gmailConnection?.google_email || null}
        />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-4 space-y-2">
          <MonoLabel>Notificaciones push</MonoLabel>
          <p className="text-sm text-white/55">
            Recibe avisos en este dispositivo cuando tienes follow-ups
            vencidos, cuando crece tu audiencia o como recordatorio
            semanal de snapshot.
          </p>
        </div>
        <PushSetup />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-4 space-y-2">
          <MonoLabel>Contraseña</MonoLabel>
          <p className="text-sm text-white/55">
            Cambia tu contraseña cuando quieras. Si entraste con Google, acá
            puedes fijar una contraseña propia para entrar también sin Google.
          </p>
        </div>
        <ChangePasswordSection />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-4 space-y-2">
          <MonoLabel>Respaldo de datos</MonoLabel>
          <p className="text-sm text-white/55">
            Descarga todos tus datos en un solo archivo JSON. Recomendado:
            guárdalo cada cierto tiempo en iCloud o disco externo.
          </p>
        </div>
        <ExportButton />
      </div>
    </div>
  );
}
