import Link from "next/link";
import {
  listMyFavorites,
  listFollowFeed,
  markFollowFeedRead,
  type FeedUpdate,
} from "@/lib/queries/booker";
import { Plus, Bell, BellOff, Heart } from "lucide-react";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Sprint RA-3 Fase 4 — Feed de updates de los DJs seguidos.
 *
 * Renombrada de /booker/favoritos. Muestra primero los updates
 * recientes (events) de los DJs en booker_favorites, con borde naranja
 * en los no leídos. Debajo, la grilla de DJs seguidos (lo que era el
 * /booker/favoritos anterior).
 *
 * Al cargar la página marcamos last_read_at de todos los follows del
 * booker → la próxima visita no muestra estas como "no leídas".
 */
export default async function BookerSeguidosPage() {
  const [feed, favorites] = await Promise.all([
    listFollowFeed(),
    listMyFavorites(),
  ]);
  // Marca como leído (después de capturar el feed para que el render
  // actual muestre el borde naranja en updates nuevos).
  await markFollowFeedRead();

  const unreadCount = feed.filter((f) => f.unread).length;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="border-2 border-ink bg-white p-6 md:p-7 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — DJS QUE SIGUES
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-3 justify-between">
          <h1
            className="leading-none"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "56px",
              letterSpacing: "-0.005em",
            }}
          >
            SEGUIDOS<span className="text-orange">.</span>
          </h1>
          <Link
            href="/dj"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-cream font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors"
          >
            <Plus className="w-4 h-4" />
            Sumar DJs
          </Link>
        </div>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Updates recientes de los DJs que sigues + tu listado completo abajo.
          Activa los avisos por email desde cada perfil para recibir un correo
          cuando publiquen disponibilidad o agenden shows.
        </p>
      </div>

      {/* Feed de updates */}
      {feed.length > 0 ? (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-orange">
              — Updates recientes
            </h2>
            {unreadCount > 0 && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange text-ink border-2 border-orange">
                {unreadCount} nuevo{unreadCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {feed.map((u) => (
              <UpdateCard key={u.event_id} update={u} />
            ))}
          </div>
        </section>
      ) : favorites.length > 0 ? (
        <div className="mb-10 border-2 border-dashed border-ink/30 bg-cream p-6 text-center">
          <Bell className="w-6 h-6 mx-auto text-fg-muted mb-2" />
          <p className="text-sm text-fg-muted">
            Todavía no hay novedades de los DJs que sigues.
            <br className="hidden sm:block" />
            Te avisamos cuando publiquen disponibilidad o agenden shows.
          </p>
        </div>
      ) : null}

      {/* Grilla de DJs (todos los seguidos) */}
      {favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <section>
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
            — Todos los DJs que sigues ({favorites.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((dj) => (
              <Link
                key={dj.dj_user_id}
                href={`/p/${dj.public_slug}`}
                className="group border-2 border-ink bg-white overflow-hidden hover:bg-cream/40 transition-colors"
              >
                {dj.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dj.hero_image_url}
                    alt={dj.artist_name}
                    className="w-full aspect-[4/3] object-cover border-b-2 border-ink"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-ink text-orange flex items-center justify-center border-b-2 border-ink">
                    <span
                      style={{
                        fontFamily:
                          "var(--font-anton), Impact, system-ui, sans-serif",
                        fontSize: "56px",
                        lineHeight: 0.85,
                      }}
                    >
                      {(dj.artist_name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="p-3">
                  <div
                    className="text-ink truncate"
                    style={{
                      fontFamily:
                        "var(--font-anton), Impact, system-ui, sans-serif",
                      fontSize: "22px",
                      lineHeight: 0.95,
                    }}
                  >
                    {dj.artist_name}
                  </div>
                  <div className="font-mono text-[10px] text-fg-muted uppercase tracking-wider mt-1">
                    {dj.city || "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function UpdateCard({ update }: { update: FeedUpdate }) {
  const { title, detail } = formatUpdate(update);
  return (
    <Link
      href={`/p/${update.public_slug}`}
      className={`grid grid-cols-[56px_1fr_auto] items-start gap-3 p-3 transition-colors hover:bg-cream/60 ${
        update.unread
          ? "bg-cream border-2 border-orange"
          : "bg-white border-2 border-ink"
      }`}
    >
      {/* Avatar */}
      <div className="w-[56px] h-[56px] rounded-full overflow-hidden bg-ink flex items-center justify-center shrink-0">
        {update.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={update.avatar_url}
            alt={update.artist_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="text-orange"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "28px",
              lineHeight: 0.85,
            }}
          >
            {update.artist_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {/* Body */}
      <div className="min-w-0">
        <div
          className="text-ink truncate"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "20px",
            lineHeight: 1,
          }}
        >
          {update.artist_name}
        </div>
        <div className="text-sm text-ink mt-1">
          <span className="text-orange font-bold">{title}</span>
          {detail && <span className="text-fg-muted"> · {detail}</span>}
        </div>
      </div>
      {/* Meta column */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
          {update.unread && <span className="text-orange mr-1">●</span>}
          {relativeTime(update.created_at)}
        </div>
        {update.notify_email ? (
          <span title="Avisos por email activos" className="text-orange">
            <Bell className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span title="Avisos por email desactivados" className="text-fg-subtle">
            <BellOff className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </Link>
  );
}

function formatUpdate(u: FeedUpdate): { title: string; detail: string } {
  if (u.type === "show_scheduled") {
    const p = u.payload as { title?: string; event_date?: string | null };
    const fechaIso = p.event_date;
    let fecha = "";
    if (fechaIso) {
      try {
        fecha = new Date(fechaIso).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
        });
      } catch {
        fecha = fechaIso;
      }
    }
    const parts: string[] = [];
    if (p.title) parts.push(p.title);
    if (fecha) parts.push(fecha);
    return { title: "Agendó un show", detail: parts.join(" · ") };
  }
  const p = u.payload as {
    available_from?: string | null;
    available_until?: string | null;
    available_note?: string;
  };
  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
        })
      : "";
  const range = [fmt(p.available_from), fmt(p.available_until)]
    .filter(Boolean)
    .join(" → ");
  return {
    title: "Publicó disponibilidad",
    detail: range || p.available_note || "",
  };
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-ink/30 bg-cream p-12 text-center">
      <Heart className="w-10 h-10 mx-auto text-orange mb-3" />
      <h2 className="text-lg font-bold mb-1">Todavía no sigues a nadie</h2>
      <p className="text-sm text-fg-muted mb-4 max-w-md mx-auto">
        Cuando encuentres un DJ que te interese en el directorio o en un
        press kit, dale al corazón y activa los avisos por email para
        enterarte cuando publique disponibilidad o agende shows.
      </p>
      <Link
        href="/dj"
        className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-cream font-mono text-[11px] font-bold uppercase tracking-[0.14em] border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors"
      >
        <Plus className="w-4 h-4" />
        Ver directorio de DJs
      </Link>
    </div>
  );
}
