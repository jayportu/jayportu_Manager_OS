import Link from "next/link";
import type { Metadata } from "next";
import { BookerSignupForm } from "./booker-signup-form";

export const metadata: Metadata = {
  title: "Crea tu cuenta de booker · DROP.",
  description:
    "Regístrate gratis para buscar DJs por género, ciudad, disponibilidad y presupuesto, escuchar sus sets y contactarlos directo — sin comisión.",
};

export default function BookerSignupPage() {
  return (
    <main className="min-h-screen bg-cream flex flex-col">
      <header className="bg-ink text-cream border-b-2 border-orange py-5 px-6 flex items-center justify-between">
        <Link
          href="/"
          className="select-none hover:opacity-90 transition-opacity"
          style={{
            fontFamily: "var(--font-satoshi), system-ui, sans-serif",
            fontSize: "28px",
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
          }}
        >
          DROP<span className="text-orange" style={{ marginLeft: "-0.06em" }}>.</span>
        </Link>
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          BOOKER · REGISTRO
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-orange mb-3 flex items-center gap-3">
            <span>— PORTAL BOOKER</span>
            <span className="flex-1 h-px bg-orange/40 max-w-[120px]" />
          </div>
          <h1
            className="mb-3"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "40px",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
            }}
          >
            ENCUENTRA TU DJ<span className="text-orange">.</span>
          </h1>
          <p className="text-sm text-fg-muted mb-6 leading-relaxed">
            Crea tu cuenta gratis para buscar DJs por género, ciudad,
            disponibilidad y presupuesto, escuchar sus sets y contactarlos
            directo — sin intermediarios ni comisión.
          </p>

          <BookerSignupForm />

          <div className="mt-6 pt-5 border-t border-ink/15 space-y-3">
            <div className="text-[12px] text-fg-muted">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-bold underline hover:text-orange"
              >
                Inicia sesión
              </Link>
            </div>
            <div className="text-[11px] text-fg-subtle font-mono tracking-wider">
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
