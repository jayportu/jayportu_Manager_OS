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
import { GlassPanel, MonoLabel } from "@/components/hos";
import { Button } from "@/components/ui/button";

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
          <GlassPanel className="mt-8">
            <MonoLabel className="mb-3 block">Qué tendrá</MonoLabel>
            <ul className="space-y-2">
              {bullets.map((b, i) => (
                <li
                  key={i}
                  className="text-sm leading-snug pl-5 relative text-fg"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[7px] w-[7px] h-[7px] bg-orange"
                  />
                  {b}
                </li>
              ))}
            </ul>
          </GlassPanel>
        )}

        {/* Status note */}
        <div className="mt-8 font-mono text-[11px] tracking-[0.1em] text-fg-subtle leading-relaxed">
          Estás en la beta cerrada de DROP<span className="text-orange">.</span>
          {" "}— esta función aparece acá para que veas el roadmap, pero todavía
          no está operativa. Cuando esté lista te llega notificación push.
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="clayPrimary">
            <Link href={ctaHref}>{ctaLabel} →</Link>
          </Button>
          <Button asChild variant="clay">
            <Link href="/dashboard">Ver roadmap</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * <ComingSoonBadge /> — badge mini para usar en sidebar/nav items.
 * Pegarlo al lado del label cuando el item está marcado como comingSoon.
 *
 * `text` permite variar la etiqueta visible (default "pronto"). El lado DJ
 * usa "PRÓXIMAMENTE"; el booker mantiene "pronto" (no pasa prop).
 */
export function ComingSoonBadge({ text = "pronto" }: { text?: string }) {
  return (
    <span
      className="font-mono text-[8px] font-bold tracking-[0.12em] uppercase px-[6px] py-[1px] rounded-full bg-orange/15 text-orange border border-orange/40 whitespace-nowrap"
      aria-label="Próximamente"
    >
      {text}
    </span>
  );
}
