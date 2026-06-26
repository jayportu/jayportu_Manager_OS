import { listDirectoryVenues, getPitchTokenBalance } from "@/lib/queries/booker";
import { VenueCard } from "./venue-card";
import { Building2, Coins } from "lucide-react";

/**
 * Fase 3 booker — Directorio de lugares (lado DJ).
 * Fase 4a booker — pitch con tokens (10/mes).
 *
 * El DJ explora lugares verificados, marca "⭐ me gustaría tocar acá" y, en
 * los que aceptan pitches, manda un pitch (🪙1 token). Vive en (app) → ya
 * gateado a DJs.
 */
export const dynamic = "force-dynamic";

export default async function LugaresPage() {
  const [venues, tokens] = await Promise.all([
    listDirectoryVenues(),
    getPitchTokenBalance(),
  ]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-accent" />
          Lugares
        </h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xl">
          Venues, productoras y festivales verificados en DROP. Marca los que
          te gustaría tocar, o manda un pitch a los que lo aceptan.
        </p>
      </div>

      {/* Barra de tokens de pitch */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-2 border-border bg-ink text-white px-4 py-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="w-4 h-4 text-orange" />
          <span className="font-display text-lg text-orange tabular-nums">
            {tokens.available}/{tokens.allowance}
          </span>
          <span>tokens de pitch este mes</span>
          <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider hidden sm:inline">
            · renuevan el 1 · cada pitch = 🪙1
          </span>
        </div>
      </div>

      {venues.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((v) => (
            <VenueCard
              key={v.user_id}
              venue={v}
              tokensAvailable={tokens.available}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
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
