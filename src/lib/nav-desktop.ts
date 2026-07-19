import { LayoutDashboard, User, Briefcase, CalendarDays, LayoutGrid, type LucideIcon } from "lucide-react";
import type { NavGroup, NavItem } from "@/lib/nav-config";

export type TopKey = "dashboard" | "perfil" | "negocio" | "agenda" | "mas";

export interface TopBucket {
  key: TopKey;
  label: string;
  icon: LucideIcon;
  direct?: NavItem;
  items: NavItem[];
  sections?: { section: string | null; items: NavItem[] }[];
}

const SECTION_TO_KEY: Record<string, TopKey> = {
  PERFIL: "perfil", NEGOCIO: "negocio", AGENDA: "agenda",
  "PRODUCCIÓN": "mas", AYUDA: "mas", SISTEMA: "mas",
};
const META: Record<TopKey, { label: string; icon: LucideIcon }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  perfil: { label: "Perfil", icon: User },
  negocio: { label: "Negocio", icon: Briefcase },
  agenda: { label: "Agenda", icon: CalendarDays },
  mas: { label: "Más", icon: LayoutGrid },
};

export function buildDesktopNav(groups: NavGroup[]): TopBucket[] {
  const order: TopKey[] = ["dashboard", "perfil", "negocio", "agenda", "mas"];
  const byKey = new Map<TopKey, TopBucket>();
  for (const key of order) byKey.set(key, { key, ...META[key], items: [] });

  for (const g of groups) {
    if (!g.section) { // bloque suelto arriba = Dashboard directo
      const d = byKey.get("dashboard")!;
      d.direct = g.items[0];
      continue;
    }
    const key = SECTION_TO_KEY[g.section] ?? "mas";
    const b = byKey.get(key)!;
    b.items.push(...g.items);
    if (key === "mas") (b.sections ??= []).push({ section: g.section, items: g.items });
  }
  return order.map((k) => byKey.get(k)!).filter((b) => b.direct || b.items.length > 0);
}

function itemMatches(href: string, pathname: string): boolean {
  if (href.includes("#")) return false;
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function activeTopKey(buckets: TopBucket[], pathname: string): TopKey {
  // Aplanamos primero a candidatos (key, href) y recién después reducimos:
  // mutar una variable capturada por un closure anidado (ver `consider(...)`
  // dentro del propio loop) dispara un falso "never" del control-flow
  // analysis de TS en modo strict al releer la variable tras la llamada.
  const candidates: { key: TopKey; href: string }[] = [];
  for (const b of buckets) {
    if (b.direct) candidates.push({ key: b.key, href: b.direct.href });
    for (const it of b.items) {
      candidates.push({ key: b.key, href: it.href });
      for (const c of it.children ?? []) candidates.push({ key: b.key, href: c.href });
    }
  }

  let best: { key: TopKey; len: number } | null = null;
  for (const { key, href } of candidates) {
    if (itemMatches(href, pathname) && (!best || href.length > best.len)) {
      best = { key, len: href.length };
    }
  }
  return best?.key ?? "dashboard";
}
