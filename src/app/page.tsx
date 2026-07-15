import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { listPublicDjs, type PublicDjProfile } from "@/lib/queries/directory";
import { computeCompleteness } from "@/lib/match/completeness";
import { getInitials, isSupabaseStorageUrl } from "@/lib/format";
import { SiteHeader, SiteFooter } from "@/components/public/site-chrome";
import { LandingHero, type HeroStat } from "@/components/public/landing/landing-hero";
import { FeatureTabs } from "@/components/public/landing/feature-tabs";
import { ProductShowcase } from "@/components/public/landing/product-showcase";
import { RolePicker } from "@/components/public/landing/role-picker";
import { Reveal } from "@/components/public/landing/reveal";

/**
 * Landing público de DROP — dark (rebrand 2026-06).
 * SPEC: design-audit/MOCKUP_landing_v2.html. Hero con titular cross-dissolve +
 * escena de evento en canvas; tabs de features; tarjetas de DJs reales; FAQ
 * acordeón con pricing; scroll-reveal. Tokens dark (--drop-*), Anton/Inter/
 * Space Mono, logo Satoshi (vía SiteHeader/SiteFooter). Copy en tuteo chileno.
 *
 * Flujo de auth (sin cambios): sin sesión → landing; DJ → /dashboard;
 * booker → /booker/requests; sin tipo → /welcome.
 *
 * Data real: la tira de DJs ("La escena, en un solo lugar") se alimenta de
 * `listPublicDjs` (lectura base cacheada 5 min) ordenada por completitud — se
 * actualiza sola cuando entran DJs. Se oculta si no hay ninguno.
 */

export const metadata: Metadata = {
  title: "DROP. · The DJ OS",
  description:
    "El sistema operativo del DJ independiente. CRM, calendario con tus ingresos, press kit y growth — todo en una sola app. 15 días gratis, sin tarjeta.",
  openGraph: {
    title: "DROP. · The DJ OS",
    description:
      "El sistema operativo del DJ independiente. CRM, calendario, press kit y growth en una sola app.",
    type: "website",
    url: "/",
    siteName: "DROP.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DROP. — The DJ OS" }],
  },
};

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

