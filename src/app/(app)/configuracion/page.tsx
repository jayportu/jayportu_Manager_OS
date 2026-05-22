import { getMyProfile } from "@/lib/queries/dj-profile";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { ExportButton } from "./export-button";
import { OllamaSetup } from "./ollama-setup";

export default async function ConfiguracionPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Configuración
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Tu identidad como DJ. Esta info se usa en el dashboard, el press kit
          público y las plantillas.
        </p>
      </div>

      <ProfileForm initialProfile={profile} />

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
