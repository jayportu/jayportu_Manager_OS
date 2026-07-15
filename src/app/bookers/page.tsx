import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Search,
  Headphones,
  Megaphone,
  BadgeCheck,
  Filter,
  Wallet,
  MapPin,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { listPublicDjs, type PublicDjProfile } from "@/lib/queries/directory";
import { computeCompleteness } from "@/lib/match/completeness";
import { getInitials, isSupabaseStorageUrl } from "@/lib/format";
import { SiteHeader, SiteFooter } from "@/components/public/site-chrome";
import { Reveal } from "@/components/public/landing/reveal";

/**
 * Landing público /bookers — página de venta para organizadores/venues/productoras
 * (NO para DJs). Se llega por: tarjeta "Booker" del Role Picker (/#perfiles),
 * link directo compartible, SEO ("contratar DJ", "DJ para tu evento/matrimonio")
 * y footer. Mismo sistema de diseño que el landing raíz (SiteHeader/Footer,
 * Reveal, tokens dark, Anton para titulares, mono para labels, tuteo chileno).
 *
 * Decisión firme: para el booker, crear cuenta y contratar DJs es GRATIS, siempre,
 * y sin comisión. CTA → /signup/booker.
 */

export const metadata: Metadata = {
  title: "Contrata DJs en Chile — directo, gratis y sin comisión · DROP.",
  description:
    "Encuentra y contrata al DJ ideal para tu evento, matrimonio o fiesta. Busca por ciudad, género y presupuesto, escucha sus sets y habla directo con el DJ. Gratis, sin comisión, sin intermediarios.",
  openGraph: {
    title: "Contrata DJs en Chile — directo, gratis y sin comisión · DROP.",
    description:
      "Encuentra al DJ ideal para tu evento. Busca, escucha sets y contrata directo. Gratis y sin comisión.",
    type: "website",
    url: "/bookers",
    siteName: "DROP.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DROP. — Contrata DJs" }],
  },
  alternates: { canonical: "/bookers" },
};

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

