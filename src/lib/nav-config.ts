import {
  LayoutDashboard,
  Users,
  Compass,
  Megaphone,
  CalendarDays,
  FileImage,
  LayoutTemplate,
  Mail,
  TrendingUp,
  Settings,
  Building2,
  User,
  SlidersHorizontal,
  Link2,
  Share2,
  Ticket,
  ListChecks,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/**
 * DROP. — Fuente única de la nav del shell DJ.
 *
 * Consumida por `Sidebar` (desktop) y `MobileMenu` (drawer mobile) — antes
 * cada componente mantenía su propia copia de `NAV_GROUPS` con una
 * divergencia intencional (mobile omitía "Lugares" siempre, porque no
 * recibía `showLugares`). Hybrid OS D4: "Lugares" ahora se resuelve igual
 * en ambos, vía `filterNav(NAV_GROUPS, { showLugares })`.
 *
 * Items con `comingSoon: true` muestran badge "pronto" y la página interna
 * renderiza <ComingSoon /> en lugar de la UI real (beta cerrada).
 */

export interface NavChild {
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  children?: NavChild[];
  /** Clave de visibilidad resuelta por el consumidor con datos server-side. */
  visibleIf?: "showLugares";
}

export interface NavGroup {
  /** Cabecera de sección (mono, mayúsculas). Sin section = bloque suelto arriba. */
  section?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "PERFIL",
    items: [
      { href: "/perfil", label: "Perfil", icon: User },
      {
        href: "/press-kit",
        label: "Press kit",
        icon: FileImage,
        children: [
          { href: "/press-kit/stats", label: "Estadísticas" },
          // El inbox de bookings vive dentro de /press-kit (el índice
          // /press-kit/bookings redirige ahí). Apuntamos al padre.
          { href: "/press-kit", label: "Bookings" },
        ],
      },
      { href: "/redes", label: "Redes & Cuentas", icon: Share2 },
      { href: "/link-in-bio", label: "Link-in-bio", icon: Link2 },
    ],
  },
  {
    section: "NEGOCIO",
    items: [
      {
        href: "/crm",
        label: "CRM",
        icon: Users,
        children: [{ href: "/crm/recurrentes", label: "Recurrentes" }],
      },
      { href: "/descubrir", label: "Descubrir", icon: Compass },
      { href: "/campanas", label: "Campañas", icon: Megaphone },
      { href: "/gmail", label: "Correo", icon: Mail },
      { href: "/plantillas", label: "Plantillas", icon: LayoutTemplate },
      // "Lugares" se filtra si no hay venues verificados (ver filterNav).
      { href: "/lugares", label: "Lugares", icon: Building2, visibleIf: "showLugares" },
      { href: "/convocatorias", label: "Convocatorias", icon: Ticket },
    ],
  },
  {
    section: "AGENDA",
    items: [
      { href: "/calendario", label: "Calendario", icon: CalendarDays },
      {
        href: "/growth",
        label: "Growth",
        icon: TrendingUp,
        children: [
          { href: "/growth/posts", label: "Posts" },
          { href: "/growth/ads", label: "Ads" },
        ],
      },
      { href: "/tareas", label: "Tareas", icon: ListChecks },
    ],
  },
  {
    section: "PRODUCCIÓN",
    // Tech rider vive dentro de Configuración; lo surfaceamos con ancla directa.
    items: [
      { href: "/configuracion#tech-rider", label: "Tech rider", icon: SlidersHorizontal },
    ],
  },
  {
    section: "AYUDA",
    items: [{ href: "/soporte", label: "Soporte", icon: LifeBuoy }],
  },
  {
    section: "SISTEMA",
    items: [{ href: "/configuracion", label: "Configuración", icon: Settings }],
  },
];

/**
 * Filtra los grupos/ítems de nav según contexto de visibilidad. Hoy solo
 * resuelve `visibleIf: "showLugares"`; si un ítem lo declara y
 * `ctx.showLugares === false`, se oculta. Grupos que quedan sin items se
 * eliminan del resultado.
 */
export function filterNav(groups: NavGroup[], ctx: { showLugares: boolean }): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.visibleIf !== "showLugares" || ctx.showLugares
      ),
    }))
    .filter((group) => group.items.length > 0);
}
