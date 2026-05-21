"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Megaphone,
  Search,
  Calendar,
  Image as ImageIcon,
  FileText,
  Sparkles,
  BarChart3,
  Settings,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/oportunidades", label: "Oportunidades", icon: Briefcase },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
  { href: "/descubrir", label: "Descubrir", icon: Search },
  { href: "/calendario", label: "Calendario", icon: Calendar },
  { href: "/press-kit", label: "Press kit", icon: ImageIcon },
  { href: "/plantillas", label: "Plantillas", icon: FileText },
  { href: "/gmail", label: "Gmail", icon: Mail },
  { href: "/contenido", label: "Contenido", icon: Sparkles },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

interface SidebarProps {
  userEmail?: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-bg-subtle border-r border-border p-4">
      {/* Wordmark */}
      <div className="px-3 py-2 mb-6">
        <div className="wordmark text-3xl leading-none">
          <span className="block text-fg">JAY</span>
          <span className="block text-accent">PORTU</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-fg-subtle mt-2">
          Manager OS
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-bg-panel text-fg border-l-2 border-accent pl-[10px]"
                  : "text-fg-muted hover:bg-bg-panel hover:text-fg"
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User block */}
      <div className="mt-4 p-3 rounded-xl bg-bg-panel border border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-secondary border border-border-strong flex items-center justify-center text-sm font-bold">
          JP
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-fg truncate">
            Jay Portu
          </div>
          <div className="text-[10px] text-fg-muted truncate">
            {userEmail || "DJ · Santiago"}
          </div>
        </div>
      </div>
    </aside>
  );
}
