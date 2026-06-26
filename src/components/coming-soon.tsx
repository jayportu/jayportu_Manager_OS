/**
 * <ComingSoon /> — pantalla explainer para features incompletas durante
 * la beta cerrada. Se usa cuando una ruta existe pero la UI aún no.
 *
 * Brand DROP. (Type Beat brutalist): cream/ink/orange + Anton/Inter/Space Mono.
 *
 * Uso típico desde una page.tsx:
 *
 *   export default function Page() {
 *     return (
 *       <ComingSoon
 *         title="Tech rider editor"
 *         description="Vas a poder armar tu rider con fotos y subirlo al press kit."
 *         eta="Sprint 21"
 *         bullets={[
 *           "Items por categoría (DJ booth, monitor, mixer, etc.)",
 *           "Subir fotos del setup",
 *           "Generar PDF embed en el press kit",
 *         ]}
 *       />
 *     );
 *   }
 */
import Link from "next/link";

interface ComingSoonProps {
  /** Título grande de la feature (ej. "Tech rider editor"). */
  title: string;
  /** Frase corta que explica qué será cuando esté lista. */
  description: string;
  /** ETA suave: "Sprint 21", "junio 2026", "Q3", o "pronto". Opcional. */
  eta?: string;
  /** Lista corta de qué incluirá. Opcional. */
  bullets?: string[];
  /** Texto del CTA secundario (default: "Volver al dashboard"). */
  ctaLabel?: string;
  /** Href del CTA secundario (default: "/dashboard"). */
  ctaHref?: string;
}

export function ComingSoon({
  title,
  description,
  eta,
  bullets,
  ctaLabel = "Volver al dashboard",
  ctaHref = "/dashboard",
}: ComingSoonProps) {
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl">
        {/* Kicker */}
        <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-orange uppercase mb-4 flex items-center gap-3">
          <span>— Próximamente</span>
          <span className="flex-1 h-px bg-orange/40 max-w-[200px]" />
          {eta && (
            <span className="text-fg-subtle">
              ETA · <span className="text-fg">{eta}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          className="text-fg"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "clamp(48px, 8vw, 88px)",
            lineHeight: 0.82,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p className="mt-5 text-base md:text-lg leading-relaxed text-fg max-w-xl">
          {description}
        </p>

        {/* Bullets opcionales */}
        {bullets && bullets.length > 0 && (
          <div className="mt-8 border-2 border-border bg-bg-panel p-5">
            <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-orange uppercase mb-3">
              — Qué tendrá
            </div>
            <ul className="space-y-2">
              {bullets.map((b, i) => (
                <li
                  key={i}
                  className="text-sm leading-snug pl-5 relative text-fg"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[7px] w-[7px] h-[7px] bg-ink"
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status note */}
        <div className="mt-8 font-mono text-[11px] tracking-[0.1em] text-fg-subtle leading-relaxed">
          Estás en la beta cerrada de DROP<span className="text-orange">.</span>
          {" "}— esta función aparece acá para que veas el roadmap, pero todavía
          no está operativa. Cuando esté lista te llega notificación push.
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center px-5 py-3 bg-ink text-white font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-border hover:bg-orange hover:text-ink transition-colors"
          >
            {ctaLabel} →
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-5 py-3 bg-cream text-fg font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-border hover:bg-orange transition-colors"
          >
            Ver roadmap
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * <ComingSoonBadge /> — badge mini para usar en sidebar/nav items.
 * Pegarlo al lado del label cuando el item está marcado como comingSoon.
 */
export function ComingSoonBadge() {
  return (
    <span
      className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase px-[5px] py-[1px] bg-orange/15 text-orange border border-orange/40"
      aria-label="Próximamente"
    >
      pronto
    </span>
  );
}
