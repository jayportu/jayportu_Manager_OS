import { Suspense } from "react";
import { redirect } from "next/navigation";
import { listDirectoryVenues, getPitchTokenBalance } from "@/lib/queries/booker";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { getSuggestedVenues } from "@/lib/queries/suggested-venues";
import { BOOKER_TYPES } from "@/types/database";
import { VenueCard } from "./venue-card";
import { SuggestedVenueCard } from "./suggested-venue-card";
import { Building2, Coins, Compass, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHero, GlassPanel, MonoLabel, EmptyState, SELECT } from "@/components/hos";

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
      <SectionHero
        kicker="Negocio · Lugares"
        title="Lugares"
        sub="Venues verificados en DROP (mándales un pitch) y sugerencias de tu ciudad para prospectar y sumar a tu CRM."
        actions={
          <span className="hos-clay inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/85">
            <Coins className="w-3.5 h-3.5 text-[rgb(var(--drop-orange))]" aria-hidden />
            <span className="tabular-nums text-[rgb(var(--drop-orange))]">
              {tokens.available}/{tokens.allowance}
            </span>
            tokens de pitch
          </span>
        }
      />

      {/* Filtros (GET form, sin JS): ciudad + tipo */}
      <GlassPanel className="mb-8">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <label
              htmlFor="filter-city"
              className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-white/50"
            >
              Ciudad
            </label>
            <select
              id="filter-city"
              name="city"
              defaultValue={suggestCity}
              className={SELECT}
            >
              {cityOptions.map((c) => (
                <option key={c} value={c} className="bg-bg-panel">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label
              htmlFor="filter-type"
              className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-white/50"
            >
              Tipo (verificados)
            </label>
            <select
              id="filter-type"
              name="type"
              defaultValue={sp.type ?? ""}
              className={SELECT}
            >
              <option value="" className="bg-bg-panel">
                Todos
              </option>
              {BOOKER_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-bg-panel">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="clay" size="sm">
            Filtrar
          </Button>
        </form>
      </GlassPanel>

      {/* ── Sección: Verificados ── */}
      <div className="mb-3">
        <MonoLabel>Verificados en DROP</MonoLabel>
      </div>
      {venues.length === 0 ? (
        <div className="mb-10">
          <EmptyState
            icon={Building2}
            title="Sin verificados"
            sub={`No hay venues verificados${
              sp.city || sp.type ? " con esos filtros" : " todavía"
            }. Prueba con los sugeridos de abajo.`}
          />
        </div>
      ) : (
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <VenueCard key={v.user_id} venue={v} tokensAvailable={tokens.available} />
          ))}
        </div>
      )}

      {/* ── Sección: Sugeridos (OSM) — streaming ── */}
      <div className="mb-2">
        <MonoLabel>Sugeridos en {suggestCity}</MonoLabel>
      </div>
      <p className="mb-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
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
      <EmptyState
        icon={Compass}
        title="No pudimos cargar sugerencias"
        sub={suggested.error}
      />
    );
  }
  if (suggested.venues.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title={`Sin sugerencias para ${city}`}
        sub="Prueba con otra ciudad en el filtro."
      />
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suggested.venues.map((v) => (
          <SuggestedVenueCard key={v.sourceId} venue={v} />
        ))}
      </div>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-white/40">
        {suggested.attribution}
      </p>
    </>
  );
}

/** Placeholder mientras Overpass/Nominatim responden. */
function SuggestedSkeleton({ city }: { city: string }) {
  return (
    <div>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-white/40">
        Buscando venues en {city}…
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
    </div>
  );
}
