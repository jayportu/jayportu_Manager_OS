import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Próximamente · Booker · DROP.",
  description: "El portal para bookers de DROP. estará disponible muy pronto.",
};

export default function BookerSignupPage() {
  return (
    <main className="min-h-screen bg-cream flex flex-col">
      <header className="bg-ink text-cream border-b-2 border-orange py-5 px-6 flex items-center justify-between">
        <Link
          href="/"
          className="select-none hover:opacity-90 transition-opacity"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "28px",
            lineHeight: 0.85,
          }}
        >
          DROP<span className="text-orange">.</span>
        </Link>
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          BOOKER · PRÓXIMAMENTE
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-orange mb-3 flex items-center gap-3">
            <span>— PORTAL BOOKER</span>
            <span className="flex-1 h-px bg-orange/40 max-w-[120px]" />
          </div>
          <h1
            className="mb-5"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "56px",
              lineHeight: 0.85,
              letterSpacing: "-0.005em",
            }}
          >
            PRÓXIMA<br />
            MENTE<span className="text-orange">.</span>
          </h1>
          <p className="text-sm text-fg-muted mb-7 leading-relaxed">
            El registro para bookers estará disponible muy pronto. Mientras
            tanto, puedes explorar el directorio de DJs y mandar requests
            directamente desde cada perfil — sin necesidad de cuenta.
          </p>

          <Link
            href="/dj"
            className="inline-flex items-center gap-3 px-7 py-4 bg-ink text-cream border-2 border-ink font-mono text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-orange hover:text-ink hover:border-orange transition-colors"
          >
            Ver directorio de DJs →
          </Link>

          <div className="mt-6 pt-5 border-t border-ink/15">
            <div className="mt-3 text-[11px] text-fg-subtle font-mono tracking-wider">
              ¿ERES DJ?{" "}
              <Link href="/beta" className="underline hover:text-orange">
                Solicitar invite a la beta cerrada
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-ink text-cream border-t-2 border-orange py-4 px-6 text-center">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-fg-subtle">
          DROP<span className="text-orange">.</span> · THE DJ OS
        </div>
      </footer>
    </main>
  );
}
