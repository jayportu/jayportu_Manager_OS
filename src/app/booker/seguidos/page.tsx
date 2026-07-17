import Link from "next/link";
import Image from "next/image";
import {
  listMyFavorites,
  listFollowFeed,
  markFollowFeedRead,
  type FeedUpdate,
} from "@/lib/queries/booker";
import { Plus, Bell, Heart } from "lucide-react";
import { relativeTime, isSupabaseStorageUrl } from "@/lib/format";
import { NotifyToggleIcon } from "@/components/booker/notify-toggle-icon";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Badge, EmptyState } from "@/components/hos";

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
      <GlassPanel padded={false} className="mb-6 p-6 md:p-7">
        <MonoLabel>DJS QUE SIGUES</MonoLabel>
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
          <Button asChild variant="clay">
            <Link href="/booker/buscar">
              <Plus className="w-4 h-4" />
              Sumar DJs
            </Link>
          </Button>
        </div>
        <p className="text-sm text-white/55 mt-2 max-w-xl">
          Updates recientes de los DJs que sigues + tu listado completo abajo.
          Activa los avisos por email desde cada perfil para recibir un correo
          cuando publiquen disponibilidad o agenden shows.
        </p>
      </GlassPanel>

      {/* Feed de updates */}
      {feed.length > 0 ? (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <MonoLabel>Updates recientes</MonoLabel>
            {unreadCount > 0 && (
              <Badge tone="warn" solid>
                {unreadCount} nuevo{unreadCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {feed.map((u) => (
              <UpdateCard key={u.event_id} update={u} />
            ))}
          </div>
        </section>
      ) : favorites.length > 0 ? (
        <div className="mb-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
          <Bell className="w-6 h-6 mx-auto text-white/40 mb-2" />
          <p className="text-sm text-white/55">
            Todavía no hay novedades de los DJs que sigues.
            <br className="hidden sm:block" />
            Te avisamos cuando publiquen disponibilidad o agenden shows.
          </p>
        </div>
      ) : null}

      {/* Grilla de DJs (todos los seguidos) */}
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Todavía no sigues a nadie"
          sub="Cuando encuentres un DJ que te interese en el directorio o en un press kit, dale al corazón y activa los avisos por email para enterarte cuando publique disponibilidad o agende shows."
          action={
            <Button asChild variant="clay" size="lg">
              <Link href="/booker/buscar">
                <Plus className="w-4 h-4" />
                Ver directorio de DJs
              </Link>
            </Button>
          }
        />
      ) : (
        <section>
          <MonoLabel className="mb-3 block">
            Todos los DJs que sigues ({favorites.length})
          </MonoLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((dj) => (
              <Link
                key={dj.dj_user_id}
                href={`/p/${dj.public_slug}`}
                className="group hos-glass hos-sweep-card rounded-2xl overflow-hidden transition-colors hover:border-white/30"
              >
                {isSupabaseStorageUrl(dj.hero_image_url) ? (
                  <div className="relative w-full aspect-[4/3] border-b border-white/10">
                    <Image
                      src={dj.hero_image_url}
                      alt={dj.artist_name}
                      fill
                      sizes="(max-width: 768px) 50vw, 320px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] bg-ink text-orange flex items-center justify-center border-b border-white/10">
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
                  <div className="flex items-start gap-2">
                    <div
                      className="text-white truncate flex-1"
                      style={{
                        fontFamily:
                          "var(--font-anton), Impact, system-ui, sans-serif",
                        fontSize: "22px",
                        lineHeight: 0.95,
                      }}
                    >
                      {dj.artist_name}
                    </div>
                    <span className="shrink-0 mt-0.5">
                      <NotifyToggleIcon
                        djUserId={dj.dj_user_id}
                        initial={dj.notify_email}
                      />
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-wider mt-1">
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
      className={`grid grid-cols-[56px_1fr_auto] items-start gap-3 p-3 rounded-2xl hos-glass hos-sweep-card transition-colors ${
        update.unread ? "border-orange" : "hover:border-white/30"
      }`}
    >
      {/* Avatar */}
      <div className="w-[56px] h-[56px] rounded-full overflow-hidden bg-ink flex items-center justify-center shrink-0">
        {update.avatar_url ? (
          <Image
            src={update.avatar_url}
            alt={update.artist_name}
            width={56}
            height={56}
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
          className="text-white truncate"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "20px",
            lineHeight: 1,
          }}
        >
          {update.artist_name}
        </div>
        <div className="text-sm text-white mt-1">
          <span className="text-orange font-bold">{title}</span>
          {detail && <span className="text-white/50"> · {detail}</span>}
        </div>
      </div>
      {/* Meta column */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">
          {update.unread && <span className="text-orange mr-1">●</span>}
          {relativeTime(update.created_at)}
        </div>
        <NotifyToggleIcon
          djUserId={update.dj_user_id}
          initial={update.notify_email}
        />
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
  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return ""; // evita "Invalid Date"
    return d.toLocaleDateString("es-CL", { day: "numeric", month: "long" });
  };
  const range = [fmt(p.available_from), fmt(p.available_until)]
    .filter(Boolean)
    .join(" → ");
  return {
    title: "Publicó disponibilidad",
    detail: range || p.available_note || "",
  };
}
