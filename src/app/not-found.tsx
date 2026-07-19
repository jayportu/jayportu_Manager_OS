import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GlassPanel } from "@/components/hos";
import { Button } from "@/components/ui/button";

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
        <GlassPanel className="p-8">
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
            <Button asChild variant="clayPrimary">
              <Link href="/">Ir al inicio</Link>
            </Button>
            <Button asChild variant="clay">
              <Link href="/dj">Ver DJs</Link>
            </Button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
