import Link from "next/link";
import { Menu, ChevronDown } from "lucide-react";
import { hasUpcomingPublicEvents } from "@/lib/queries/events";

/**
 * Header + footer públicos, compartidos entre el landing (/) y /eventos.
 * Los links de sección apuntan a anclas root-relative (/#…) → funcionan tanto
 * desde el landing (scroll) como desde /eventos (navega al landing y baja).
 */

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";
const SATOSHI = "var(--font-satoshi), system-ui, sans-serif";

/** Links del nav (compartidos entre desktop y el menú móvil). */
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/dj", label: "Buscar DJs" },
  { href: "/eventos", label: "Eventos" },
  { href: "/#conexion", label: "Cómo funciona" },
  { href: "/#incluye", label: "Para DJs" },
];

/**
 * Perfiles del CTA "Elige tu perfil". DJ es el único activo (→ /beta); el resto
 * baja a la sección #perfiles del landing, donde se muestran como "próximamente".
 */
const PROFILE_LINKS: { label: string; href: string; available?: boolean }[] = [
  { label: "DJ", href: "/beta", available: true },
  { label: "Booker", href: "/#perfiles" },
  { label: "Fotógrafo", href: "/#perfiles" },
  { label: "Audiovisual", href: "/#perfiles" },
];

export async function SiteHeader() {
  // UX: "Eventos" solo se muestra si hay eventos publicados (si no, lleva a una
  // página vacía). Vuelve solo al publicarse el primero.
  const showEvents = await hasUpcomingPublicEvents();
  const navLinks = showEvents
    ? NAV_LINKS
    : NAV_LINKS.filter((l) => l.href !== "/eventos");
  return (
    <header className="sticky top-0 z-50 bg-ink border-b-2 border-orange">
      <div className="max-w-[1140px] mx-auto px-6 h-[62px] flex items-center gap-6">
        <Link href="/" className="text-white" style={{ fontFamily: SATOSHI, fontWeight: 900, fontSize: 28, lineHeight: 0.9, letterSpacing: "-0.02em" }}>
          DROP<span className="text-orange" style={{ marginLeft: "-0.06em" }}>.</span>
        </Link>
        <nav className="hidden md:flex gap-6 ml-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-white/70 hover:text-orange transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        {/* "Entrar" degradado a link (es para usuarios que vuelven, no
            adquisición); el CTA fuerte es "Elige tu perfil". */}
        <Link href="/login" className="hidden md:inline font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/70 hover:text-orange transition-colors">
          Entrar
        </Link>
        {/* Menú móvil (sin JS): <details> como disclosure. Se cierra solo al
            navegar porque cada página re-renderiza el header. */}
        <details className="md:hidden relative">
          <summary
            className="list-none [&::-webkit-details-marker]:hidden cursor-pointer p-1.5 -mr-1 text-white"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </summary>
          <div className="absolute right-0 top-[calc(100%+1px)] z-50 min-w-[190px] bg-ink border-2 border-orange flex flex-col">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-white/80 hover:bg-orange hover:text-ink border-b border-cream/10 last:border-b-0 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-white/80 hover:bg-orange hover:text-ink border-t border-orange/40 transition-colors"
            >
              Entrar
            </Link>
          </div>
        </details>
        {/* CTA "Elige tu perfil" — desplegable sin JS (<details>, mismo patrón
            que el menú móvil). DJ → /beta; los demás bajan a #perfiles, que los
            muestra como "próximamente". */}
        <details className="relative group">
          <summary
            className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2 bg-orange text-ink border-2 border-border font-mono text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-ink hover:text-orange group-open:bg-ink group-open:text-orange transition-colors"
            aria-label="Elegir perfil"
          >
            <span className="hidden sm:inline">Elige tu perfil</span>
            <span className="sm:hidden">Perfil</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 top-[calc(100%+2px)] z-50 min-w-[230px] bg-ink border-2 border-orange flex flex-col">
            {PROFILE_LINKS.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="group/item flex items-center justify-between gap-4 px-4 py-3 border-b border-cream/10 last:border-b-0 hover:bg-orange transition-colors"
              >
                <span className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-white/85 group-hover/item:text-ink">
                  {p.label}
                </span>
                <span
                  className={`font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${
                    p.available
                      ? "text-orange group-hover/item:text-ink"
                      : "text-white/40 group-hover/item:text-ink/70"
                  }`}
                >
                  {p.available ? "Empezar →" : "Próximamente"}
                </span>
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const showEvents = await hasUpcomingPublicEvents();
  const explorar: [string, string][] = [
    ["Buscar DJs", "/dj"],
    ...(showEvents ? ([["Eventos", "/eventos"]] as [string, string][]) : []),
    ["Cómo funciona", "/#conexion"],
  ];
  return (
    <footer className="bg-ink text-white border-t-2 border-orange">
      <div className="max-w-[1140px] mx-auto px-6 py-14">
        <p style={{ fontFamily: ANTON, fontSize: 38, lineHeight: 0.92, maxWidth: "18ch" }}>
          Hecho por la escena, <span className="text-fg-subtle">para la escena.</span>
        </p>
        <div className="flex gap-12 flex-wrap mt-8">
          <FootCol title="Explorar" links={explorar} />
          <FootCol title="Para ti" links={[["Soy DJ", "/beta"], ["Soy booker", "/#perfiles"], ["Entrar", "/login"]]} />
          <FootCol title="drop." links={[["Privacidad", "/privacy"], ["Términos", "/terms"], ["hola@dropgigs.com", "mailto:hola@dropgigs.com"]]} />
          <div className="flex-1" />
          <FootCol title="Síguenos" links={[["@drop.gigs", "https://instagram.com/drop.gigs"]]} />
        </div>
        <div className="mt-10 pt-5 border-t border-[#2a2a2a] font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle flex gap-3 flex-wrap items-center">
          <span style={{ fontFamily: SATOSHI, fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>DROP<span className="text-orange" style={{ marginLeft: "-0.06em" }}>.</span></span>
          <span>— The DJ OS · © 2026 · dropgigs.com</span>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 mb-3">{title}</h2>
      {links.map(([label, href]) => (
        <a key={label} href={href} className="block font-mono text-[11px] uppercase tracking-[0.06em] text-white/70 py-1 hover:text-orange transition-colors">{label}</a>
      ))}
    </div>
  );
}
