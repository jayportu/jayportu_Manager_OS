"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Music2, CalendarDays, Wallet } from "lucide-react";
import type { OpenGig } from "@/lib/queries/convocatorias";

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
      <div className="mb-4 border-2 border-border p-3 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="conv-city"
            className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1"
          >
            Ciudad
          </label>
          <input
            id="conv-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ej. Santiago"
            className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="conv-genre"
            className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1"
          >
            Género
          </label>
          <input
            id="conv-genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Ej. Techno"
            className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-fg-muted border-2 border-dashed border-border p-6 text-center">
          No hay convocatorias abiertas que coincidan con tu búsqueda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((g) => (
            <Link
              key={g.id}
              href={`/convocatorias/${g.id}`}
              className="block border-2 border-border p-3 hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{g.title}</div>
                  <div className="text-xs text-fg-muted truncate">{g.organizer_name}</div>
                </div>
                {appliedGigIds.includes(g.id) && (
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-accent text-accent">
                    Ya postulaste
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {g.city && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-fg-muted border border-border px-1.5 py-0.5">
                    <MapPin className="w-3 h-3" /> {g.city}
                  </span>
                )}
                {g.genre && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-fg-muted border border-border px-1.5 py-0.5">
                    <Music2 className="w-3 h-3" /> {g.genre}
                  </span>
                )}
                {g.event_date && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-fg-muted">
                    <CalendarDays className="w-3 h-3" /> {fmtDate(g.event_date)}
                  </span>
                )}
                {g.budget_clp != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent font-bold">
                    <Wallet className="w-3 h-3" /> {fmtBudget(g.budget_clp)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
