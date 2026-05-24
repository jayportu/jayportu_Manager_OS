"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/growth", label: "Growth", icon: TrendingUp },
  { href: "/plantillas", label: "Plantillas", icon: FileText },
  { href: "/mas", label: "Más", icon: MoreHorizontal },
];

/**
 * DROP. — Bottom nav mobile (Type Beat).
 * Bg INK con borde superior 2px ORANGE. Item activo en bloque ORANGE.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-ink border-t-2 border-orange flex z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        height: "calc(4rem + env(safe-area-inset-bottom))",
      }}
    >
      {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-1 transition-colors border-r border-[#1a1a1a] last:border-r-0",
              isActive
                ? "bg-orange text-ink"
                : "text-[#888] hover:text-cream"
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span
              className="font-mono text-[9px] font-bold uppercase truncate max-w-full"
              style={{ letterSpacing: "0.04em" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
