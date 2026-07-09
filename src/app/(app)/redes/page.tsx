import { listPlatformAccounts } from "@/lib/queries/platform-accounts";
import { PlatformAccountsSection } from "./platform-accounts-section";

/**
 * /redes — "Redes & Cuentas". Conexión de cuentas externas (SoundCloud,
 * YouTube) para el sync automático de métricas de Growth. Movido desde
 * Configuración en la Fase 2 de la reorganización del menú.
 */
export default async function RedesPage() {
  const accounts = await listPlatformAccounts();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Redes &amp; Cuentas
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Conecta tus perfiles públicos para que los snapshots de Growth se
          actualicen solos. SoundCloud usa scraping HTML público — gratis y sin
          OAuth.
        </p>
      </div>
      <PlatformAccountsSection accounts={accounts} />
    </div>
  );
}
