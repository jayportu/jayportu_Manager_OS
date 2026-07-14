import Link from "next/link";
import { List, CalendarDays, Wallet } from "lucide-react";
import { ClayChip } from "@/components/hos";

/**
 * Toggle Lista / Mes / Cobros del calendario (SSR, vía URL param `view`).
 * Segmented `ClayChip` envuelto en `<Link>` — SSR puro, sin "use client":
 * la navegación real ocurre por querystring, el chip solo aporta el look.
 */
export function CalendarViewToggle({
  current,
}: {
  current: "lista" | "mes" | "cobros";
}) {
  const items = [
    { key: "lista" as const, href: "/calendario", label: "Lista", Icon: List },
    { key: "mes" as const, href: "/calendario?view=mes", label: "Mes", Icon: CalendarDays },
    { key: "cobros" as const, href: "/calendario?view=cobros", label: "Cobros", Icon: Wallet },
  ];
  return (
    <div className="inline-flex items-center gap-2">
      {items.map(({ key, href, label, Icon }) => (
        <Link key={key} href={href} aria-current={current === key ? "page" : undefined}>
          <ClayChip active={current === key}>
            <span className="inline-flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </span>
          </ClayChip>
        </Link>
      ))}
    </div>
  );
}
