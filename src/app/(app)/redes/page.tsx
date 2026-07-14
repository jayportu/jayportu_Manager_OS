import { listPlatformAccounts } from "@/lib/queries/platform-accounts";
import { PlatformAccountsSection } from "./platform-accounts-section";
import { SectionHero } from "@/components/hos";

/**
 * /redes — "Redes & Cuentas". Conexión de cuentas externas (SoundCloud,
 * YouTube) para el sync automático de métricas de Growth. Movido desde
 * Configuración en la Fase 2 de la reorganización del menú.
 */
export default async function RedesPage() {
  const accounts = await listPlatformAccounts();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <SectionHero
        kicker="Perfil · Redes & Cuentas"
        title="Redes & Cuentas"
        sub="Conecta tus perfiles públicos para que los snapshots de Growth se actualicen solos. SoundCloud usa scraping HTML público — gratis y sin OAuth."
      />
      <PlatformAccountsSection accounts={accounts} />
    </div>
  );
}
