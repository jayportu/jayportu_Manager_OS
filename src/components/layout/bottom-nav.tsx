"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/oportunidades", label: "Opps", icon: Briefcase },
  { href: "/plantillas", label: "Plantillas", icon: FileText },
  { href: "/mas", label: "Más", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-bg-subtle border-t border-border flex z-50"
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
              "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
              isActive ? "text-accent" : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
