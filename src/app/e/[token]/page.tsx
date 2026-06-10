import { getEventByToken } from "@/lib/queries/events";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Ticket, CalendarDays, ArrowUpRight } from "lucide-react";
import { isSupabaseStorageUrl } from "@/lib/format";
import { RsvpForm } from "./rsvp-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

function fmtDate(iso: string): string {
  try {
    const s = new Date(iso).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return "";
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const ev = await getEventByToken(token);
  if (!ev) return { title: "Evento no encontrado · DROP." };
  const when = fmtDate(ev.start_at);
  const desc = [ev.location, when].filter(Boolean).join(" · ");
  const img = isSupabaseStorageUrl(ev.dj_hero_url) ? ev.dj_hero_url : undefined;
  return {
    title: `${ev.title} · ${ev.dj_artist_name}`,
    description: desc || `Evento de ${ev.dj_artist_name}. RSVP en DROP.`,
    openGraph: {
      title: `${ev.title} · ${ev.dj_artist_name}`,
      description: desc,
      type: "website",
      images: img ? [{ url: img }] : undefined,
    },
  };
}

export default async function PublicEventPage({ params }: PageProps) {
  const { token } = await params;
  const ev = await getEventByToken(token);
  if (!ev) notFound();

  const when = fmtDate(ev.start_at);
  const heroImg = isSupabaseStorageUrl(ev.dj_hero_url)
    ? ev.dj_hero_url
    : isSupabaseStorageUrl(ev.dj_avatar_url)
    ? ev.dj_avatar_url
    : "";
  const mapsUrl = ev.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`
    : null;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Flyer / hero */}
        <div className="border-2 border-ink bg-ink text-cream overflow-hidden">
          <div className="relative aspect-[4/3] bg-ink border-b-2 border-orange">
            {heroImg ? (
              <Image
                src={heroImg}
                alt={ev.dj_artist_name}
                fill
                sizes="(max-width: 512px) 100vw, 512px"
                className="object-cover opacity-90"
                quality={85}
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span
                  style={{
                    fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                    fontSize: "72px",
                    color: "#FF5C00",
                  }}
                >
                  {(ev.dj_artist_name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange">
              — EVENTO
            </div>
            <h1
              className="leading-none mt-2"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "40px",
              }}
            >
              {ev.title}
            </h1>
            {ev.dj_public_slug ? (
              <Link
                href={`/p/${ev.dj_public_slug}`}
                className="inline-flex items-center gap-1 text-sm text-orange hover:underline mt-2"
              >
                {ev.dj_artist_name} <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="inline-block text-sm text-orange mt-2">
                {ev.dj_artist_name}
              </span>
            )}
          </div>
        </div>

        {/* Datos */}
        <div className="border-2 border-t-0 border-ink bg-white divide-y divide-ink/10">
          <div className="flex items-center gap-3 p-4">
            <CalendarDays className="w-5 h-5 text-orange shrink-0" />
            <span className="text-sm font-semibold">{when || "Fecha por confirmar"}</span>
          </div>
          {ev.location && (
            <a
              href={mapsUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 hover:bg-cream transition-colors"
            >
              <MapPin className="w-5 h-5 text-orange shrink-0" />
              <span className="text-sm flex-1">{ev.location}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                Cómo llegar →
              </span>
            </a>
          )}
          {ev.ticket_url && (
            <a
              href={ev.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 hover:bg-cream transition-colors"
            >
              <Ticket className="w-5 h-5 text-orange shrink-0" />
              <span className="text-sm flex-1 font-semibold">Comprar entradas</span>
              <ArrowUpRight className="w-4 h-4 text-fg-muted" />
            </a>
          )}
        </div>

        {ev.description && (
          <div className="border-2 border-t-0 border-ink bg-white p-4 text-sm text-fg whitespace-pre-wrap">
            {ev.description}
          </div>
        )}

        {/* Contador + RSVP */}
        <div className="mt-4">
          <RsvpForm
            token={ev.public_token}
            djArtistName={ev.dj_artist_name}
            initialCount={ev.going_count}
          />
        </div>

        <div className="text-center mt-6">
          <a
            href={SITE}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle hover:text-orange transition-colors"
          >
            vía DROP<span className="text-orange">.</span>
          </a>
        </div>
      </div>
    </div>
  );
}
