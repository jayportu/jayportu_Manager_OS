/**
 * Landing teaser "Reinventándonos" — DROP. (2026-07).
 *
 * Se muestra en "/" cuando el flag de entorno DROP_TEASER === "1" (ver
 * src/app/page.tsx y src/middleware.ts). Oculta temporalmente la app pública
 * y comunica que la marca está en una nueva etapa. Concepto B · "Signal"
 * aprobado: ticker en vivo (28s) + punto naranja parpadeando + watermark D. +
 * grain + glow, estética glass/glow del sistema Hybrid OS.
 *
 * Server component 100% CSS (sin JS de cliente) → óptimo para Core Web Vitals.
 * Reutiliza fuentes ya cargadas en el layout (--font-satoshi, --font-space-mono)
 * y las animaciones ya definidas en tailwind.config (animate-ticker-scroll 28s,
 * animate-blink), que globals.css ya desactiva bajo prefers-reduced-motion.
 *
 * Sin navegación, sin CTA, sin formulario, sin footer. Solo marca + movimiento.
 */

const SATOSHI = "var(--font-satoshi), system-ui, sans-serif";
const MONO = "var(--font-space-mono), ui-monospace, monospace";
const CREAM = "#F4EFE7";

// Frase del ticker (mensaje aprobado). Se repite; el track lleva DOS copias
// idénticas para que animate-ticker-scroll (translateX -50%) loopee sin costura.
const TICKER_UNIT = "ESTAMOS REINVENTANDO DROP. PARA LA ESCENA.";

function TickerRow() {
  const chunk = (
    <>
      <span>{TICKER_UNIT}</span>
      <span className="dot-sep" aria-hidden>
        ·
      </span>
      <span>ATENTO</span>
      <span className="dot-sep" aria-hidden>
        ·
      </span>
      <span>SE VIENE</span>
      <span className="dot-sep" aria-hidden>
        ·
      </span>
    </>
  );
  // 6 unidades por copia → ancho suficiente para cubrir pantallas anchas.
  const copy = Array.from({ length: 6 }, (_, i) => <span key={i}>{chunk}</span>);
  return (
    <div className="tk-track motion-safe:animate-ticker-scroll">
      <div className="tk-copy">{copy}</div>
      <div className="tk-copy" aria-hidden>
        {copy}
      </div>
    </div>
  );
}

