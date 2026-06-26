"use client";

/**
 * Nav de secciones del press kit (tabs brutalist sticky). El ítem
 * SELECCIONADO (el que clickeas) se pinta en naranjo. Por defecto arranca el
 * primero ("— BIO"). Antes "— BIO" quedaba naranjo fijo sin importar la sección.
 *
 * Se usa selección por click (no scroll-spy) porque el layout no apila las
 * secciones en vertical: #contacto es la columna derecha (aside) que corre en
 * paralelo a bio/música/rider, así que un IntersectionObserver de banda no
 * mapea limpio.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface NavSection {
  id: string;
  label: string;
  /** El tab principal ("— BIO") va más grande, en font display. */
  primary?: boolean;
}

export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  return (
    <nav
      className="bg-bg-panel border-b-2 border-border sticky top-0 z-30"
      aria-label="Secciones del press kit"
    >
      {/* pl-2/md:pl-6 → el texto del primer tab queda alineado con el
          contenido del hero y del body (que usan px-6/md:px-12). */}
      <div className="max-w-6xl mx-auto flex overflow-x-auto pl-2 md:pl-6">
        {sections.map((s, i) => {
          const isActive = active === s.id;
          const isLast = i === sections.length - 1;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "px-4 md:px-6 whitespace-nowrap transition-colors",
                !isLast && "border-r-2 border-border",
                s.primary
                  ? "font-display text-base md:text-lg leading-none py-3.5"
                  : "font-mono text-[11px] font-bold uppercase tracking-[0.08em] py-4",
                isActive
                  ? "bg-orange text-ink"
                  : "text-fg-muted hover:bg-cream hover:text-fg"
              )}
            >
              {s.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
