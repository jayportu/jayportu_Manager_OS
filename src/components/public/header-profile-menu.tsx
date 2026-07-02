"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

/**
 * CTA "Elige tu perfil" del header. Desplegable de perfiles: DJ es el único
 * activo (→ /beta); el resto baja a la sección #perfiles del landing, que los
 * muestra como "próximamente". Client component (a diferencia del <details>
 * puro) para poder CERRARSE al elegir una opción — con anclas de la misma
 * página (#perfiles) el <details> se quedaba abierto. También cierra al clickear
 * afuera o con Escape.
 */
const PROFILE_LINKS: { label: string; href: string; available?: boolean }[] = [
  { label: "DJ", href: "/beta", available: true },
  { label: "Booker", href: "/#perfiles" },
  { label: "Fotógrafo", href: "/#perfiles" },
  { label: "Audiovisual", href: "/#perfiles" },
];

export function HeaderProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Elegir perfil"
        className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2 border-2 border-border font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
          open ? "bg-ink text-orange" : "bg-orange text-ink hover:bg-ink hover:text-orange"
        }`}
      >
        <span className="hidden sm:inline">Elige tu perfil</span>
        <span className="sm:hidden">Perfil</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+2px)] z-50 min-w-[230px] bg-ink border-2 border-orange flex flex-col"
        >
          {PROFILE_LINKS.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="group/item flex items-center justify-between gap-4 px-4 py-3 border-b border-cream/10 last:border-b-0 hover:bg-orange transition-colors"
            >
              <span className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-white/85 group-hover/item:text-ink">
                {p.label}
              </span>
              <span
                className={`font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${
                  p.available
                    ? "text-orange group-hover/item:text-ink"
                    : "text-white/40 group-hover/item:text-ink/70"
                }`}
              >
                {p.available ? "Empezar →" : "Próximamente"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
