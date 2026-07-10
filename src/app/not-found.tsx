import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * 404 de marca a nivel raíz. Antes, cualquier `notFound()` (p.ej. un press kit
 * /p/[slug] o link-in-bio /l/[slug] con slug inexistente, links que se comparten
 * en RRSS) caía en el 404 default de Next ("404: This page could not be found.")
 * — sin branding y en inglés. Esta pantalla usa los tokens de marca y el mismo
 * patrón visual que booker/error.tsx. Server component; no cambia ningún flujo.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-8">
          <Logo variant="wordmark" tone="ink" size={100} />
        </div>
        <div className="border-2 border-border bg-bg-panel p-8">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
            — ERROR 404
          </div>
          <h1
            className="mb-3"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "32px",
              lineHeight: 0.9,
            }}
          >
            NO ESTÁ ACÁ<span className="text-orange">.</span>
          </h1>
          <p className="text-sm text-fg-muted mb-6">
            Esta página no existe o el link ya no es válido.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-ink text-white font-mono text-[11px] font-bold uppercase tracking-[0.14em] border-2 border-border hover:bg-orange hover:text-ink hover:border-orange transition-colors"
            >
              Ir al inicio
            </Link>
            <Link
              href="/dj"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] border-2 border-border text-fg hover:border-orange hover:text-orange transition-colors"
            >
              Ver DJs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
