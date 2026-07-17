import Link from "next/link";
import {
  getPublicDjsBase,
  listPublicGenres,
  listPublicCities,
} from "@/lib/queries/directory";
import { rankDjsForGig, type GigNeed } from "@/lib/match/score";
import { parseFreeText, type ParsedQuery } from "@/lib/match/parse-query";
import { getMyBookerAccount, getMyFavoriteDjIds } from "@/lib/queries/booker";
import {
  GlassPanel,
  MonoLabel,
  Badge,
  ClayChip,
  Alert,
  FIELD,
  SELECT,
} from "@/components/hos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchCard } from "./match-card";

export const dynamic = "force-dynamic";

interface PageProps {
  // Next puede entregar string[] si un param se repite (?genres=a&genres=b);
  // normalizamos abajo para no crashear con .split/.trim.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const EVENT_TYPES = [
  "Club",
  "Festival",
  "Evento privado",
  "Bar / Resto",
  "Corporativo",
  "Matrimonio",
  "Otro",
];

/** Construye un href a /booker/match mezclando params actuales + overrides. */
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
  return qs ? `/booker/match?${qs}` : "/booker/match";
}

export default async function BookerMatchPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  // Si un param se repite, Next entrega string[] → tomamos el primero. Evita
  // el crash de `.split is not a function` con URLs manipuladas.
  const one = (x: string | string[] | undefined): string | undefined =>
    (Array.isArray(x) ? x[0] : x) ?? undefined;
  const sp = {
    type: one(raw.type),
    city: one(raw.city),
    date: one(raw.date),
    budget: one(raw.budget),
    genres: one(raw.genres),
    q: one(raw.q),
  };

  const activeGenres = (sp.genres ?? "")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .filter((g) => g.length > 0);

  const budgetNum = sp.budget
    ? parseInt(sp.budget.replace(/\D/g, ""), 10) || undefined
    : undefined;

  const [allGenres, allCities, booker, favIds] = await Promise.all([
    listPublicGenres(),
    listPublicCities(),
    getMyBookerAccount(),
    getMyFavoriteDjIds(),
  ]);
  const isFounding = !!booker?.is_founding;

  // v2 — texto libre solo se procesa para Founding (gating server-side, no solo UI).
  const freeText = isFounding ? (sp.q ?? "").trim() : "";
  const parsed: ParsedQuery | null = freeText
    ? parseFreeText(
        freeText,
        allGenres.map((g) => g.genre)
      )
    : null;
  // M4: el tipo de evento (select, para TODOS) también aporta géneros, vía el
  // mismo diccionario de vibes (Festival→techno, Matrimonio→nu disco, etc.).
  const typeParsed = sp.type
    ? parseFreeText(sp.type, allGenres.map((g) => g.genre))
    : null;

  // Los géneros inferidos (texto libre Founding + tipo de evento) se SUMAN a
  // los chips explícitos, sin tocar el estado de los chips (selección manual).
  const effectiveGenres = Array.from(
    new Set([
      ...activeGenres,
      ...(parsed?.genres ?? []),
      ...(typeParsed?.genres ?? []),
    ])
  );

  // ¿El booker ya describió algo? Cualquier campo dispara el ranking.
  const hasQuery = !!(
    sp.type ||
    sp.city ||
    sp.date ||
    (budgetNum && budgetNum > 0) ||
    effectiveGenres.length > 0 ||
    freeText
  );

  let results: ReturnType<typeof rankDjsForGig> = [];
  if (hasQuery) {
    const need: GigNeed = {
      eventType: sp.type || undefined,
      city: sp.city || undefined,
      eventDate: sp.date || undefined,
      budget: budgetNum && budgetNum > 0 ? budgetNum : undefined,
      genres: effectiveGenres,
    };
    const base = await getPublicDjsBase();
    results = rankDjsForGig(base, need);
  }

  // Chips: top-24 por uso + cualquier género activo que quedara fuera del tope,
  // para que una selección no se vuelva invisible (BAJO).
  const topGenres = allGenres.slice(0, 24);
  const topGenreSet = new Set(topGenres.map((g) => g.genre));
  const chipGenres = [
    ...topGenres,
    ...allGenres.filter(
      (g) => activeGenres.includes(g.genre) && !topGenreSet.has(g.genre)
    ),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Hero */}
      <GlassPanel className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <MonoLabel>SMART MATCH</MonoLabel>
          {isFounding && (
            <Badge tone="warn" solid>
              ★ Founding
            </Badge>
          )}
        </div>
        <h1
          className="mt-2 leading-none"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "56px",
            letterSpacing: "-0.005em",
          }}
        >
          MATCH<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Describe tu evento una vez y DROP te ordena los DJs que mejor calzan —
          con el porqué de cada match. Sin filtrar a mano.
        </p>
      </GlassPanel>

      {/* Form del evento */}
      <GlassPanel className="mb-6">
        <form action="/booker/match" method="get" className="space-y-4">
          <MonoLabel>TU EVENTO</MonoLabel>

          {/* A6: los géneros se eligen como chips (links), no como campos del
              form. Sin este hidden, al apretar "BUSCAR MATCH" el GET se llevaría
              solo type/city/date/budget/q y borraría la selección de géneros. */}
          <input type="hidden" name="genres" value={activeGenres.join(",")} />

          {/* v2 — texto libre (exclusivo Founding) */}
          {isFounding ? (
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-muted mb-1 flex items-center gap-2">
                <span>En tus palabras (opcional)</span>
                <Badge tone="warn" solid>
                  ★ Founding
                </Badge>
              </div>
              <input
                type="text"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="ej: energía de festival para un rooftop al atardecer"
                className={FIELD}
              />
            </div>
          ) : (
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-muted mb-1">
                En tus palabras
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  placeholder="ej: energía de festival para un rooftop al atardecer"
                  className={cn(FIELD, "cursor-not-allowed opacity-60")}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Badge tone="warn" solid>
                    ✦ Exclusivo Founding
                  </Badge>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_160px_auto] gap-2">
            <select name="type" defaultValue={sp.type ?? ""} className={SELECT}>
              <option value="">Tipo de evento</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select name="city" defaultValue={sp.city ?? ""} className={SELECT}>
              <option value="">Ciudad: cualquiera</option>
              {allCities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="date"
              defaultValue={sp.date ?? ""}
              className={FIELD}
            />
            <input
              type="number"
              name="budget"
              min={0}
              step={50000}
              placeholder="Presupuesto $"
              defaultValue={sp.budget ?? ""}
              className={FIELD}
            />
            <Button type="submit" variant="clayPrimary">
              BUSCAR MATCH
            </Button>
          </div>

          {/* Géneros como chips (preservan los demás campos) */}
          {allGenres.length > 0 && (
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-muted mb-2">
                Géneros que buscas:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chipGenres.map((g) => {
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
                      className="inline-flex"
                    >
                      <ClayChip active={active}>
                        {g.genre.toUpperCase()}
                        {!active && (
                          <span className="ml-1 opacity-60">{g.count}</span>
                        )}
                      </ClayChip>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </GlassPanel>

      {/* v2 — qué interpretamos del texto libre. M3: el banner se muestra
          siempre que el Founding escribió algo (`parsed` ya implica freeText),
          para que el fallback "no pillamos géneros" no sea código muerto. */}
      {parsed && (
        <div className="mb-4">
          <Alert tone="info" title="INTERPRETAMOS">
            {parsed.vibes.length > 0 && (
              <>
                vibe{" "}
                <span className="font-semibold">{parsed.vibes.join(", ")}</span>
                {parsed.genres.length > 0 && " → "}
              </>
            )}
            {parsed.genres.length > 0 && (
              <>
                géneros{" "}
                <span className="font-semibold">{parsed.genres.join(", ")}</span>
              </>
            )}
            {parsed.genres.length === 0 && parsed.vibes.length === 0 && (
              <span className="text-fg-muted">
                no pillamos géneros claros — afina el texto o usa los chips.
              </span>
            )}
          </Alert>
        </div>
      )}

      {/* Resultados o intro */}
      {!hasQuery ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <h2
            className="leading-tight mb-2"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "28px",
            }}
          >
            DESCRIBE TU EVENTO ↑
          </h2>
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            Elige tipo, ciudad, fecha, presupuesto y/o géneros. DROP te arma el
            ranking de DJs y te explica por qué cada uno calza. Mientras más
            cuentes, mejor el match.
          </p>
        </div>
      ) : results.length === 0 ? (
        <GlassPanel padded={false} className="p-10 text-center">
          <p className="text-sm text-fg-muted">
            No encontramos DJs para esos criterios. Prueba aflojar el
            presupuesto o sacar algún filtro.
          </p>
        </GlassPanel>
      ) : (
        <>
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
            — {results.length} {results.length === 1 ? "DJ" : "DJs"} para tu evento
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((scored) => (
              <MatchCard
                key={scored.dj.user_id}
                scored={scored}
                favorited={favIds.has(scored.dj.user_id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
