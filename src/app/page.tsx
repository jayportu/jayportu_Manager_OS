import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * Bloque B — Landing pública split-screen.
 *
 * Flujo:
 *   - Sin sesión → renderiza landing split DJ vs Booker
 *   - Sesión DJ (tiene dj_profile) → redirect a /dashboard
 *   - Sesión Booker (tiene booker_accounts, no dj_profile) → /booker/requests
 *   - Sesión sin tipo (raro) → /welcome para terminar onboarding
 *
 * Antes: redirect duro a /beta sin contexto, perdíamos visitantes que no
 * sabían qué era DROP. Ahora la landing comunica el value prop antes del
 * gate de invite.
 */

export const metadata: Metadata = {
  title: "DROP. · The DJ OS",
  description:
    "DROP. es el sistema operativo para DJs independientes. CRM, press kit público, bookings, IA, todo en un solo lugar. Bookers: encuentra DJs verificados en LATAM.",
  openGraph: {
    title: "DROP. · The DJ OS",
    description:
      "Sistema operativo para DJs · CRM, press kit, bookings, IA. Bookers: directorio LATAM.",
    type: "website",
  },
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Decidir DJ vs Booker en una sola query paralela
    const [{ data: dj }, { data: booker }] = await Promise.all([
      supabase.from("dj_profile").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("booker_accounts")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (dj) redirect("/dashboard");
    // Booker: por la row de booker_accounts O por account_type en metadata.
    // El row se crea lazy en el layout /booker (ensureBookerAccount), así que
    // un booker recién logueado puede no tenerlo todavía — el metadata sí.
    const accountType = user.user_metadata?.account_type;
    if (booker || accountType === "booker") redirect("/booker/requests");
    // Edge case: user creado en auth.users pero sin perfil. Va al wizard.
    redirect("/welcome");
  }

  // Sin sesión: landing pública split-screen
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header con logo centrado */}
      <header className="bg-ink text-cream border-b-2 border-orange py-5 px-6 flex items-center justify-between">
        <div
          className="select-none"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "32px",
            lineHeight: 0.85,
          }}
        >
          DROP<span className="text-orange">.</span>
        </div>
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          THE DJ OS · LATAM
        </div>
      </header>

      {/* Split 50/50 */}
      <div className="flex-1 grid md:grid-cols-2 min-h-0">
        {/* ═════════ DJ side (left, ink fondo) ═════════ */}
        <DjSide />

        {/* ═════════ Booker side (right, cream fondo) ═════════ */}
        <BookerSide />
      </div>

      {/* Footer minimalista */}
      <footer className="bg-ink text-cream border-t-2 border-orange py-4 px-6 text-center">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-fg-subtle">
          DROP<span className="text-orange">.</span> · MADE IN SANTIAGO · 2026
          {" · "}
          <a
            href="mailto:hola@dropgigs.com"
            className="text-orange tracking-[0.15em] normal-case hover:underline"
            style={{ textTransform: "none" }}
          >
            hola@dropgigs.com
          </a>
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle mt-2">
          <a href="/privacy" className="hover:text-orange transition-colors">Privacidad</a>
          {" · "}
          <a href="/terms" className="hover:text-orange transition-colors">Términos</a>
        </div>
      </footer>
    </main>
  );
}

