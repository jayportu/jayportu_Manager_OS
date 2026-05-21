/**
 * Helpers de formato compartidos.
 */

/** "hace 2 días" / "ayer" / "hoy" / "—" */
export function relativeTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffH < 24) return `hace ${diffH}h`;
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `hace ${diffD} días`;
  if (diffD < 30) return `hace ${Math.floor(diffD / 7)} sem`;
  if (diffD < 365) return `hace ${Math.floor(diffD / 30)} meses`;
  return `hace ${Math.floor(diffD / 365)} años`;
}

/** "JAY PORTU" → "JP" / "Club La Feria" → "CL" */
export function initials(name: string): string {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Color del badge según score */
export function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 80)
    return {
      bg: "bg-accent-soft border border-accent/30",
      text: "text-accent",
    };
  if (score >= 60)
    return {
      bg: "bg-success/15 border border-success/30",
      text: "text-success",
    };
  if (score >= 40)
    return {
      bg: "bg-warning/15 border border-warning/30",
      text: "text-warning",
    };
  return {
    bg: "bg-secondary border border-border",
    text: "text-fg-muted",
  };
}

/** Fecha humana corta: "22 May 2026" */
export function shortDate(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Fecha + hora corta: "22 May 23:00" */
export function dateTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "wa.me" link con número limpio + mensaje opcional */
export function whatsappLink(whatsapp: string, text?: string): string | null {
  if (!whatsapp) return null;
  const clean = whatsapp.replace(/\D/g, "");
  if (clean.length < 8) return null;
  const url = `https://wa.me/${clean}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}

/** Normalizar URL: agrega https:// si falta */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
