"use client";

/**
 * Top-bar para layout /booker/*. Cliente porque usa usePathname para highlight.
 * Brand DROP. brutalist. No usa el sidebar del DJ.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/coming-soon";
import { LogOut, Heart, Calendar, Inbox, Search, User, Star, Send, Target } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Inbox;
  comingSoon?: boolean;
}

const NAV: NavItem[] = [
  { href: "/booker/buscar", label: "Buscar DJs", icon: Search },
  { href: "/booker/match", label: "Smart Match", icon: Target },
  { href: "/booker/requests", label: "Mis requests", icon: Inbox },
  { href: "/booker/seguidos", label: "Seguidos", icon: Heart },
  { href: "/booker/pitches", label: "Pitches", icon: Send },
  { href: "/booker/interesados", label: "DJs interesados", icon: Star },
  { href: "/booker/perfil", label: "Mi perfil", icon: User },
  { href: "/booker/calendario", label: "Calendario", icon: Calendar, comingSoon: true },
];

interface Props {
  fullName: string;
  email: string;
}

export function BookerTopBar({ fullName, email }: Props) {
  const pathname = usePathname();
  const initial = (fullName || email || "B").trim().charAt(0).toUpperCase();

  return (
    <header className="bg-ink text-cream border-b-2 border-orange sticky top-0 z-40">
      <div className="px-4 md:px-6 py-3 flex items-center gap-4 md:gap-6 flex-wrap">
        {/* Logo */}
        <Link
          href="/booker/requests"
          className="select-none flex items-baseline gap-3 hover:opacity-90 transition-opacity"
        >
          <span
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "28px",
              lineHeight: 0.85,
            }}
          >
            DROP<span className="text-orange">.</span>
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-orange hidden sm:inline">
            BOOKER
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 md:gap-2 flex-1 min-w-0 overflow-x-auto">
          {NAV.map(({ href, label, icon: Icon, comingSoon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] border-2 transition-colors whitespace-nowrap",
                  active
                    ? "bg-orange text-ink border-orange"
                    : "border-transparent text-cream/80 hover:text-cream hover:border-cream/30"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
                {comingSoon && <ComingSoonBadge />}
              </Link>
            );
          })}
        </nav>

        {/* User card + logout */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-[#2a2a2a]">
            <div
              className="w-7 h-7 bg-orange text-ink flex items-center justify-center"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "16px",
              }}
            >
              {initial}
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="text-xs font-bold truncate max-w-[120px]">
                {fullName || "Booker"}
              </div>
              <div className="font-mono text-[9px] text-cream/50 truncate max-w-[120px]">
                {email}
              </div>
            </div>
          </div>
          <Link
            href="/logout"
            className="p-2 border-2 border-cream/20 hover:border-orange hover:text-orange transition-colors"
            aria-label="Salir"
            title="Salir"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
