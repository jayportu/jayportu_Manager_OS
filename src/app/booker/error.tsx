"use client";

/**
 * Error boundary del portal booker. Antes, si una query con service_role
 * (listFollowFeed / listInterestedDjs / listReceivedPitches) lanzaba, la
 * página crasheaba sin red de seguridad. Esto degrada con un mensaje + retry.
 */
export default function BookerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-10 max-w-md mx-auto text-center">
      <div className="border-2 border-ink bg-bg-panel p-8">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
          — ALGO FALLÓ
        </div>
        <h1
          className="mb-3"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "32px",
            lineHeight: 0.9,
          }}
        >
          UPS<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mb-5">
          No pudimos cargar esta sección. Prueba de nuevo en un momento.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-cream font-mono text-[11px] font-bold uppercase tracking-[0.14em] border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
