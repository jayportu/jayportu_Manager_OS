import { getMyProfile } from "@/lib/queries/dj-profile";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { listPlatformAccounts } from "@/lib/queries/platform-accounts";
import { listMyRiderItems } from "@/lib/queries/tech-rider";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExportButton } from "./export-button";
import { OllamaSetup } from "./ollama-setup";
import { GmailSetup } from "./gmail-setup";
import { PlatformAccountsSection } from "./platform-accounts-section";
import { PushSetup } from "./push-setup";
import { PressKitSection } from "./press-kit-section";
import { AvailabilitySection } from "./availability-section";
import { TechRiderSection } from "./tech-rider-section";
import { AutoPostSection } from "./auto-post-section";

export default async function ConfiguracionPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const gmailConnection = await getMyGmailConnection();
  const gmailConfigured =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  const platformAccounts = await listPlatformAccounts();
  const riderItems = await listMyRiderItems();

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

      <div>
        <AvailabilitySection profile={profile} />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <TechRiderSection initialItems={riderItems} />
      </div>

      <div id="auto-post" className="mt-12 pt-8 border-t border-border scroll-mt-24">
        <AutoPostSection profile={profile} />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-2">Press kit</h2>
        <p className="text-sm text-fg-muted mb-4">
          Elige si tu página pública se arma automáticamente con tus datos
          o si quieres mostrar un PDF propio que ya tengas diseñado.
        </p>
        <PressKitSection
          mode={profile.press_kit_mode}
          pdfUrl={profile.press_kit_pdf_url}
          pdfFilename={profile.press_kit_pdf_filename}
          pdfSizeBytes={profile.press_kit_pdf_size_bytes}
          publicSlug={profile.public_slug}
        />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-2">Cuentas externas</h2>
        <p className="text-sm text-fg-muted mb-4">
          Conecta tus perfiles públicos para que los snapshots de Growth se
          actualicen solos. SoundCloud usa scraping HTML público — 100% gratis y
          sin OAuth.
        </p>
        <PlatformAccountsSection accounts={platformAccounts} />
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-2">Gmail</h2>
        <p className="text-sm text-fg-muted mb-4">
          Conecta tu cuenta de Gmail para leer hilos, asociarlos al CRM y
          crear borradores. Setup gratis con Google Cloud Console.
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
        <h2 className="text-lg font-semibold mb-2">IA local (Ollama)</h2>
        <p className="text-sm text-fg-muted mb-4">
          Corre IA gratis en tu Mac sin pagar APIs. Estado en vivo, instrucciones
          de setup y check de modelo descargado.
        </p>
        <OllamaSetup />
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