export function BrandTeaser() {
  return (
    <main className="drop-teaser" aria-label="DROP. — Estamos reinventando la escena">
      {/* Atmósfera */}
      <div className="t-layer t-grid" aria-hidden />
      <div className="t-layer t-glow" aria-hidden />
      <div className="t-layer t-vignette" aria-hidden />
      <div className="t-layer t-grain" aria-hidden />
      <div className="t-watermark" aria-hidden>
        D<span className="wm-dot">.</span>
      </div>

      {/* Etiqueta editorial */}
      <div className="t-tag" aria-hidden>
        — Nueva etapa
      </div>

      {/* Escenario */}
      <section className="t-stage">
        <h1 className="t-lockup" aria-label="DROP.">
          <span aria-hidden>DROP</span>
          <span className="t-dot motion-safe:animate-blink" aria-hidden>
            .
          </span>
        </h1>
        <p className="t-tagline">
          Estamos reinventando{" "}
          <span className="t-inline">
            DROP<span className="t-inline-dot">.</span>
          </span>{" "}
          para la escena.
        </p>
        <p className="t-kicker">
          <span className="t-live" aria-hidden />— Atento.
        </p>
      </section>

      {/* Ticker "en vivo" */}
      <div className="t-ticker" aria-hidden>
        <TickerRow />
      </div>

      <style>{`
        .drop-teaser{position:fixed;inset:0;overflow:hidden;background:rgb(var(--drop-bg));
          color:rgb(var(--drop-fg));display:flex;flex-direction:column;align-items:center;
          justify-content:center;text-align:center;padding:6vh 24px 18vh;isolation:isolate;}
        .drop-teaser .t-layer{position:fixed;inset:0;pointer-events:none;}
        .drop-teaser .t-grid{
          background-image:
            linear-gradient(rgba(247,247,247,.035) 1px,transparent 1px),
            linear-gradient(90deg,rgba(247,247,247,.035) 1px,transparent 1px);
          background-size:24px 24px;
          -webkit-mask-image:radial-gradient(120% 100% at 50% 42%,#000 30%,transparent 92%);
                  mask-image:radial-gradient(120% 100% at 50% 42%,#000 30%,transparent 92%);}
        .drop-teaser .t-glow{background:
            radial-gradient(60% 48% at 82% 2%, rgba(232,90,12,.32), transparent 66%),
            radial-gradient(52% 44% at 12% 100%, rgba(232,90,12,.19), transparent 70%);}
        .drop-teaser .t-vignette{background:
            radial-gradient(130% 95% at 50% 0%,transparent 42%,rgb(var(--drop-bg)/.85) 100%);}
        .drop-teaser .t-grain{opacity:.06;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
        .drop-teaser .t-watermark{position:fixed;left:50%;top:46%;translate:-50% -50%;
          font-family:${SATOSHI};font-weight:900;font-size:min(118vh,148vw);line-height:.8;
          letter-spacing:-.04em;color:rgba(232,90,12,.06);user-select:none;pointer-events:none;
          z-index:0;}
        .drop-teaser .t-watermark .wm-dot{color:rgba(232,90,12,.10);}
        @media (prefers-reduced-motion:no-preference){
          .drop-teaser .t-watermark{animation:t-drift 46s ease-in-out infinite;}
        }
        @keyframes t-drift{0%,100%{translate:-52% -50%}50%{translate:-48% -47%}}

        .drop-teaser .t-tag{position:fixed;top:20px;left:22px;z-index:3;font-family:${MONO};
          font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
          color:rgb(var(--drop-fg-subtle));}

        .drop-teaser .t-stage{position:relative;z-index:2;display:flex;flex-direction:column;
          align-items:center;gap:clamp(16px,3vh,30px);}
        .drop-teaser .t-lockup{font-family:${SATOSHI};font-weight:900;letter-spacing:-.02em;
          line-height:.9;color:${CREAM};font-size:clamp(66px,17vw,208px);margin:0;
          white-space:nowrap;}
        .drop-teaser .t-dot{color:rgb(var(--drop-orange));margin-left:-.06em;display:inline-block;}
        .drop-teaser .t-tagline{font-family:${MONO};font-weight:400;color:rgb(var(--drop-fg-muted));
          font-size:clamp(14px,2.3vw,20px);letter-spacing:.01em;max-width:28ch;margin:0;line-height:1.5;}
        .drop-teaser .t-inline{font-family:${SATOSHI};font-weight:900;color:rgb(var(--drop-fg));
          letter-spacing:-.02em;}
        .drop-teaser .t-inline .t-inline-dot{color:rgb(var(--drop-orange));margin-left:-.06em;}
        .drop-teaser .t-kicker{display:inline-flex;align-items:center;gap:9px;margin:0;
          font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.16em;
          text-transform:uppercase;color:rgb(var(--drop-orange));}
        .drop-teaser .t-live{width:7px;height:7px;background:rgb(var(--drop-orange));
          box-shadow:0 0 0 3px rgba(232,90,12,.18);}

        .drop-teaser .t-ticker{position:fixed;left:0;right:0;bottom:0;z-index:2;overflow:hidden;
          border-top:1px solid rgb(var(--drop-border));background:rgb(var(--drop-bg-dark)/.55);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:12px 0;}
        .drop-teaser .tk-track{display:inline-flex;white-space:nowrap;will-change:transform;}
        .drop-teaser .tk-copy{display:inline-flex;align-items:center;}
        .drop-teaser .tk-copy > span{display:inline-flex;align-items:center;}
        .drop-teaser .t-ticker span{font-family:${MONO};font-size:11px;font-weight:700;
          letter-spacing:.16em;text-transform:uppercase;color:rgb(var(--drop-fg-muted));}
        .drop-teaser .t-ticker .dot-sep{color:rgb(var(--drop-orange));padding:0 16px;}
      `}</style>
    </main>
  );
}

export default BrandTeaser;
