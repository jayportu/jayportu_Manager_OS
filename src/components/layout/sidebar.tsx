"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Search,
  Calendar,
  Image as ImageIcon,
  FileText,
  Sparkles,
  TrendingUp,
  Settings,
  Mail,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/descubrir", label: "Descubrir", icon: Search },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
  { href: "/calendario", label: "Calendario", icon: Calendar },
  { href: "/press-kit", label: "Press kit", icon: ImageIcon },
  { href: "/plantillas", label: "Plantillas", icon: FileText },
  { href: "/gmail", label: "Gmail", icon: Mail },
  { href: "/growth", label: "Growth", icon: TrendingUp },
  { href: "/ia", label: "IA · Strategy", icon: Sparkles },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

interface SidebarProps {
  userEmail?: string;
  isAdmin?: boolean;
}

export function Sidebar({ userEmail, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-bg-subtle border-r border-border p-4">
      {/* Logo */}
      <div className="px-3 py-2 mb-6 flex flex-col items-center">
        <Logo variant="stacked" tone="light" size={140} priority />
        <div className="text-[10px] uppercase tracking-widest text-fg-subtle mt-1">
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

        {isAdmin && (
          <>
            <div className="my-2 mx-3 h-px bg-border" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-bg-panel text-accent border-l-2 border-accent pl-[10px]"
                  : "text-fg-muted hover:bg-bg-panel hover:text-accent"
              )}
            >
              <Shield className="w-[18px] h-[18px] shrink-0" />
              <span>Admin</span>
            </Link>
          </>
        )}
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
