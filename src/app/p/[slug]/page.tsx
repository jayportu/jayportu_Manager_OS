import { getProfileBySlug } from "@/lib/queries/presskit";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { TrackBeacon } from "./track-beacon";
import { TrackedLink } from "./tracked-link";
import { BookingForm } from "./booking-form";
import { SoundcloudEmbed, YoutubeEmbed } from "./embeds";
import { PdfPressKit } from "./pdf-press-kit";
import { whatsappLink, normalizeUrl } from "@/lib/format";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: "Press kit no encontrado" };

  const title = `${profile.artist_name} — Press Kit`;
  const description =
    profile.bio_short ||
    profile.tagline ||
    `DJ ${profile.artist_name}, ${profile.genres.join(", ")} desde ${profile.city}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
  };
}

export default async function PresskitPublicPage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  // Modo PDF: el DJ subió un press kit propio. Mostramos el PDF tal cual
  // a pantalla completa, con botones flotantes mínimos para contacto.
  if (profile.press_kit_mode === "pdf" && profile.press_kit_pdf_url) {
    return (
      <>
        <TrackBeacon userId={profile.user_id} event="view" />
        <PdfPressKit
          pdfUrl={profile.press_kit_pdf_url}
          pdfFilename={profile.press_kit_pdf_filename}
          artistName={profile.artist_name || "DJ"}
          userId={profile.user_id}
          publicEmail={profile.public_email}
          whatsapp={profile.whatsapp}
        />
      </>
    );
  }

  const wa = whatsappLink(profile.whatsapp);
  const email = profile.public_email;
  const ig = profile.instagram_url;
  const sc = profile.soundcloud_url;
  const yt = profile.youtube_url;
  const sp = profile.spotify_url;
  const web = profile.website;

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Beacon: registra view al montar */}
      <TrackBeacon userId={profile.user_id} event="view" />

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="text-center mb-12 md:mb-16">
          <div className="flex justify-center mb-6">
            <Logo variant="stacked" tone="light" size={200} priority />
          </div>
          {profile.tagline && (
            <p className="text-lg md:text-xl text-fg-muted max-w-xl mx-auto">
              {profile.tagline}
            </p>
          )}
          <div className="flex justify-center mt-4 text-xs text-fg-subtle tracking-widest uppercase">
            {profile.city}
            {profile.country ? ` · ${profile.country}` : ""}
          </div>

          {/* Géneros */}
          {profile.genres.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-7">
              {profile.genres.map((g) => (
                <span
                  key={g}
                  className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1.5 bg-accent-soft border border-accent/30 text-accent rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {wa && (
              <TrackedLink
                href={wa}
                userId={profile.user_id}
                event="click_whatsapp"
                external
                className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                WhatsApp
              </TrackedLink>
            )}
            {email && (
              <TrackedLink
                href={`mailto:${email}`}
                userId={profile.user_id}
                event="click_email"
                className="inline-flex items-center justify-center h-11 px-5 rounded-md border border-border text-sm font-medium hover:bg-bg-panel transition-colors"
              >
                Email
              </TrackedLink>
            )}
            {ig && (
              <TrackedLink
                href={normalizeUrl(ig)}
                userId={profile.user_id}
                event="click_instagram"
                external
                className="inline-flex items-center justify-center h-11 px-5 rounded-md border border-border text-sm font-medium hover:bg-bg-panel transition-colors"
              >
                Instagram
              </TrackedLink>
            )}
          </div>
        </section>

        {/* ── About ────────────────────────────────────────── */}
        {(profile.bio_long || profile.bio_short) && (
          <section className="mb-12 md:mb-16">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-accent font-semibold mb-4">
              About
            </h2>
            <div className="text-base text-fg leading-relaxed whitespace-pre-wrap">
              {profile.bio_long || profile.bio_short}
            </div>
          </section>
        )}

        {/* ── Sets de SoundCloud ───────────────────────────── */}
        {sc && (
          <section className="mb-12 md:mb-16">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-accent font-semibold mb-4">
              Latest sets
            </h2>
            <SoundcloudEmbed
              url={sc}
              userId={profile.user_id}
              onClickEvent="click_soundcloud"
            />
          </section>
        )}

        {/* ── Videos YouTube ──────────────────────────────── */}
        {yt && (
          <section className="mb-12 md:mb-16">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-accent font-semibold mb-4">
              Videos
            </h2>
            <YoutubeEmbed
              url={yt}
              userId={profile.user_id}
              onClickEvent="click_youtube"
            />
          </section>
        )}

        {/* ── Más canales ──────────────────────────────────── */}
        {(sp || web) && (
          <section className="mb-12 md:mb-16">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-accent font-semibold mb-4">
              Más canales
            </h2>
            <div className="flex flex-wrap gap-2">
              {sp && (
                <TrackedLink
                  href={normalizeUrl(sp)}
                  userId={profile.user_id}
                  event="click_spotify"
                  external
                  className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-border text-sm hover:bg-bg-panel transition-colors"
                >
                  Spotify
                </TrackedLink>
              )}
              {web && (
                <TrackedLink
                  href={normalizeUrl(web)}
                  userId={profile.user_id}
                  event="click_website"
                  external
                  className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-border text-sm hover:bg-bg-panel transition-colors"
                >
                  Website
                </TrackedLink>
              )}
            </div>
          </section>
        )}

        {/* ── Tech rider ──────────────────────────────────── */}
        {(profile.tech_rider_ideal || profile.tech_rider_alt) && (
          <section className="mb-12 md:mb-16">
            <details className="group">
              <summary className="cursor-pointer flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-accent font-semibold mb-2 list-none">
                <span>Tech rider</span>
                <span className="text-fg-muted group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {profile.tech_rider_ideal && (
                  <div className="p-4 rounded-lg bg-bg-panel border border-border">
                    <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 font-semibold">
                      Ideal
                    </div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {profile.tech_rider_ideal}
                    </div>
                  </div>
                )}
                {profile.tech_rider_alt && (
                  <div className="p-4 rounded-lg bg-bg-panel border border-border">
                    <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 font-semibold">
                      Alternativo
                    </div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {profile.tech_rider_alt}
                    </div>
                  </div>
                )}
              </div>
              {profile.hospitality && (
                <div className="mt-4 p-4 rounded-lg bg-bg-panel border border-border">
                  <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 font-semibold">
                    Hospitality
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {profile.hospitality}
                  </div>
                </div>
              )}
            </details>
          </section>
        )}

        {/* ── Booking ──────────────────────────────────────── */}
        <section className="mb-12 md:mb-16">
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-accent font-semibold mb-4">
            Booking
          </h2>
          <div className="rounded-xl border border-border bg-bg-panel p-6 md:p-8">
            <BookingForm userId={profile.user_id} artistName={profile.artist_name} />
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="text-center text-[10px] uppercase tracking-[0.3em] text-fg-subtle py-8 border-t border-border">
          {profile.artist_name}
          {email ? ` · ${email}` : ""}
        </footer>
      </main>
    </div>
  );
}
