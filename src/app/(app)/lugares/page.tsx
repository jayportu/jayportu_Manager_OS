import { listDirectoryVenues } from "@/lib/queries/booker";
import { VenueCard } from "./venue-card";
import { Building2 } from "lucide-react";

/**
 * Fase 3 booker — Directorio de lugares (lado DJ).
 *
 * El DJ explora lugares verificados que activaron "aparecer en directorio"
 * y marca "⭐ me gustaría tocar acá". Vive en (app) → ya gateado a DJs.
 */
export const dynamic = "force-dynamic";

export default async function LugaresPage() {
  const venues = await listDirectoryVenues();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-accent" />
          Lugares
        </h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xl">
          Venues, productoras y festivales verificados en DROP. Marca los que
          te gustaría tocar — el lugar ve tu interés y puede contactarte.
        </p>
      </div>

      {venues.length === 0 ? (
        <Card />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((v) => (
            <VenueCard key={v.user_id} venue={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card() {
  return (
    <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
      <Building2 className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
      <h2 className="text-lg font-semibold mb-1">Aún no hay lugares</h2>
      <p className="text-sm text-fg-muted max-w-md mx-auto">
        Estamos sumando venues, productoras y festivales verificados. Pronto
        vas a poder explorarlos y marcar dónde te gustaría tocar.
      </p>
    </div>
  );
}
