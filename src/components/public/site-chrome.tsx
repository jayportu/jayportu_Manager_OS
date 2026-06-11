import Link from "next/link";

/**
 * Header + footer públicos, compartidos entre el landing (/) y /eventos.
 * Los links de sección apuntan a anclas root-relative (/#…) → funcionan tanto
 * desde el landing (scroll) como desde /eventos (navega al landing y baja).
 */

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-ink border-b-2 border-orange">
      <div className="max-w-[1140px] mx-auto px-6 h-[62px] flex items-center gap-6">
        <Link href="/" className="text-cream" style={{ fontFamily: ANTON, fontSize: 28, lineHeight: 0.85 }}>
          DROP<span className="text-orange">.</span>
        </Link>
        <nav className="hidden md:flex gap-6 ml-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
          <Link href="/dj" className="text-cream/70 hover:text-orange transition-colors">Buscar DJs</Link>
          <Link href="/eventos" className="text-cream/70 hover:text-orange transition-colors">Eventos</Link>
          <Link href="/#conexion" className="text-cream/70 hover:text-orange transition-colors">Cómo funciona</Link>
          <Link href="/#incluye" className="text-cream/70 hover:text-orange transition-colors">Para DJs</Link>
        </nav>
        <div className="flex-1" />
        <span className="hidden md:inline font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">THE DJ OS</span>
        <Link href="/login" className="px-4 py-2 bg-orange text-ink border-2 border-ink font-mono text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-ink hover:text-orange transition-colors">
          Entrar
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-cream border-t-2 border-orange">
      <div className="max-w-[1140px] mx-auto px-6 py-14">
        <p style={{ fontFamily: ANTON, fontSize: 38, lineHeight: 0.92, maxWidth: "18ch" }}>
          Hecho por la escena, <span className="text-fg-subtle">para la escena.</span>
        </p>
        <div className="flex gap-12 flex-wrap mt-8">
          <FootCol title="Explorar" links={[["Buscar DJs", "/dj"], ["Eventos", "/eventos"], ["Cómo funciona", "/#conexion"]]} />
          <FootCol title="Para ti" links={[["Soy DJ", "/beta"], ["Soy booker", "/signup/booker"], ["Entrar", "/login"]]} />
          <FootCol title="drop." links={[["Privacidad", "/privacy"], ["Términos", "/terms"], ["hola@dropgigs.com", "mailto:hola@dropgigs.com"]]} />
          <div className="flex-1" />
          <FootCol title="Síguenos" links={[["@drop.gigs", "https://instagram.com/drop.gigs"]]} />
        </div>
        <div className="mt-10 pt-5 border-t border-[#2a2a2a] font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle flex gap-3 flex-wrap items-center">
          <span style={{ fontFamily: ANTON, fontSize: 22 }}>DROP<span className="text-orange">.</span></span>
          <span>— The DJ OS · © 2026 · dropgigs.com</span>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/60 mb-3">{title}</h4>
      {links.map(([label, href]) => (
        <a key={label} href={href} className="block font-mono text-[11px] uppercase tracking-[0.06em] text-cream/70 py-1 hover:text-orange transition-colors">{label}</a>
      ))}
    </div>
  );
}