function DjSide() {
  return (
    <section className="relative bg-ink text-cream p-8 md:p-14 flex flex-col justify-between overflow-hidden min-h-[60vh] md:min-h-[calc(100vh-130px)]">
      {/* Watermark D. */}
      <span
        aria-hidden="true"
        className="absolute pointer-events-none select-none"
        style={{
          bottom: "-100px",
          right: "-60px",
          fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
          fontSize: "440px",
          lineHeight: 0.75,
          color: "rgba(255, 92, 0, 0.06)",
          letterSpacing: "-0.02em",
        }}
      >
        D.
      </span>

      <div className="relative z-10">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-orange flex items-center gap-3">
          <span>— ERES DJ</span>
          <span className="flex-1 h-px bg-orange/40 max-w-[200px]" />
          <span className="text-cream/60">BETA CERRADA</span>
        </div>
        <h1
          className="mt-5"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "clamp(48px, 6.5vw, 84px)",
            lineHeight: 0.95,
            letterSpacing: 0,
          }}
        >
          TOMA EL<br />
          CONTROL DE<br />
          TU CARRERA<span className="text-orange">.</span>
        </h1>
        <p className="mt-6 text-base md:text-lg leading-relaxed max-w-lg text-cream/90">
          CRM, press kit público, bookings, IA, métricas de crecimiento.
          El sistema operativo para DJs independientes — todo en un solo lugar,
          sin manager de por medio.
        </p>
        <ul className="mt-7 space-y-2.5 max-w-md">
          {[
            "Press kit público en /p/tu-nombre",
            "Inbox de bookings con cotización y agenda auto",
            "CRM con tags, recurrencias, notas privadas",
            "IA local (Ollama) para mails y estrategia",
          ].map((t) => (
            <li
              key={t}
              className="text-sm leading-snug pl-5 relative text-cream/90"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-[7px] w-[7px] h-[7px] bg-orange"
              />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 mt-10">
        <Link
          href="/beta"
          className="inline-flex items-center gap-3 px-7 py-4 bg-orange text-ink border-2 border-orange font-mono text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-cream hover:border-cream transition-colors"
        >
          Solicitar invitación →
        </Link>
        <div className="mt-4 font-mono text-[10px] tracking-[0.14em] text-cream/50">
          ¿Ya tienes invite? <Link href="/login" className="underline hover:text-orange">Entra acá</Link>
        </div>
      </div>
    </section>
  );
}

function BookerSide() {
  return (
    <section className="relative bg-cream text-ink p-8 md:p-14 flex flex-col justify-between overflow-hidden min-h-[60vh] md:min-h-[calc(100vh-130px)] border-l-0 md:border-l-2 border-ink">
      {/* Watermark B. */}
      <span
        aria-hidden="true"
        className="absolute pointer-events-none select-none"
        style={{
          bottom: "-100px",
          left: "-50px",
          fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
          fontSize: "440px",
          lineHeight: 0.75,
          color: "rgba(10, 10, 10, 0.05)",
          letterSpacing: "-0.02em",
        }}
      >
        B.
      </span>

      <div className="relative z-10">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-orange flex items-center gap-3">
          <span>— ERES BOOKER</span>
          <span className="flex-1 h-px bg-ink/30 max-w-[200px]" />
          <span className="text-ink/50">PRÓXIMAMENTE</span>
        </div>
        <h1
          className="mt-5"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "clamp(48px, 6.5vw, 84px)",
            lineHeight: 0.95,
            letterSpacing: 0,
          }}
        >
          ENCUENTRA<br />
          AL DJ<br />
          INDICADO<span className="text-orange">.</span>
        </h1>
        <p className="mt-6 text-base md:text-lg leading-relaxed max-w-lg text-fg">
          Directorio de DJs verificados en LATAM. Filtra por género, ciudad
          y disponibilidad. Manda tu request directo al artista — sin
          intermediarios, sin comisión.
        </p>
        <ul className="mt-7 space-y-2.5 max-w-md">
          {[
            "Directorio /dj con filtros por género y ciudad",
            "Disponibilidad pública por fecha",
            "Inbox de tus requests con estado en vivo",
            "Guarda tus DJs favoritos para el próximo evento",
          ].map((t) => (
            <li
              key={t}
              className="text-sm leading-snug pl-5 relative text-fg"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-[7px] w-[7px] h-[7px] bg-ink"
              />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 mt-10 flex flex-wrap gap-3">
        <span
          className="inline-flex items-center gap-3 px-7 py-4 bg-ink/30 text-ink/40 border-2 border-ink/20 font-mono text-[12px] font-bold tracking-[0.18em] uppercase cursor-not-allowed select-none"
        >
          Próximamente
        </span>
        <Link
          href="/dj"
          className="inline-flex items-center gap-3 px-7 py-4 bg-cream text-ink border-2 border-ink font-mono text-[12px] font-bold tracking-[0.18em] uppercase hover:bg-orange transition-colors"
        >
          Ver directorio
        </Link>
      </div>
    </section>
  );
}