/** Mínimo de DJs públicos para mostrar el conteo real en el hero (si no, copy genérico). */
const TRACTION_MIN = 25;

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [{ data: dj }, { data: booker }] = await Promise.all([
      supabase.from("dj_profile").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("booker_accounts").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
    if (dj) redirect("/dashboard");
    const accountType = user.user_metadata?.account_type;
    if (booker || accountType === "booker") redirect("/booker/requests");
    redirect("/welcome");
  }

  // ── Data real para la tira de DJs (lectura base cacheada) ──
  const allDjs = await listPublicDjs({});
  const hasPhoto = (d: PublicDjProfile) =>
    isSupabaseStorageUrl(d.avatar_url) || isSupabaseStorageUrl(d.hero_image_url);
  // Prioriza los perfiles más COMPLETOS (mismo criterio que Smart Match), con
  // foto y recencia como desempate.
  const suena = [...allDjs]
    .map((d) => ({
      d,
      score: computeCompleteness(d).percent,
      photo: hasPhoto(d) ? 1 : 0,
      ts: d.created_at ? new Date(d.created_at).getTime() : 0,
    }))
    .sort((a, b) => b.score - a.score || b.photo - a.photo || b.ts - a.ts)
    .slice(0, 8)
    .map((x) => x.d);

  // Stats del hero: conteo real solo cuando hay masa (≥25); si no, copy genérico.
  const stats: HeroStat[] =
    allDjs.length >= TRACTION_MIN
      ? [
          { n: String(allDjs.length), suf: "+", l: "DJs en la escena" },
          { n: "15", l: "días gratis" },
          { n: "1", l: "app · todo tu juego" },
        ]
      : [
          { n: "15", l: "días gratis · sin tarjeta" },
          { n: "0", suf: "%", l: "comisión por booking" },
          { n: "1", l: "app · todo tu juego" },
        ];

  return (
    <main className="bg-bg text-fg">
      <SiteHeader />

      {/* HERO — para usar una foto real de evento: <LandingHero ... sceneImageUrl="/hero-evento.jpg" /> */}
      <LandingHero stats={stats} />

      {/* TODO LO QUE INCLUYE — tabs de features interactivos */}
      <section id="incluye" className="scroll-mt-[78px] py-20 md:py-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal className="mb-10 max-w-[620px]">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              — Todo lo que incluye
            </div>
            <h2 className="mt-2.5 text-balance" style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}>
              No es un PDF. Es tu carrera entera.
            </h2>
            <p className="text-fg-muted mt-3.5 text-[15px]">
              Deja de pelear con WhatsApp, Excel y diez links sueltos. Toca una para ver cómo funciona.
            </p>
          </Reveal>
          <Reveal>
            <FeatureTabs />
          </Reveal>
        </div>
      </section>

      {/* MÍRALO POR DENTRO — capturas reales del producto (cuenta demo) */}
      <section id="producto" className="scroll-mt-[78px] pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal className="mb-10 max-w-[620px]">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              — Míralo por dentro
            </div>
            <h2 className="mt-2.5 text-balance" style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}>
              No te lo contamos. Te lo mostramos.
            </h2>
            <p className="text-fg-muted mt-3.5 text-[15px]">
              Capturas reales de la app. Toca cada pantalla.
            </p>
          </Reveal>
          <Reveal>
            <ProductShowcase />
          </Reveal>
        </div>
      </section>

      {/* LA ESCENA, EN UN SOLO LUGAR — DJs reales → press kit */}
      {suena.length > 0 && (
        <section className="pb-20 md:pb-[90px]">
          <div className="max-w-[1140px] mx-auto px-6">
            <Reveal className="mb-10 flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                  — Suena ahora
                </div>
                <h2 className="mt-2.5" style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}>
                  La escena, en un solo lugar.
                </h2>
              </div>
              <Link
                href="/dj"
                className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted hover:text-accent transition-colors whitespace-nowrap"
              >
                Ver el directorio →
              </Link>
            </Reveal>
            <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {suena.map((dj, i) => (
                <LandingDjCard key={dj.user_id} dj={dj} className={i >= 4 ? "max-md:hidden" : ""} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* ELIGE TU PERFIL — DROP parte con los DJs; el resto de la escena
          (booker + roles creativos que promete el FAQ) va como "próximamente" */}
      <section id="perfiles" className="scroll-mt-[78px] pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal className="mb-10 max-w-[620px]">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              — Elige tu perfil
            </div>
            <h2 className="mt-2.5 text-balance" style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}>
              Empezamos con los DJs.
            </h2>
            <p className="text-fg-muted mt-3.5 text-[15px]">
              DROP es el sistema operativo de toda la escena. Hoy, para DJs. El resto de la crew viene en camino.
            </p>
          </Reveal>
          <Reveal>
            <RolePicker />
          </Reveal>
        </div>
      </section>

      {/* FAQ — acordeón con pricing */}
      <section id="faq" className="scroll-mt-[78px] pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal className="mb-10 max-w-[620px]">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              — Preguntas
            </div>
            <h2 className="mt-2.5" style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}>
              Preguntas frecuentes<span className="text-accent">.</span>
            </h2>
          </Reveal>
          <Reveal className="flex flex-col gap-2.5 max-w-[800px]">
            {FAQ.map((item, i) => (
              <details
                key={item.q}
                open={i === 0}
                className="group hos-glass rounded-[12px] open:border-border-strong overflow-hidden"
              >
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer px-5 py-[18px] font-semibold text-[16px] flex justify-between items-center gap-4">
                  <span>{item.q}</span>
                  <span className="text-accent text-[24px] leading-none shrink-0 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-[18px] text-fg-muted text-[14px] leading-relaxed [&_b]:text-fg">
                  {item.a}
                </div>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA banda */}
      <section className="pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[24px] hos-glass px-6 py-14 md:px-10 md:py-[60px] text-center">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(100% 140% at 50% 0%, rgb(var(--drop-orange) / 0.22), transparent 60%)" }}
              />
              <h2 className="relative z-10" style={{ fontFamily: ANTON, fontSize: "clamp(30px,5vw,54px)", lineHeight: 0.95 }}>
                ¿Listo para tomar el control<span className="text-accent">?</span>
              </h2>
              <p className="relative z-10 text-fg-muted mt-3.5 mb-6">
                15 días gratis. Sin tarjeta. Arma tu press kit en minutos.
              </p>
              <div className="relative z-10 flex flex-wrap gap-3.5 justify-center">
                <Link
                  href="/beta"
                  className="inline-flex items-center gap-2 h-[50px] px-6 rounded-[12px] font-mono text-[12px] font-bold uppercase tracking-[0.07em] bg-accent text-ink border border-accent transition-all hover:brightness-110 shadow-[0_6px_24px_-10px_rgb(var(--drop-orange)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Soy DJ · Armar mi press kit →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

/** FAQ del landing. En beta = gratis; precio futuro DJ $5.990/mes (IVA incl.). Booker: cuenta gratis siempre. */
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿DROP es gratis?",
    a: (
      <>
        <b>Ahora la beta es gratis</b> — sin tarjeta. Cuando salgamos de beta, la
        suscripción de DJ será <b>$5.990/mes</b> (IVA incl.), con 15 días gratis
        para probar. Si eres <b>booker</b>, crear tu cuenta y contratar DJs es{" "}
        <b>gratis, siempre</b>.
      </>
    ),
  },
  {
    q: "¿Para quién es DROP?",
    a: (
      <>
        Para <b>DJs independientes</b> de Latam que quieren gestionar su carrera y que los contraten. Pronto,
        también fotógrafos y audiovisuales.
      </>
    ),
  },
  {
    q: "¿Necesito ser DJ profesional?",
    a: <>No. Desde tu primera fecha — DROP te ordena desde el día uno.</>,
  },
  {
    q: "¿Cómo me encuentran los bookers?",
    a: (
      <>
        Apareces en el <b>directorio público</b> y subes en <b>Smart Match</b> cuando activas “disponible para
        tocar”.
      </>
    ),
  },
  {
    q: "¿Puedo cambiar mi info cuando quiera?",
    a: (
      <>
        Sí, <b>en tiempo real</b>. Editas una vez y tu press kit siempre muestra lo último.
      </>
    ),
  },
  {
    q: "¿Mis pagos pasan por DROP?",
    a: (
      <>
        No. Los bookings van <b>directo</b> entre tú y el booker. DROP solo cobra tu suscripción.
      </>
    ),
  },
];

/**
 * Tarjeta de DJ (spec: `.dj` del mockup). Foto de fondo 3/4 + overlay con
 * nombre y géneros; badge "Disponible" si aplica. Toda la tarjeta enlaza al
 * press kit. Server component (sin JS de cliente).
 */
function LandingDjCard({ dj, className = "" }: { dj: PublicDjProfile; className?: string }) {
  const initials = getInitials(dj.artist_name);
  const cardImg = [dj.avatar_url, dj.hero_image_url].find(isSupabaseStorageUrl) ?? "";

  return (
    <Link
      href={`/p/${dj.public_slug}`}
      className={`group relative block aspect-[3/4] rounded-[14px] overflow-hidden hos-glass hos-sweep-card transition-[transform,box-shadow] duration-300 hover:scale-[1.04] hover:z-10 hover:shadow-[0_24px_60px_-22px_rgb(var(--drop-orange)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {cardImg ? (
        <Image
          src={cardImg}
          alt={dj.artist_name}
          fill
          sizes="(max-width:820px) 50vw, 280px"
          className="object-cover"
          quality={85}
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center"
          style={{ fontFamily: ANTON, fontSize: 52, color: "rgb(var(--drop-fg))" }}
        >
          {initials || "DJ"}
          <span className="text-accent">.</span>
        </span>
      )}

      {dj.is_available_now && (
        <span className="absolute top-2.5 left-2.5 z-[2] flex items-center gap-1.5 rounded-full bg-black/70 border border-accent text-accent px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em]">
          <span className="w-[5px] h-[5px] rounded-full bg-accent motion-safe:animate-blink" />
          Disponible
        </span>
      )}

      <div
        className="absolute inset-x-0 bottom-0 z-[2] p-3.5"
        style={{ background: "linear-gradient(transparent, rgb(var(--drop-bg-dark) / 0.92))" }}
      >
        <div className="uppercase truncate" style={{ fontFamily: ANTON, fontSize: 22, lineHeight: 0.9 }}>
          {dj.artist_name}
        </div>
        {dj.genres[0] && (
          <div className="font-mono text-[9px] text-accent tracking-[0.08em] uppercase mt-1 truncate">
            {dj.genres.slice(0, 3).join(" · ")}
          </div>
        )}
      </div>
    </Link>
  );
}
