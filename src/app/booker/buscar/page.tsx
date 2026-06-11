import Link from "next/link";
import {
  listPublicDjs,
  listPublicGenres,
  listPublicCities,
} from "@/lib/queries/directory";
import { getMyFavoriteDjIds } from "@/lib/queries/booker";
import { BuscarCard } from "./buscar-card";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    genres?: string;
    avail?: string;
    budget?: string;
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

  const [djs, allGenres, allCities, favIds] = await Promise.all([
    listPublicDjs({
      search: sp.q,
      city: sp.city,
      genres: activeGenres.length > 0 ? activeGenres : undefined,
      onlyAvailable: sp.avail === "1",
      budget: budgetNum && budgetNum > 0 ? budgetNum : undefined,
    }),
    listPublicGenres(),
    listPublicCities(),
    getMyFavoriteDjIds(),
  ]);

  const availableCount = djs.filter((d) => d.is_available_now).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="border-2 border-ink bg-white p-6 md:p-7 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — BUSCAR DJS · {djs.length} EN EL DIRECTORIO
        </div>
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
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Filtra por género, ciudad, disponibilidad y presupuesto. Escucha un
          set y guarda al DJ en favoritos sin salir de acá.
        </p>
        {availableCount > 0 && (
          <div
            className="mt-4 inline-flex items-center gap-2 border-2 border-ink bg-orange text-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider"
            title="DJs con disponibilidad abierta. Usa el filtro «Solo disponibles» para verlos."
          >
            ★ {availableCount}{" "}
            {availableCount === 1 ? "disponible" : "disponibles"} ahora
          </div>
        )}
      </div>

      {/* Filtros */}
      <form
        action="/booker/buscar"
        method="get"
        className="border-2 border-ink bg-white p-4 md:p-5 mb-6 space-y-4"
      >
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
          — FILTROS
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_160px_150px_auto] gap-2">
          <input
            type="search"
            name="q"
            placeholder="🔎  Nombre, ciudad, tagline..."
            defaultValue={sp.q ?? ""}
            className="border-2 border-ink bg-white px-3 py-2 font-mono text-[12px] uppercase tracking-[0.04em] placeholder:text-fg-subtle focus:outline-none focus:border-orange"
          />
          <select
            name="city"
            defaultValue={sp.city ?? ""}
            className="border-2 border-ink bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase appearance-none focus:outline-none focus:border-orange"
          >
            <option value="">Ciudad: todas</option>
            {allCities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city.toUpperCase()} ({c.count})
              </option>
            ))}
          </select>
          <select
            name="avail"
            defaultValue={sp.avail ?? ""}
            className="border-2 border-ink bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase appearance-none focus:outline-none focus:border-orange"
          >
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
            className="border-2 border-ink bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase placeholder:text-fg-subtle focus:outline-none focus:border-orange"
          />
          <button
            type="submit"
            className="border-2 border-ink bg-orange text-ink hover:bg-ink hover:text-orange transition-colors px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em]"
          >
            FILTRAR
          </button>
        </div>

        {/* Géneros chips */}
        {allGenres.length > 0 && (
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-muted mb-2">
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
                    className={`inline-flex items-center gap-1.5 border-2 border-ink font-mono text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 transition-colors ${
                      active ? "bg-orange text-ink" : "bg-cream hover:bg-orange"
                    }`}
                  >
                    {g.genre.toUpperCase()}
                    {!active && <span className="text-fg-muted">{g.count}</span>}
                  </Link>
                );
              })}
            </div>
            {activeGenres.length > 0 && (
              <div className="mt-2">
                <Link
                  href={buildHref(sp, { genres: undefined })}
                  className="font-mono text-[9px] uppercase tracking-wider underline text-fg-muted hover:text-ink"
                >
                  Limpiar géneros
                </Link>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Resultados */}
      <div className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
        — {djs.length} {djs.length === 1 ? "RESULTADO" : "RESULTADOS"}
      </div>

      {djs.length === 0 ? (
        <div className="border-2 border-ink bg-white p-10 text-center">
          <p className="text-sm text-fg-muted">
            No hay DJs que coincidan con los filtros. Prueba con menos filtros,
            otra ciudad o un presupuesto más alto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {djs.map((d) => (
            <BuscarCard
              key={d.user_id}
              dj={d}
              filters={{ q: sp.q, city: sp.city, avail: sp.avail, budget: sp.budget }}
              favorited={favIds.has(d.user_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
