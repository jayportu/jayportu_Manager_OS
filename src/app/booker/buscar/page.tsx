import Link from "next/link";
import { SearchX } from "lucide-react";
import {
  listPublicDjs,
  listPublicGenres,
  listPublicCities,
  listLiveDjUserIds,
} from "@/lib/queries/directory";
import { getMyFavoriteDjIds } from "@/lib/queries/booker";
import {
  GlassPanel,
  MonoLabel,
  Badge,
  ClayChip,
  EmptyState,
  FIELD,
  SELECT,
} from "@/components/hos";
import { Button } from "@/components/ui/button";
import { BuscarCard } from "./buscar-card";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    genres?: string;
    avail?: string;
    budget?: string;
    date?: string;
  }>;
}

/** Construye un href a /booker/buscar mezclando params actuales + overrides. */
function buildHref(
  current: Record<string, string | undefined>,
  override: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...override };
  for (const [k, v] of Object.entries(merged)) {
    if (v && v.trim().length > 0) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/booker/buscar?${qs}` : "/booker/buscar";
}

export default async function BookerBuscarPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const activeGenres = (sp.genres ?? "")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .filter((g) => g.length > 0);

  const budgetNum = sp.budget
    ? parseInt(sp.budget.replace(/\D/g, ""), 10) || undefined
    : undefined;

  const [djs, allGenres, allCities, favIds, liveIds] = await Promise.all([
    listPublicDjs({
      search: sp.q,
      city: sp.city,
      genres: activeGenres.length > 0 ? activeGenres : undefined,
      onlyAvailable: sp.avail === "1",
      availableOn: sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined,
      budget: budgetNum && budgetNum > 0 ? budgetNum : undefined,
    }),
    listPublicGenres(),
    listPublicCities(),
    getMyFavoriteDjIds(),
    listLiveDjUserIds(),
  ]);

  const availableCount = djs.filter((d) => d.is_available_now).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Hero */}
      <GlassPanel padded={false} className="mb-6 p-6 md:p-7">
        <MonoLabel>BUSCAR DJS · {djs.length} EN EL DIRECTORIO</MonoLabel>
        <h1
          className="mt-2 leading-none"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "56px",
            letterSpacing: "-0.005em",
          }}
        >
          BUSCAR<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-white/55 mt-2 max-w-xl">
          Filtra por género, ciudad, disponibilidad y presupuesto. Escucha un
          set y guarda al DJ en favoritos sin salir de acá.
        </p>
        {availableCount > 0 && (
          <div
            className="mt-4"
            title="DJs con disponibilidad abierta. Usa el filtro «Solo disponibles» para verlos."
          >
            <Badge tone="up" solid>
              ★ {availableCount}{" "}
              {availableCount === 1 ? "disponible" : "disponibles"} ahora
            </Badge>
          </div>
        )}
      </GlassPanel>

      {/* Filtros */}
      <form
        action="/booker/buscar"
        method="get"
        className="hos-glass rounded-2xl p-4 md:p-5 mb-6 space-y-4"
      >
        <MonoLabel>FILTROS</MonoLabel>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_150px_150px_140px_auto] gap-2">
          <input
            type="search"
            name="q"
            placeholder="🔎  Nombre, ciudad, tagline..."
            defaultValue={sp.q ?? ""}
            className={FIELD}
          />
          <select name="city" defaultValue={sp.city ?? ""} className={SELECT}>
            <option value="">Ciudad: todas</option>
            {allCities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city.toUpperCase()} ({c.count})
              </option>
            ))}
          </select>
          <select name="avail" defaultValue={sp.avail ?? ""} className={SELECT}>
            <option value="">Disponibilidad</option>
            <option value="1">Solo disponibles</option>
          </select>
          <input
            type="number"
            name="budget"
            min={0}
            step={50000}
            placeholder="Presupuesto $"
            defaultValue={sp.budget ?? ""}
            className={FIELD}
          />
          <input
            type="date"
            name="date"
            title="Libre en esta fecha"
            defaultValue={sp.date ?? ""}
            className={FIELD}
          />
          <Button type="submit" variant="clayPrimary" className="w-full md:w-auto">
            FILTRAR
          </Button>
        </div>

        {/* Géneros chips */}
        {allGenres.length > 0 && (
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/50 mb-2">
              Géneros:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allGenres.slice(0, 24).map((g) => {
                const active = activeGenres.includes(g.genre);
                const newGenres = active
                  ? activeGenres.filter((x) => x !== g.genre)
                  : [...activeGenres, g.genre];
                return (
                  <Link
                    key={g.genre}
                    href={buildHref(sp, {
                      genres: newGenres.length > 0 ? newGenres.join(",") : undefined,
                    })}
                  >
                    <ClayChip active={active}>
                      {g.genre.toUpperCase()}
                      {!active && (
                        <span className="ml-1 text-white/45">{g.count}</span>
                      )}
                    </ClayChip>
                  </Link>
                );
              })}
            </div>
            {activeGenres.length > 0 && (
              <div className="mt-2">
                <Link
                  href={buildHref(sp, { genres: undefined })}
                  className="font-mono text-[9px] uppercase tracking-wider underline text-white/50 hover:text-white"
                >
                  Limpiar géneros
                </Link>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Resultados */}
      <MonoLabel className="mb-3 block">
        {djs.length} {djs.length === 1 ? "RESULTADO" : "RESULTADOS"}
        {sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && (
          <span className="text-white/50">
            {" "}
            · LIBRES EL {sp.date.split("-").reverse().join("/")}
          </span>
        )}
      </MonoLabel>

      {djs.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sin resultados"
          sub="No hay DJs que coincidan con los filtros. Prueba con menos filtros, otra ciudad o un presupuesto más alto."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {djs.map((d) => (
            <BuscarCard
              key={d.user_id}
              dj={d}
              filters={{ q: sp.q, city: sp.city, avail: sp.avail, budget: sp.budget, date: sp.date }}
              favorited={favIds.has(d.user_id)}
              isLive={liveIds.has(d.user_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
