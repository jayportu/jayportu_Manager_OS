import { getProfileBySlug } from "@/lib/queries/presskit";
import { listPublicRiderItems } from "@/lib/queries/tech-rider";
import { notFound } from "next/navigation";

// El press kit público debe reflejar cambios del owner sin esperar redeploy.
// Cache 60s: balance entre performance y frescura. revalidatePath() en
// server actions (tech rider, profile, availability) invalida instantáneamente.
export const revalidate = 60;
import { TrackBeacon } from "./track-beacon";
import { TrackedLink } from "./tracked-link";
import { BookingForm } from "./booking-form";
import { SoundcloudEmbed, YoutubeEmbed, SetEmbed } from "./embeds";
import { TechRiderRender } from "./tech-rider-render";
import { StagePlot } from "./stage-plot";
import { AvatarLightbox } from "@/components/avatar-lightbox";
import { getPublicGigStats } from "@/lib/queries/gig-stats";
import { FavoriteButtonClient } from "@/components/booker/favorite-button-client";
import { FollowNotifyToggle } from "@/components/booker/follow-notify-toggle";
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

  // Sprint 21 — items del rider estructurado (sin RLS via service_role).
  const riderItems = await listPublicRiderItems(profile.user_id);
  const hasStructuredRider = riderItems.length > 0;

  // Sprint RA-1 — stats públicos de gigs (sin RLS via service_role).
  const gigStats = await getPublicGigStats(profile.user_id);
  const hasGigData =
    gigStats.showsPasados > 0 ||
    gigStats.lugaresDistintos > 0 ||
    gigStats.proximos.length > 0;

  // Nota (2026-06-01): Antes, si el DJ subía un PDF propio (press_kit_mode
  // === "pdf"), `/p/[slug]` renderizaba SÓLO el PDF a pantalla completa,
  // ocultando toda la info del perfil (bio, géneros, ciudad, redes,
  // booking form). Reportado como mal UX: el visitante perdía el contexto.
  // Ahora SIEMPRE mostramos el perfil generado, y si hay PDF, agregamos
  // un botón "Ver press kit (PDF)" en el aside (abajo). El campo
  // press_kit_mode queda en DB pero ya no controla el branch — lo
  // mantenemos por backward compat hasta que se simplifique /configuracion.
  const hasPdfPressKit = !!profile.press_kit_pdf_url;

  // Fee referencial opt-in (Fase 1 · 1E). Solo si el DJ lo activó + hay rango.
  const feeLabel = (() => {
    if (!profile.show_fee) return null;
    const { fee_min: min, fee_max: max } = profile;
    if (min == null && max == null) return null;
    const fmt = (n: number) =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(n);
    if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
    if (min != null) return `Desde ${fmt(min)}`;
    return `Hasta ${fmt(max as number)}`;
  })();

  // Confiabilidad granular (Fase 1 · 1F). Manuales (admin) + historial (auto).
  const verifications = profile.verifications ?? [];
  const trustChecks = [
    verifications.includes("identity") && "Identidad verificada",
    verifications.includes("socials") && "Redes verificadas",
    verifications.includes("sets") && "Sets verificados",
    gigStats.showsPasados >= 3 && "Historial de shows",
  ].filter(Boolean) as string[];

  const wa = whatsappLink(profile.whatsapp);
  const email = profile.public_email;
  const ig = profile.instagram_url;
  const sc = profile.soundcloud_url;
  const yt = profile.youtube_url;
  const sp = profile.spotify_url;
  const web = profile.website;

  // Acortar nombre para hero (line-break si tiene 2+ palabras)
  const artistName = profile.artist_name || "DJ";
  const artistParts = artistName.trim().split(/\s+/);
  const heroLines =
    artistParts.length >= 2
      ? [artistParts[0], artistParts.slice(1).join(" ")]
      : [artistName];

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Beacon: registra view al montar */}
      <TrackBeacon userId={profile.user_id} event="view" />

      {/* ═══ HERO ink full-width brutalist ═══ */}
      <header className="relative bg-ink text-cream border-b-4 border-orange overflow-hidden">
        {/* Watermark "DJ" gigante */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute select-none font-display leading-[0.85] text-[180px] md:text-[320px]"
          style={{
            right: "-30px",
            bottom: "-80px",
            color: "rgba(255,92,0,0.08)",
          }}
        >
          DJ
        </div>

        <div className="relative max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-16">
          {/* Top row: kicker + status chip + favorite */}
          <div className="flex justify-between items-start gap-4">
            <div className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-orange">
              — PRESS KIT · VOL. 01
            </div>
            <div className="flex items-center gap-2">
              {profile.available_from && (
                <span className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-orange text-ink border-2 border-orange">
                  ● DISPONIBLE
                </span>
              )}
              {/* Botón corazón — solo visible para Bookers logueados */}
              <FavoriteButtonClient djUserId={profile.user_id} size="lg" />
            </div>
          </div>

          {/* Foto de perfil (click → tamaño real) */}
          {profile.avatar_url && (
            <AvatarLightbox
              src={profile.avatar_url}
              alt={artistName}
              className="mt-6 block w-20 h-20 md:w-28 md:h-28"
            />
          )}

          {/* Hero title */}
          <h1 className="font-display leading-[0.85] tracking-tight mt-3 text-[64px] sm:text-[96px] md:text-[140px] lg:text-[180px]">
            {heroLines.map((line, i) => (
              <span key={i} className="block">
                {line}
                {i === heroLines.length - 1 && (
                  <span className="text-orange">.</span>
                )}
              </span>
            ))}
          </h1>

          {/* Badge verificado (Fase 1 · 1A) — señal de confianza para el booker */}
          {profile.verified_at && (
            <div className="mt-4 inline-flex items-center gap-1.5 border-2 border-orange bg-orange text-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
              ✓ Verificado por DROP.
            </div>
          )}

          {/* Tagline */}
          {profile.tagline && (
            <p className="mt-5 text-base md:text-lg max-w-2xl text-cream/80">
              {profile.tagline}
            </p>
          )}

          {/* Alias / proyectos (Fase 1 · 1D) */}
          {profile.aliases && profile.aliases.length > 0 && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cream/60">
              AKA {profile.aliases.join(" · ")}
            </p>
          )}

          {/* Géneros + ciudad como labels outline cream */}
          <div className="mt-6 flex flex-wrap gap-1.5">
            {profile.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 border border-cream text-cream"
              >
                {g}
              </span>
            ))}
            {profile.city && (
              <span className="font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 border border-cream text-cream">
                {profile.city}
                {profile.country ? ` · ${profile.country}` : ""}
              </span>
            )}
            {profile.record_label && (
              <span className="font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 border border-cream text-cream">
                Sello · {profile.record_label}
              </span>
            )}
          </div>

          {/* Sprint RA-3 — Toggle "Seguir con avisos" (solo se renderiza
              cuando el visitante es un booker logueado). */}
          <div className="max-w-md">
            <FollowNotifyToggle
              djUserId={profile.user_id}
              djArtistName={artistName}
            />
          </div>
        </div>
      </header>

      {/* ═══ TABS row brutalist (anchors a secciones) ═══ */}
      <nav
        className="bg-white border-b-2 border-ink sticky top-0 z-30"
        aria-label="Secciones del press kit"
      >
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          <a
            href="#bio"
            className="font-display text-base md:text-lg leading-none px-4 md:px-6 py-3.5 bg-orange border-r-2 border-ink hover:bg-orange/90 transition-colors whitespace-nowrap"
          >
            — BIO
          </a>
          {(sc || yt || sp) && (
            <a
              href="#musica"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted px-4 md:px-6 py-4 border-r-2 border-ink hover:bg-cream hover:text-ink transition-colors whitespace-nowrap"
            >
              Música
            </a>
          )}
          {(hasStructuredRider ||
            profile.tech_rider_ideal ||
            profile.tech_rider_alt) && (
            <a
              href="#rider"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted px-4 md:px-6 py-4 border-r-2 border-ink hover:bg-cream hover:text-ink transition-colors whitespace-nowrap"
            >
              Tech rider
            </a>
          )}
          <a
            href="#contacto"
            className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-fg-muted px-4 md:px-6 py-4 hover:bg-cream hover:text-ink transition-colors whitespace-nowrap"
          >
            Contacto
          </a>
        </div>
      </nav>

      {/* ═══ BODY · grid 2fr / 1fr ═══ */}
      <main className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className="grid md:grid-cols-[2fr_1fr] gap-8 md:gap-12">
          {/* ────── COLUMNA IZQUIERDA: bio + stats + music + rider ────── */}
          <div>
            {/* ── BIO ── */}
            {(profile.bio_long || profile.bio_short) && (
              <section id="bio" className="mb-10 scroll-mt-20">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
                  — SOBRE
                </div>
                <p className="text-base leading-relaxed mt-3 whitespace-pre-wrap">
                  {profile.bio_long || profile.bio_short}
                </p>
              </section>
            )}

            {/* Han confiado — marcas/clubs (Fase 1 · 1C, social proof) */}
            {profile.brands_worked && profile.brands_worked.length > 0 && (
              <section className="mb-10">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4">
                  — HAN CONFIADO
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.brands_worked.map((b) => (
                    <span
                      key={b}
                      className="font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 border-ink bg-white"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* ── STATS 3 col borde ink ──
                Si el DJ tiene gigs en su calendario, mostramos SHOWS · LUGARES
                · DESDE (estilo RA "stats del artista"). Si no, fallback al
                stats actual (géneros / rider / base). */}
            <section className="mb-10">
              <div className="grid grid-cols-3 border-2 border-ink">
                {hasGigData ? (
                  <>
                    <StatTile
                      value={gigStats.showsPasados || "—"}
                      label="SHOWS"
                      variant="white"
                    />
                    <StatTile
                      value={gigStats.lugaresDistintos || "—"}
                      label="LUGARES"
                      variant="ink"
                    />
                    <StatTile
                      value={gigStats.desdeAño ?? "—"}
                      label="DESDE"
                      variant="orange"
                    />
                  </>
                ) : (
                  <>
                    <StatTile
                      value={profile.genres.length || "—"}
                      label="GÉNEROS"
                      variant="white"
                    />
                    <StatTile
                      value={
                        riderItems.length > 0 ? String(riderItems.length) : "—"
                      }
                      label="RIDER ITEMS"
                      variant="ink"
                    />
                    <StatTile
                      value={profile.city ? "CL" : "—"}
                      label="BASE"
                      variant="orange"
                    />
                  </>
                )}
              </div>
            </section>

            {/* ── PRÓXIMAS FECHAS ──
                Solo visible si hay ≥1 show futuro. Estilo RA "Próximos
                eventos": fecha + título + lugar, lista vertical brutalista. */}
            {gigStats.proximos.length > 0 && (
              <section className="mb-10">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4">
                  — PRÓXIMAS FECHAS
                </div>
                <ul className="border-2 border-ink divide-y-2 divide-ink">
                  {gigStats.proximos.map((gig) => {
                    const d = new Date(gig.startAt);
                    const dia = d
                      .toLocaleDateString("es-CL", { day: "2-digit" })
                      .toUpperCase();
                    const mes = d
                      .toLocaleDateString("es-CL", { month: "short" })
                      .replace(".", "")
                      .toUpperCase();
                    return (
                      <li key={gig.id} className="flex items-stretch bg-white">
                        <div className="bg-ink text-cream px-4 py-3 flex flex-col items-center justify-center shrink-0 min-w-[72px]">
                          <span
                            className="font-display leading-none text-2xl"
                            style={{
                              fontFamily:
                                "var(--font-anton), Impact, system-ui, sans-serif",
                            }}
                          >
                            {dia}
                          </span>
                          <span className="font-mono text-[9px] tracking-[0.1em] mt-1 text-orange">
                            {mes}
                          </span>
                        </div>
                        <div className="px-4 py-3 flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">
                            {gig.title}
                          </div>
                          {gig.location && (
                            <div className="text-xs text-fg-muted truncate mt-0.5">
                              {gig.location}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ── MÚSICA ── */}
            {(sc || yt || sp || web) && (
              <section id="musica" className="mb-10 scroll-mt-20">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4">
                  — MÚSICA
                </div>

                {/* Sets destacados (Fase 1 · 1B) — primero, son los curados */}
                {profile.featured_sets && profile.featured_sets.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      Sets destacados
                    </div>
                    {profile.featured_sets.map((setUrl) => (
                      <SetEmbed
                        key={setUrl}
                        url={setUrl}
                        userId={profile.user_id}
                      />
                    ))}
                  </div>
                )}

                {sc && (
                  <div className="mb-6">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2">
                      SoundCloud
                    </div>
                    <SoundcloudEmbed
                      url={sc}
                      userId={profile.user_id}
                      onClickEvent="click_soundcloud"
                    />
                  </div>
                )}

                {yt && (
                  <div className="mb-6">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2">
                      YouTube
                    </div>
                    <YoutubeEmbed
                      url={yt}
                      userId={profile.user_id}
                      onClickEvent="click_youtube"
                    />
                  </div>
                )}

                {(sp || web) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {sp && (
                      <TrackedLink
                        href={normalizeUrl(sp)}
                        userId={profile.user_id}
                        event="click_spotify"
                        external
                        className="inline-flex items-center justify-center h-10 px-4 border-2 border-ink bg-white hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
                      >
                        Spotify →
                      </TrackedLink>
                    )}
                    {web && (
                      <TrackedLink
                        href={normalizeUrl(web)}
                        userId={profile.user_id}
                        event="click_website"
                        external
                        className="inline-flex items-center justify-center h-10 px-4 border-2 border-ink bg-white hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
                      >
                        Website →
                      </TrackedLink>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ── TECH RIDER ── */}
            {hasStructuredRider ? (
              <section id="rider" className="mb-10 scroll-mt-20">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4">
                  — TECH RIDER
                </div>
                <StagePlot
                  items={riderItems}
                  artistName={profile.artist_name}
                />
                <TechRiderRender
                  items={riderItems}
                  hospitalityNote={profile.hospitality}
                />
                {/* Las notas legacy (tech_rider_ideal/alt) NO se muestran acá
                    cuando hay rider estructurado: serían duplicación de lo que
                    ya muestra TechRiderRender. El DJ las sigue viendo en
                    Configuración como recordatorio para migrarlas/limpiarlas. */}
              </section>
            ) : (
              (profile.tech_rider_ideal || profile.tech_rider_alt) && (
                <section id="rider" className="mb-10 scroll-mt-20">
                  <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4">
                    — TECH RIDER
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {profile.tech_rider_ideal && (
                      <div className="p-4 border-2 border-ink bg-white">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                          IDEAL
                        </div>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {profile.tech_rider_ideal}
                        </div>
                      </div>
                    )}
                    {profile.tech_rider_alt && (
                      <div className="p-4 border-2 border-ink bg-white">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                          ALTERNATIVO
                        </div>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {profile.tech_rider_alt}
                        </div>
                      </div>
                    )}
                  </div>
                  {profile.hospitality && (
                    <div className="mt-4 p-4 border-2 border-ink bg-white">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                        HOSPITALITY
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {profile.hospitality}
                      </div>
                    </div>
                  )}
                </section>
              )
            )}
          </div>

          {/* ────── COLUMNA DERECHA: contacto sticky card naranja ────── */}
          <aside id="contacto" className="scroll-mt-20">
            <div className="md:sticky md:top-20">
              {/* Sprint RA-1 — Información de reserva destacada (estilo RA).
                  Si el DJ tiene email/whatsapp, se muestran como texto claro
                  antes de los botones de acción. */}
              {/* Confiabilidad (Fase 1 · 1F) — checklist de confianza arriba */}
              {trustChecks.length > 0 && (
                <div className="bg-white border-2 border-ink p-4 mb-4">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
                    — CONFIABILIDAD
                  </div>
                  <ul className="space-y-1.5">
                    {trustChecks.map((c) => (
                      <li
                        key={c}
                        className="flex items-center gap-2 text-sm font-medium text-ink"
                      >
                        <span className="text-orange font-bold">✓</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(email || profile.whatsapp || feeLabel) && (
                <div className="bg-white border-2 border-ink p-4 mb-4">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
                    — INFORMACIÓN DE RESERVA
                  </div>
                  <div className="space-y-1 text-sm">
                    {email && (
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted shrink-0 w-16">
                          Email
                        </span>
                        <TrackedLink
                          href={`mailto:${email}`}
                          userId={profile.user_id}
                          event="click_email"
                          className="font-medium text-ink hover:text-orange transition-colors break-all"
                        >
                          {email}
                        </TrackedLink>
                      </div>
                    )}
                    {profile.whatsapp && wa && (
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted shrink-0 w-16">
                          WhatsApp
                        </span>
                        <TrackedLink
                          href={wa}
                          userId={profile.user_id}
                          event="click_whatsapp"
                          external
                          className="font-medium text-ink hover:text-orange transition-colors"
                        >
                          +{profile.whatsapp.replace(/[^0-9]/g, "")}
                        </TrackedLink>
                      </div>
                    )}
                    {feeLabel && (
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted shrink-0 w-16">
                          Fee ref.
                        </span>
                        <span className="font-medium text-ink">{feeLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Acciones rápidas arriba */}
              <div className="flex flex-wrap gap-2 mb-4">
                {wa && (
                  <TrackedLink
                    href={wa}
                    userId={profile.user_id}
                    event="click_whatsapp"
                    external
                    className="inline-flex items-center justify-center h-10 px-3 bg-ink text-orange border-2 border-ink font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-orange hover:text-ink transition-colors"
                  >
                    WhatsApp
                  </TrackedLink>
                )}
                {email && (
                  <TrackedLink
                    href={`mailto:${email}`}
                    userId={profile.user_id}
                    event="click_email"
                    className="inline-flex items-center justify-center h-10 px-3 bg-white border-2 border-ink font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-ink hover:text-orange transition-colors"
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
                    className="inline-flex items-center justify-center h-10 px-3 bg-white border-2 border-ink font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-ink hover:text-orange transition-colors"
                  >
                    Instagram
                  </TrackedLink>
                )}
              </div>

              {/* Botón "Ver press kit (PDF)" — solo si el DJ subió un PDF.
                  Antes el PDF reemplazaba toda la página; ahora es un
                  complemento opcional al perfil generado. Abre en pestaña
                  nueva para no perder el contexto del perfil. */}
              {hasPdfPressKit && (
                <a
                  href={profile.press_kit_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-ink text-cream border-2 border-ink p-5 hover:bg-cream hover:text-ink transition-colors"
                >
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
                    — PRESS KIT
                  </div>
                  <div className="font-display text-2xl md:text-3xl leading-none mt-2 mb-3">
                    Ver press kit<span className="text-orange">.</span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                    ↗ Mi press kit en PDF · abre en pestaña nueva
                  </div>
                </a>
              )}

              {/* Form de booking — card clara con acentos naranjos (más
                  sobria que el bloque 100% naranja anterior). */}
              <div className="bg-white border-2 border-ink p-5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
                  — RESERVAR
                </div>
                <h2 className="font-display text-3xl md:text-4xl leading-none mt-2 mb-4">
                  Contáctame<span className="text-orange">.</span>
                </h2>
                <BookingForm
                  userId={profile.user_id}
                  artistName={profile.artist_name}
                />
                <p className="mt-3 font-mono text-[10px] text-center uppercase tracking-wider text-fg-muted">
                  — RESPONDO EN MENOS DE 24H
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <footer className="mt-16 pt-6 border-t-2 border-ink flex flex-wrap justify-between items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-subtle">
          <div>
            {profile.artist_name}
            {email ? ` · ${email}` : ""}
          </div>
          <div className="opacity-60">DROP. · THE DJ OS</div>
        </footer>
      </main>
    </div>
  );
}

function StatTile({
  value,
  label,
  variant,
}: {
  value: string | number;
  label: string;
  variant: "white" | "ink" | "orange";
}) {
  const bg = {
    white: "bg-white text-ink",
    ink: "bg-ink text-cream",
    orange: "bg-orange text-ink",
  }[variant];
  const isLast = variant === "orange"; // borde derecho solo si no es la última
  return (
    <div
      className={`${bg} text-center py-4 px-2 ${
        isLast ? "" : "border-r-2 border-ink"
      }`}
    >
      <div className="font-display text-4xl md:text-5xl leading-none">
        {value}
      </div>
      <div
        className={`font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-wider mt-2 ${
          variant === "ink" ? "text-orange" : ""
        }`}
      >
        — {label}
      </div>
    </div>
  );
}
