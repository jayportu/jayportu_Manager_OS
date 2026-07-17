"use client";

/**
 * Barra de navegación del admin — fija en TODAS las páginas del backoffice.
 * Resalta la sección actual. Reemplaza la dependencia del botón "atrás".
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Usuarios", exact: true },
  { href: "/admin/pulso", label: "Pulso" },
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
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
      <div className="hos-glass rounded-2xl border border-white/12 px-3 md:px-4 py-3">
        {/* fila superior: volver a la app + breadcrumb */}
        <div className="flex items-center justify-between gap-3 px-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange hover:text-fg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la app
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
            Backoffice <span className="text-fg-subtle">›</span>{" "}
            <span className="text-fg">{current.label}</span>
          </div>
        </div>
        {/* pestañas */}
        <nav
          aria-label="Secciones de admin"
          className="mt-2.5 flex gap-1 overflow-x-auto"
        >
          {SECTIONS.map((s) => {
            const active = s.exact
              ? pathname === s.href
              : pathname.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3.5 py-2 transition-colors",
                  active
                    ? "bg-[rgb(var(--drop-orange))] text-black"
                    : "text-white/60 hover:text-white"
                )}
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
