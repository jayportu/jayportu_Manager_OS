import { getProfileBySlug } from "@/lib/queries/presskit";
import { getPublicLinks } from "@/lib/queries/link-in-bio";
import { BookingForm } from "@/app/p/[slug]/booking-form";
import { normalizeUrl } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";

/**
 * Fase 4 — Página pública Link-in-bio (`/l/{slug}`), mobile-first, tipo
 * Linktree. Reusa el perfil por slug del press kit y su BookingForm. Los links
 * activos vienen de `link_in_bio_links` (editor en /link-in-bio).
 */
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: "Link no encontrado" };
  const title = `${profile.artist_name} · Links`;
  const description =
    profile.bio_short ||
    profile.tagline ||
    `Escucha y contrata a ${profile.artist_name}.`;
  const ogImg = [profile.avatar_url, profile.hero_image_url].find(
    (u) => typeof u === "string" && u.startsWith("https://")
  );
  const images = ogImg
    ? [{ url: ogImg }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates: { canonical: `/l/${slug}` },
    openGraph: { title, description, type: "profile", url: `/l/${slug}`, images },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImg ? [ogImg] : ["/og.png"],
    },
  };
}

export default async function LinkInBioPublicPage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  const links = await getPublicLinks(profile.user_id);
  const initial = (profile.artist_name || "?").charAt(0).toUpperCase();
  const meta = [profile.genres?.slice(0, 2).join(" / "), profile.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="relative min-h-screen bg-bg text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(80% 40% at 50% -5%, rgba(232,90,12,0.28), transparent 60%), radial-gradient(70% 50% at 50% 105%, rgba(232,90,12,0.10), transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-[420px] px-5 py-12 text-center">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.artist_name}
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover mx-auto border border-white/15"
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full mx-auto bg-orange text-ink flex items-center justify-center"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: 44,
            }}
          >
            {initial}
          </div>
        )}

        <h1
          className="mt-3"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: 30,
            lineHeight: 0.95,
          }}
        >
          {profile.artist_name}
          <span className="text-orange">.</span>
        </h1>
        {meta && (
          <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-white/60">
            {meta}
          </div>
        )}
        {profile.bio_short && (
          <p className="mt-3 text-sm text-white/80 leading-relaxed">
            {profile.bio_short}
          </p>
        )}

        {/* Links activos */}
        <div className="mt-6 flex flex-col gap-2.5">
          {links.map((l, i) => (
            <a
              key={l.id}
              href={normalizeUrl(l.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={
                i === 0
                  ? "block w-full rounded-2xl px-4 py-4 text-center font-semibold text-ink transition-transform hover:-translate-y-0.5"
                  : "block w-full rounded-2xl border border-white/12 px-4 py-4 text-center font-semibold text-white/85 transition-transform hover:-translate-y-0.5"
              }
              style={
                i === 0
                  ? { background: "rgb(var(--drop-orange))", boxShadow: "6px 6px 16px rgba(0,0,0,.5)" }
                  : { background: "rgba(255,255,255,.06)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }
              }
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Contrátame → formulario de booking (cae al CRM) */}
        <div className="mt-6 text-left">
          <BookingForm userId={profile.user_id} artistName={profile.artist_name} />
        </div>

        <Link
          href={`/p/${slug}`}
          className="mt-5 inline-flex items-center gap-1 text-white/60 hover:text-white text-sm"
        >
          Ver press kit completo <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        <div className="mt-8 font-mono text-[9px] uppercase tracking-[0.1em] text-white/30">
          DROP<span className="text-orange">.</span> · The DJ OS
        </div>
      </div>
    </main>
  );
}
