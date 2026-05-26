import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookerSignupForm } from "./booker-signup-form";

/**
 * Bloque B · B2 — Signup público para Bookers (consumidores).
 *
 * Diferencia clave vs DJs:
 *   - DJs: beta cerrada, requieren invite vía /beta.
 *   - Bookers: signup abierto. Cualquier productor / venue / particular
 *     puede crearse cuenta para usar el directorio + inbox de requests.
 *
 * Si el user ya tiene sesión:
 *   - Con dj_profile → /dashboard (es DJ, no puede ser booker también)
 *   - Con booker_account → /booker/requests (ya está dentro)
 *   - Sin ninguno → mostramos el form igual (raro, pero válido)
 */

export const metadata: Metadata = {
  title: "Crear cuenta · Booker · DROP.",
  description:
    "Crea tu cuenta gratis en DROP. para contactar DJs verificados en LATAM. Sin comisión, sin intermediarios.",
};

export default async function BookerSignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [{ data: dj }, { data: booker }] = await Promise.all([
      supabase.from("dj_profile").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("booker_accounts")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (dj) redirect("/dashboard");
    if (booker) redirect("/booker/requests");
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
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
          BOOKER · ACCESO ABIERTO
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-orange mb-3 flex items-center gap-3">
            <span>— CREAR CUENTA BOOKER</span>
            <span className="flex-1 h-px bg-orange/40 max-w-[120px]" />
          </div>
          <h1
            className="mb-3"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "56px",
              lineHeight: 0.85,
              letterSpacing: "-0.005em",
            }}
          >
            EMPEZÁ A<br />
            BOOKEAR DJS<span className="text-orange">.</span>
          </h1>
          <p className="text-sm text-fg-muted mb-7 leading-relaxed">
            Sin comisión, sin intermediarios. Contactá directo a los DJs
            del directorio y guardá tus favoritos para próximos eventos.
          </p>

          <BookerSignupForm />

          <div className="mt-6 pt-5 border-t border-ink/15">
            <div className="text-[11px] text-fg-subtle font-mono tracking-wider mb-1.5">
              ¿YA TENÉS CUENTA?
            </div>
            <Link
              href="/login"
              className="text-sm underline hover:text-orange"
            >
              Iniciar sesión
            </Link>
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
