"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Music2,
  CalendarDays,
  Wallet,
  Megaphone,
  ArrowUpRight,
} from "lucide-react";
import type { OpenGig } from "@/lib/queries/convocatorias";
import { GlassPanel, MonoLabel, Badge, EmptyState, FIELD } from "@/components/hos";
import { cn } from "@/lib/utils";

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtBudget(clp: number | null): string {
  if (!clp) return "";
  return `$${clp.toLocaleString("es-CL")}`;
}

function Chip({
  icon: Icon,
  children,
  accent,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]",
        accent ? "border-accent/40 font-bold text-accent" : "border-white/12 text-white/50"
      )}
    >
      <Icon width={11} height={11} aria-hidden /> {children}
    </span>
  );
}

export function Discover({
  initialGigs,
  appliedGigIds,
  defaultCity,
}: {
  initialGigs: OpenGig[];
  appliedGigIds: string[];
  defaultCity: string;
}) {
  const [city, setCity] = useState(defaultCity);
  const [genre, setGenre] = useState("");

  const filtered = useMemo(() => {
    const c = city.trim().toLowerCase();
    const g = genre.trim().toLowerCase();
    return initialGigs.filter((gig) => {
      const matchCity = !c || gig.city.toLowerCase().includes(c);
      const matchGenre = !g || gig.genre.toLowerCase().includes(g);
      return matchCity && matchGenre;
    });
  }, [initialGigs, city, genre]);

  return (
    <div>
      {/* Filtros (cliente, sobre initialGigs — sin round-trip al server) */}
      <div
        className="mb-5 flex flex-col gap-2 rounded-2xl border border-white/10 p-3 sm:flex-row sm:items-end"
        style={{ background: "rgba(255,255,255,.03)" }}
      >
        <div className="flex-1">
          <label
            htmlFor="conv-city"
            className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
          >
            Ciudad
          </label>
          <input
            id="conv-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ej. Santiago"
            className={FIELD}
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="conv-genre"
            className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
          >
            Género
          </label>
          <input
            id="conv-genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Ej. Techno"
            className={FIELD}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nada abierto por ahora"
          sub="No hay convocatorias abiertas que coincidan con tu búsqueda."
        />
      ) : (
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between">
            <MonoLabel>{filtered.length} gigs abiertos</MonoLabel>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              actualizado hoy
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {filtered.map((g) => (
              <Link
                key={g.id}
                href={`/convocatorias/${g.id}`}
                className="group block rounded-xl border border-white/10 p-3 transition-colors hover:border-accent/40"
                style={{ background: "rgba(255,255,255,.03)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{g.title}</div>
                    <div className="truncate text-xs text-white/45">{g.organizer_name}</div>
                  </div>
                  {appliedGigIds.includes(g.id) ? (
                    <Badge tone="info">Ya postulaste</Badge>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/40 group-hover:text-accent">
                      Ver <ArrowUpRight width={12} height={12} />
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {g.city && <Chip icon={MapPin}>{g.city}</Chip>}
                  {g.genre && <Chip icon={Music2}>{g.genre}</Chip>}
                  {g.event_date && <Chip icon={CalendarDays}>{fmtDate(g.event_date)}</Chip>}
                  {g.budget_clp != null && (
                    <Chip icon={Wallet} accent>
                      {fmtBudget(g.budget_clp)}
                    </Chip>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
