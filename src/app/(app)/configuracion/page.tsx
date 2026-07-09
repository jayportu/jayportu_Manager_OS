import { getMyProfile } from "@/lib/queries/dj-profile";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { redirect } from "next/navigation";
import Link from "next/link";
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
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Configuración
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Ajustes de la app e integraciones. Tu identidad como DJ ahora vive en{" "}
          <Link href="/perfil" className="text-accent underline underline-offset-2">
            Perfil
          </Link>
          .
        </p>
      </div>

      {/* S19 — Link a gestión de suscripción (oculto para legacy beta users) */}
      {!["active", "expired"].includes(profile?.beta_status ?? "") && (
        <Link
          href="/configuracion/suscripcion"
          className="block mb-8 p-5 border-2 border-border bg-bg-panel hover:bg-cream/40 transition-colors group"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-1">
                — SUSCRIPCIÓN
              </div>
              <div
                className="leading-none"
                style={{
                  fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                  fontSize: "26px",
                }}
              >
                Mi suscripción<span className="text-orange">.</span>
              </div>
              <p className="text-xs text-fg-muted mt-1">
                Estado, próximo cobro, historial y cancelación.
              </p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted group-hover:text-orange transition-colors">
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
        <h2 className="text-lg font-semibold mb-2">Correo</h2>
        <p className="text-sm text-fg-muted mb-4">
          Conecta tu cuenta de Google para enviar correos a tus contactos del
          CRM y sincronizar tu calendario. DROP. no lee tu bandeja. Setup
          gratis con Google Cloud Console.
        </p>
        <GmailSetup
          serverConfigured={gmailConfigured}
          connectedEmail={gmailConnection?.google_email || null}
        />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-2">Notificaciones push</h2>
        <p className="text-sm text-fg-muted mb-4">
          Recibe avisos en este dispositivo cuando tienes follow-ups
          vencidos, cuando crece tu audiencia o como recordatorio
          semanal de snapshot.
        </p>
        <PushSetup />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-2">Contraseña</h2>
        <p className="text-sm text-fg-muted mb-4">
          Cambia tu contraseña cuando quieras. Si entraste con Google, acá
          puedes fijar una contraseña propia para entrar también sin Google.
        </p>
        <ChangePasswordSection />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-2">Respaldo de datos</h2>
        <p className="text-sm text-fg-muted mb-4">
          Descarga todos tus datos en un solo archivo JSON. Recomendado:
          guárdalo cada cierto tiempo en iCloud o disco externo.
        </p>
        <ExportButton />
      </div>
    </div>
  );
}
