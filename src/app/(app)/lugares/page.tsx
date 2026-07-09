import { Suspense } from "react";
import { redirect } from "next/navigation";
import { listDirectoryVenues, getPitchTokenBalance } from "@/lib/queries/booker";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { getSuggestedVenues } from "@/lib/queries/suggested-venues";
import { BOOKER_TYPES } from "@/types/database";
import { VenueCard } from "./venue-card";
import { SuggestedVenueCard } from "./suggested-venue-card";
import { Building2, Coins, Compass, MapPin } from "lucide-react";

/**
 * Fase 3 — Lugares HÍBRIDO (lado DJ):
 *  - Verificados: bookers/venues verificados en DROP (pitcheable con tokens),
 *    con filtros de ciudad/tipo.
 *  - Sugeridos: venues de electrónica de la ciudad, traídos de OpenStreetMap
 *    (sin verificar, para prospectar y agregar al CRM). Se renderiza dentro de
 *    <Suspense> para que la llamada externa (lenta) NO bloquee el resto de la
 *    página — Verificados aparece al instante y Sugeridos entra por streaming.
 */
export const dynamic = "force-dynamic";

const QUICK_CITIES = [
  "Santiago",
  "Valparaíso",
  "Ciudad de México",
  "Buenos Aires",
  "Bogotá",
  "Lima",
  "Medellín",
  "Montevideo",
];

export default async function LugaresPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  // Ciudad para Sugeridos: la elegida, o la del perfil, o Santiago.
  const suggestCity = (sp.city || profile.city || "Santiago").trim();
  const country = profile.country || undefined;

  // Solo lo rápido (DB) bloquea el render. Sugeridos (OSM) va en <Suspense>.
  const [venues, tokens] = await Promise.all([
    // Verificados: solo filtra por ciudad si el usuario la eligió explícitamente
    // (así el default no vacía la sección cuando no hay verificados en su ciudad).
    listDirectoryVenues({ city: sp.city, type: sp.type }),
    getPitchTokenBalance(),
  ]);

  const cityOptions = Array.from(
    new Set([profile.city, ...QUICK_CITIES].filter(Boolean) as string[])
  );

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-accent" />
          Lugares
        </h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xl">
          Venues verificados en DROP (mándales un pitch) y sugerencias de tu
          ciudad para prospectar y sumar a tu CRM.
        </p>
      </div>

      {/* Barra de tokens de pitch */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-2 border-border bg-ink text-white px-4 py-3 mb-5">
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

      {/* Filtros (GET form, sin JS): ciudad + tipo */}
      <form method="get" className="flex flex-wrap items-end gap-3 mb-8">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
            Ciudad
          </span>
          <select
            name="city"
            defaultValue={suggestCity}
            className="border-2 border-border bg-bg-panel px-2.5 py-2 text-sm outline-none focus:border-accent"
          >
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
            Tipo (verificados)
          </span>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="border-2 border-border bg-bg-panel px-2.5 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Todos</option>
            {BOOKER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="px-4 py-2 border-2 border-border bg-accent text-white font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-accent/90"
        >
          Filtrar
        </button>
      </form>

      {/* ── Sección: Verificados ── */}
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Verificados en DROP
        </h2>
      </div>
      {venues.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-10">
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            No hay venues verificados
            {sp.city || sp.type ? " con esos filtros" : " todavía"}. Prueba con
            los sugeridos de abajo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {venues.map((v) => (
            <VenueCard key={v.user_id} venue={v} tokensAvailable={tokens.available} />
          ))}
        </div>
      )}

      {/* ── Sección: Sugeridos (OSM) — streaming ── */}
      <div className="flex items-center gap-2 mb-1">
        <Compass className="w-4 h-4 text-orange" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Sugeridos en {suggestCity}
        </h2>
      </div>
      <p className="text-xs text-fg-muted mb-3 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        Sin verificar — traídos de OpenStreetMap. Verifica los datos antes de
        contactar.
      </p>

      <Suspense key={suggestCity} fallback={<SuggestedSkeleton city={suggestCity} />}>
        <SuggestedSection city={suggestCity} country={country} />
      </Suspense>
    </div>
  );
}

/** Sección de sugeridos: hace la llamada externa (lenta) aislada bajo Suspense. */
async function SuggestedSection({
  city,
  country,
}: {
  city: string;
  country?: string;
}) {
  const suggested = await getSuggestedVenues(city, country);

  if (suggested.error) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-sm text-fg-muted">{suggested.error}</p>
      </div>
    );
  }
  if (suggested.venues.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-sm text-fg-muted">
          No encontramos sugerencias para {city}. Prueba con otra ciudad en el
          filtro.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggested.venues.map((v) => (
          <SuggestedVenueCard key={v.sourceId} venue={v} />
        ))}
      </div>
      <p className="mt-6 font-mono text-[10px] text-fg-subtle uppercase tracking-wider">
        {suggested.attribution}
      </p>
    </>
  );
}

/** Placeholder mientras Overpass/Nominatim responden. */
function SuggestedSkeleton({ city }: { city: string }) {
  return (
    <div>
      <p className="text-sm text-fg-muted mb-4">
        Buscando venues en {city}…
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-2 border-border rounded-lg h-32 animate-pulse bg-bg-subtle"
          />
        ))}
      </div>
    </div>
  );
}
