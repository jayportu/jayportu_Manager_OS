import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { isSupabaseStorageUrl } from "@/lib/format";
import type { FeedEvent } from "@/lib/queries/events";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

/** Partes de la fecha de un evento en hora de Chile, para la portada de la tarjeta. */
function dateParts(iso: string): { day: string; month: string; weekday: string; time: string } {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("es-CL", { timeZone: "America/Santiago", day: "2-digit" });
    const month = d
      .toLocaleDateString("es-CL", { timeZone: "America/Santiago", month: "short" })
      .replace(".", "")
      .toUpperCase();
    const weekday = d
      .toLocaleDateString("es-CL", { timeZone: "America/Santiago", weekday: "short" })
      .replace(".", "")
      .toUpperCase();
    const time = d.toLocaleTimeString("es-CL", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
    });
    return { day, month, weekday, time };
  } catch {
    return { day: "", month: "", weekday: "", time: "" };
  }
}

/**
 * Tarjeta de evento del feed público (landing + /eventos). Server, sin client JS.
 * Toda la tarjeta enlaza a la página pública del evento (/e/[token]) donde el fan
 * hace RSVP. Portada = hero/avatar del DJ con la fecha sobreimpresa.
 */
export function EventCard({ ev }: { ev: FeedEvent }) {
  const cover = [ev.dj_hero_url, ev.dj_avatar_url].find(isSupabaseStorageUrl) ?? "";
  const { day, month, weekday, time } = dateParts(ev.start_at);

  return (
    <Link
      href={`/e/${ev.public_token}`}
      className="group border-2 border-border bg-bg-panel flex flex-col hover:shadow-[6px_6px_0_#E85A0C] transition-all"
    >
      <div className="relative aspect-[3/2] bg-ink overflow-hidden border-b-2 border-border">
        {cover ? (
          <Image
            src={cover}
            alt={ev.dj_artist_name}
            fill
            sizes="(max-width:640px) 100vw, 360px"
            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            quality={85}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontFamily: ANTON, fontSize: 40, color: "#F4EFE7" }}>
              {ev.dj_artist_name}
              <span style={{ color: "#E85A0C" }}>.</span>
            </span>
          </div>
        )}
        {/* fecha sobreimpresa */}
        <div className="absolute top-0 left-0 bg-orange text-ink px-2.5 py-1.5 text-center leading-none">
          <div className="font-mono text-[9px] font-bold tracking-[0.1em]">{weekday}</div>
          <div style={{ fontFamily: ANTON, fontSize: 24 }}>{day}</div>
          <div className="font-mono text-[9px] font-bold tracking-[0.1em]">{month}</div>
        </div>
        {ev.going_count > 0 && (
          <span className="absolute bottom-2 right-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] bg-ink text-white px-2 py-0.5">
            {ev.going_count} {ev.going_count === 1 ? "va" : "van"}
          </span>
        )}
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-orange truncate">
          {ev.dj_artist_name}
        </div>
        <h3 className="mt-1 leading-tight" style={{ fontFamily: ANTON, fontSize: 19 }}>
          {ev.title}
        </h3>
        <div className="mt-auto pt-3 flex items-center gap-1.5 font-mono text-[11px] text-fg-subtle">
          {ev.location ? (
            <>
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ev.location}</span>
            </>
          ) : (
            <span className="truncate">{time} hrs</span>
          )}
          <span className="ml-auto text-fg font-bold group-hover:text-orange transition-colors shrink-0">
            Ver →
          </span>
        </div>
      </div>
    </Link>
  );
}
