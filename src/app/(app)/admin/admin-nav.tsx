"use client";

/**
 * Barra de navegación del admin — fija en TODAS las páginas del backoffice.
 * Resalta la sección actual. Reemplaza la dependencia del botón "atrás".
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const SECTIONS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Usuarios", exact: true },
  { href: "/admin/trafico", label: "Tráfico" },
  { href: "/admin/beta-requests", label: "Solicitudes" },
  { href: "/admin/bookers", label: "Bookers" },
  { href: "/admin/founding-invites", label: "★ Founding" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/email-campaigns", label: "Campañas" },
  { href: "/admin/bajas", label: "Bajas" },
  { href: "/admin/correo", label: "Correo" },
  { href: "/admin/beta-reminder", label: "Recordatorio" },
  { href: "/admin/onboarding-nudge", label: "Nudge" },
];

export function AdminNav() {
  const pathname = usePathname();
  const current =
    SECTIONS.find((s) =>
      s.exact ? pathname === s.href : pathname.startsWith(s.href)
    ) ?? SECTIONS[0];

  return (
    <div className="bg-ink border-b-2 border-orange">
      <div className="max-w-7xl mx-auto">
        {/* fila superior: volver a la app + breadcrumb */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 pt-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange hover:text-cream transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la app
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-cream/50">
            Backoffice <span className="text-cream/30">›</span>{" "}
            <span className="text-cream">{current.label}</span>
          </div>
        </div>
        {/* pestañas */}
        <nav className="flex gap-0 px-2 md:px-4 overflow-x-auto">
          {SECTIONS.map((s) => {
            const active = s.exact
              ? pathname === s.href
              : pathname.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3.5 py-3 border-b-[3px] transition-colors ${
                  active
                    ? "bg-orange text-ink border-ink"
                    : "text-cream/60 border-transparent hover:text-cream"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