export default async function BookersLandingPage() {
  // Tira de DJs reales (misma lectura cacheada que el landing), priorizando los
  // perfiles más completos con foto.
  const allDjs = await listPublicDjs({});
  const hasPhoto = (d: PublicDjProfile) =>
    isSupabaseStorageUrl(d.avatar_url) || isSupabaseStorageUrl(d.hero_image_url);
  const destacados = [...allDjs]
    .map((d) => ({
      d,
      score: computeCompleteness(d).percent,
      photo: hasPhoto(d) ? 1 : 0,
      ts: d.created_at ? new Date(d.created_at).getTime() : 0,
    }))
    .sort((a, b) => b.score - a.score || b.photo - a.photo || b.ts - a.ts)
    .slice(0, 8)
    .map((x) => x.d);

  return (
    <main className="bg-bg text-fg">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 120% at 50% -10%, rgb(var(--drop-orange) / 0.20), transparent 55%)",
          }}
        />
        <div className="relative max-w-[1140px] mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            — Para bookers, venues y productoras
          </div>
          <h1
            className="mt-4 mx-auto text-balance max-w-[16ch]"
            style={{ fontFamily: ANTON, fontSize: "clamp(38px,7vw,72px)", lineHeight: 0.92 }}
          >
            Contrata al DJ ideal para tu evento<span className="text-accent">.</span>
          </h1>
          <p className="mt-5 mx-auto max-w-[620px] text-[16px] md:text-[18px] text-fg-muted">
            Directo, gratis y sin comisión. Busca por ciudad, género y presupuesto,
            escucha sus sets y habla con el DJ sin intermediarios — para tu fiesta,
            matrimonio o evento corporativo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3.5 justify-center">
            <Link
              href="/signup/booker"
              className="inline-flex items-center gap-2 h-[52px] px-7 rounded-[12px] font-mono text-[12px] font-bold uppercase tracking-[0.07em] bg-accent text-ink border border-accent transition-all hover:brightness-110 shadow-[0_6px_24px_-10px_rgb(var(--drop-orange)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Crear cuenta gratis →
            </Link>
            <Link
              href="/dj"
              className="inline-flex items-center gap-2 h-[52px] px-7 rounded-[12px] font-mono text-[12px] font-bold uppercase tracking-[0.07em] hos-glass text-fg transition-colors hover:border-border-strong"
            >
              Ver DJs
            </Link>
          </div>
          <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            Gratis, siempre · Sin comisión · Sin tarjeta
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA — 2 caminos */}
      <section className="scroll-mt-[78px] pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal className="mb-10 max-w-[620px]">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              — Cómo funciona
            </div>
            <h2
              className="mt-2.5 text-balance"
              style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}
            >
              Dos caminos para llegar a tu DJ.
            </h2>
            <p className="text-fg-muted mt-3.5 text-[15px]">
              Tú eliges: buscas y contactas al toque, o publicas tu evento y dejas que
              los DJs te lleguen.
            </p>
          </Reveal>
          <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PathCard
              icon={Search}
              tag="Camino 1"
              title="Busca y contacta directo"
              steps={[
                ["Explora el directorio", "Filtra por ciudad, género, disponibilidad y presupuesto."],
                ["Escucha sus sets", "SoundCloud y YouTube embebidos en cada press kit."],
                ["Envía una solicitud", "El DJ te cotiza directo. Sin compromiso, sin comisión."],
              ]}
            />
            <PathCard
              icon={Megaphone}
              tag="Camino 2"
              title="Publica una convocatoria"
              steps={[
                ["Cuenta tu evento", "Fecha, ciudad, género y presupuesto en un brief corto."],
                ["Recibe postulaciones", "Los DJs que calzan te postulan con su propuesta."],
                ["Elige y coordina", "Comparas perfiles y cierras con el que más te cuadre."],
              ]}
            />
          </Reveal>
        </div>
      </section>

      {/* POR QUÉ DROP */}
      <section className="scroll-mt-[78px] pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal className="mb-10 max-w-[620px]">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              — Por qué DROP
            </div>
            <h2
              className="mt-2.5 text-balance"
              style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}
            >
              Todo para elegir bien, sin intermediarios.
            </h2>
          </Reveal>
          <Reveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {WHY.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* DIRECTORIO / DJs destacados */}
      {destacados.length > 0 && (
        <section className="pb-20 md:pb-[90px]">
          <div className="max-w-[1140px] mx-auto px-6">
            <Reveal className="mb-10 flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                  — La escena
                </div>
                <h2
                  className="mt-2.5"
                  style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}
                >
                  Algunos de los DJs en DROP.
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
              {destacados.map((dj, i) => (
                <DjCard key={dj.user_id} dj={dj} className={i >= 4 ? "max-md:hidden" : ""} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="scroll-mt-[78px] pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal className="mb-10 max-w-[620px]">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              — Preguntas
            </div>
            <h2
              className="mt-2.5"
              style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,52px)", lineHeight: 0.95 }}
            >
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

      {/* CTA final */}
      <section className="pb-20 md:pb-[90px]">
        <div className="max-w-[1140px] mx-auto px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[24px] hos-glass px-6 py-14 md:px-10 md:py-[60px] text-center">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(100% 140% at 50% 0%, rgb(var(--drop-orange) / 0.22), transparent 60%)" }}
              />
              <h2
                className="relative z-10 text-balance"
                style={{ fontFamily: ANTON, fontSize: "clamp(30px,5vw,54px)", lineHeight: 0.95 }}
              >
                Tu próximo evento suena mejor con el DJ correcto<span className="text-accent">.</span>
              </h2>
              <p className="relative z-10 text-fg-muted mt-3.5 mb-6">
                Crear tu cuenta es gratis y toma un minuto. Sin comisión, sin tarjeta.
              </p>
              <div className="relative z-10 flex flex-wrap gap-3.5 justify-center">
                <Link
                  href="/signup/booker"
                  className="inline-flex items-center gap-2 h-[50px] px-6 rounded-[12px] font-mono text-[12px] font-bold uppercase tracking-[0.07em] bg-accent text-ink border border-accent transition-all hover:brightness-110 shadow-[0_6px_24px_-10px_rgb(var(--drop-orange)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Crear cuenta gratis →
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

// ── Cómo funciona: tarjeta de un camino ──
function PathCard({
  icon: Icon,
  tag,
  title,
  steps,
}: {
  icon: LucideIcon;
  tag: string;
  title: string;
  steps: [string, string][];
}) {
  return (
    <div className="flex flex-col rounded-[16px] hos-glass p-6 md:p-7">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-[12px] bg-accent-soft border border-accent/30 shrink-0">
          <Icon className="w-5 h-5 text-accent" strokeWidth={1.6} aria-hidden />
        </span>
        <div>
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent">
            {tag}
          </div>
          <div className="uppercase" style={{ fontFamily: ANTON, fontSize: 24, lineHeight: 0.95 }}>
            {title}
          </div>
        </div>
      </div>
      <ol className="mt-5 flex flex-col gap-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="font-mono text-[11px] font-bold text-accent pt-0.5 shrink-0">
              0{i + 1}
            </span>
            <div>
              <div className="text-[14px] font-semibold text-fg">{t}</div>
              <div className="text-[13px] text-fg-muted mt-0.5 leading-snug">{d}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Por qué DROP: features ──
const WHY: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: BadgeCheck,
    title: "DJs verificados",
    desc: "Perfiles revisados por DROP. Contratas con confianza, no a ciegas.",
  },
  {
    icon: Filter,
    title: "Filtros que sirven",
    desc: "Ciudad, género, presupuesto y disponibilidad. Encuentra el calce exacto.",
  },
  {
    icon: Headphones,
    title: "Escucha antes de decidir",
    desc: "Sets de SoundCloud y YouTube en cada press kit. Sabes cómo suena.",
  },
  {
    icon: MessageSquare,
    title: "Contacto directo",
    desc: "Hablas con el DJ sin intermediarios. Él te cotiza, tú decides.",
  },
  {
    icon: Wallet,
    title: "Sin comisión",
    desc: "Los pagos van directo entre tú y el DJ. DROP no se mete al medio.",
  },
  {
    icon: MapPin,
    title: "Gratis, siempre",
    desc: "Crear cuenta, buscar y contratar DJs no tiene costo. Nunca.",
  },
];

function FeatureCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="rounded-[14px] hos-glass p-5">
      <Icon className="w-6 h-6 text-accent" strokeWidth={1.5} aria-hidden />
      <div className="mt-3 text-[15px] font-semibold text-fg">{title}</div>
      <p className="mt-1.5 text-[13px] text-fg-muted leading-snug">{desc}</p>
    </div>
  );
}

// ── FAQ bookers ──
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Cuánto cuesta para el booker?",
    a: (
      <>
        <b>Nada.</b> Crear tu cuenta, buscar DJs y contratarlos es <b>gratis, siempre</b>.
        Tampoco cobramos comisión por booking.
      </>
    ),
  },
  {
    q: "¿Cómo contacto a un DJ?",
    a: (
      <>
        Lo buscas en el directorio, escuchas sus sets y le envías una <b>solicitud</b>.
        El DJ te <b>cotiza directo</b>, sin compromiso.
      </>
    ),
  },
  {
    q: "¿DROP cobra comisión sobre lo que pago?",
    a: (
      <>
        No. Los pagos van <b>directo entre tú y el DJ</b>. DROP no participa de la
        transacción ni cobra un porcentaje.
      </>
    ),
  },
  {
    q: "¿Qué es una convocatoria?",
    a: (
      <>
        Es publicar tu evento (fecha, ciudad, género, presupuesto) para que los DJs que
        calzan <b>te postulen</b>. Ideal si prefieres que te lleguen opciones en vez de
        buscar una por una.
      </>
    ),
  },
  {
    q: "¿Necesito verificar mi cuenta?",
    a: (
      <>
        Para <b>buscar y contactar</b> DJs, no. Para <b>publicar convocatorias</b> pedimos
        una verificación rápida — así los DJs saben que la oportunidad es real.
      </>
    ),
  },
  {
    q: "¿Los DJs están verificados?",
    a: (
      <>
        Sí. DROP revisa los perfiles de los DJs antes de mostrarlos como <b>verificados</b> en
        el directorio.
      </>
    ),
  },
];

// ── Card compacta de DJ para el preview del directorio ──
function DjCard({ dj, className = "" }: { dj: PublicDjProfile; className?: string }) {
  const initials = getInitials(dj.artist_name);
  const cardImg = [dj.avatar_url, dj.hero_image_url].find(isSupabaseStorageUrl) ?? "";
  return (
    <Link
      href={`/p/${dj.public_slug}`}
      className={`group relative block aspect-[3/4] rounded-[14px] overflow-hidden hos-glass transition-[transform,box-shadow] duration-300 hover:scale-[1.04] hover:z-10 hover:shadow-[0_24px_60px_-22px_rgb(var(--drop-orange)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
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
