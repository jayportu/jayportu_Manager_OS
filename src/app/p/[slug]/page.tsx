import { getProfileBySlug } from "@/lib/queries/presskit";
import { listPublicRiderItems } from "@/lib/queries/tech-rider";
import { notFound } from "next/navigation";

// El press kit público debe reflejar cambios del owner sin esperar redeploy.
// Cache 60s: balance entre performance y frescura. revalidatePath() en
// server actions (tech rider, profile, availability) invalida instantáneamente.
export const revalidate = 60;
import { TrackBeacon } from "./track-beacon";
import { TrackedLink } from "./tracked-link";
import { GatedContact } from "./gated-contact";
import { SectionNav, type NavSection } from "./section-nav";
import { BookingForm } from "./booking-form";
import { SoundcloudEmbed, YoutubeEmbed, SetEmbed, SpotifyEmbed, BeatportEmbed } from "./embeds";
import { TechRiderRender } from "./tech-rider-render";
import { StagePlot } from "@/components/tech-rider/stage-plot";
import { GearCards } from "@/components/tech-rider/gear-cards";
import { parseRiderText, hasCabinItems } from "@/lib/tech-rider/parse";
import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { getPublicBusyDates } from "@/lib/queries/availability";
import { BandcampReleases } from "./bandcamp-releases";
import { getBandcampReleases } from "@/lib/integrations/bandcamp";
import { AvatarLightbox } from "@/components/avatar-lightbox";
import { getPublicGigStats } from "@/lib/queries/gig-stats";
import { FavoriteButtonClient } from "@/components/booker/favorite-button-client";
import { FollowNotifyToggle } from "@/components/booker/follow-notify-toggle";
import { normalizeUrl, isSupabaseStorageUrl } from "@/lib/format";
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

  // OG image: foto del DJ si es de Storage; si no, el OG por defecto del sitio.
  // Antes no había imagen ni canonical → el link se veía pobre al compartir.
  const ogImg = [profile.hero_image_url, profile.avatar_url, profile.logo_url].find(
    (u) => typeof u === "string" && u.startsWith("https://")
  );
  const images = ogImg
    ? [{ url: ogImg }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    alternates: { canonical: `/p/${slug}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/p/${slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImg ? [ogImg] : ["/og.png"],
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

  // Capa 2 — parseamos el tech rider en texto libre (lo que el DJ ya escribe)
  // a items estructurados para auto-generar el stage plot + tarjetas de gear,
  // sin pedirle ningún formulario. El texto crudo se sigue mostrando intacto.
  const parsedRiderItems = parseRiderText(profile.tech_rider_ideal);
  const showRiderVisual = parsedRiderItems.length > 0;
  const showStagePlot = hasCabinItems(parsedRiderItems);

  // Feature 3 — días ocupados (de gigs/bloqueos sincronizados) para el
  // calendario de disponibilidad. Solo fechas, sin detalles del evento.
  const busyDates = await getPublicBusyDates(profile.user_id);
  const showAvailabilityCalendar =
    !!profile.available_from || busyDates.length > 0;

  // #3 — auto-discografía: releases de Bandcamp (cacheado 1 día). Beatport no
  // se auto-importa (Cloudflare lo bloquea server-side) → queda como link.
  const bandcampReleases = profile.bandcamp_url
    ? await getBandcampReleases(profile.bandcamp_url)
    : [];

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

  const hasFeaturedSets = (profile.featured_sets?.length ?? 0) > 0;
  // Disponibilidad con ventana de fechas (consistente con /dj, no solo
  // available_from presente). Fix B5.
  const isAvailableNow = (() => {
    if (!profile.available_from) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (today < profile.available_from) return false;
    if (profile.available_until && today > profile.available_until) return false;
    return true;
  })();

  // El email/WhatsApp NO se renderizan en el HTML público (página cacheada):
  // se sirven gated por cuenta de booker vía <GatedContact>. Acá solo sabemos
  // si el DJ tiene contacto para decidir si mostrar esa sección.
  const hasContact = !!(profile.public_email || profile.whatsapp);
  const ig = profile.instagram_url;
  const sc = profile.soundcloud_url;
  const yt = profile.youtube_url;
  const sp = profile.spotify_url;
  const bp = profile.beatport_url;
  const bc = profile.bandcamp_url;
  const web = profile.website;
  const beatportReleases = (profile.beatport_releases ?? []).filter(Boolean);

  // JSON-LD (SEO #4) — el DJ como MusicGroup para rich results en Google.
  // genre + sameAs (redes) + image son las señales fuertes; location = ciudad.
  const ldImage = [
    profile.hero_image_url,
    profile.avatar_url,
    profile.logo_url,
  ].find((u) => typeof u === "string" && u.startsWith("https://"));
  const ldSameAs = [ig, sc, yt, sp, bp, bc, web].filter(
    (u): u is string => typeof u === "string" && u.startsWith("https://")
  );
  const presskitJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: profile.artist_name,
    url: `https://dropgigs.com/p/${profile.public_slug}`,
    ...(ldImage ? { image: ldImage } : {}),
    ...(profile.genres.length > 0 ? { genre: profile.genres } : {}),
    ...(profile.bio_short || profile.tagline
      ? { description: profile.bio_short || profile.tagline }
      : {}),
    ...(ldSameAs.length > 0 ? { sameAs: ldSameAs } : {}),
    ...(profile.city ? { location: { "@type": "Place", name: profile.city } } : {}),
  };

  // Secciones del nav sticky (scroll-spy resalta la activa en naranjo).
  const navSections: NavSection[] = [
    { id: "bio", label: "— BIO", primary: true },
    ...(sc || yt || sp || bp || bc || web || hasFeaturedSets || beatportReleases.length > 0
      ? [{ id: "musica", label: "Música" }]
      : []),
    ...(showAvailabilityCalendar
      ? [{ id: "disponibilidad", label: "Disponibilidad" }]
      : []),
    ...(hasStructuredRider ||
    profile.tech_rider_ideal ||
    profile.tech_rider_alt
      ? [{ id: "rider", label: "Tech rider" }]
      : []),
    { id: "contacto", label: "Contacto" },
  ];

  // Acortar nombre para hero (line-break si tiene 2+ palabras)
  const artistName = profile.artist_name || "DJ";
  const artistParts = artistName.trim().split(/\s+/);
  const heroLines =
    artistParts.length >= 2
      ? [artistParts[0], artistParts.slice(1).join(" ")]
      : [artistName];

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Beacon: registra view al montar */}
      <TrackBeacon userId={profile.user_id} event="view" />

      {/* JSON-LD (SEO). dangerouslySetInnerHTML + escape de "<" (igual que /dj):
          el JSON viene de data del DJ; JSON.stringify no escapa "</script>". */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(presskitJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* ═══ HERO ink full-width brutalist ═══ */}
      <header className="relative bg-ink text-white border-b-4 border-orange overflow-hidden">
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
              {isAvailableNow && (
                <span className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-orange text-ink border-2 border-orange">
                  ● DISPONIBLE
                </span>
              )}
              {/* Botón corazón — solo visible para Bookers logueados */}
              <FavoriteButtonClient djUserId={profile.user_id} size="lg" />
            </div>
          </div>

          {/* Fila principal: nombre (izq) + géneros (der, al costado en
              desktop). En mobile los géneros van debajo, en fila. */}
          <div className="md:flex md:items-end md:justify-between md:gap-10">
            <div className="md:min-w-0">
              {/* Foto de perfil (click → tamaño real) */}
              {isSupabaseStorageUrl(profile.avatar_url) && (
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

              {/* Badge verificado (Fase 1 · 1A) — señal de confianza */}
              {profile.verified_at && (
                <div className="mt-4 inline-flex items-center gap-1.5 border-2 border-orange bg-orange text-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                  ✓ Verificado por DROP.
                </div>
              )}

              {/* Tagline */}
              {profile.tagline && (
                <p className="mt-5 text-base md:text-lg max-w-2xl text-white/80">
                  {profile.tagline}
                </p>
              )}

              {/* Alias / proyectos (Fase 1 · 1D) */}
              {profile.aliases && profile.aliases.length > 0 && (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
                  AKA {profile.aliases.join(" · ")}
                </p>
              )}

              {/* Sprint RA-3 — Toggle "Seguir con avisos" (solo se
                  renderiza cuando el visitante es un booker logueado). */}
              <div className="max-w-md">
                <FollowNotifyToggle
                  djUserId={profile.user_id}
                  djArtistName={artistName}
                />
              </div>
            </div>

            {/* Géneros + ciudad + sello — al costado (derecha) y más grandes
                en desktop; en mobile en fila debajo del nombre. */}
            <div className="mt-7 md:mt-0 md:shrink-0 md:max-w-[42%] flex flex-wrap md:flex-col md:items-end gap-2">
              {profile.genres.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="font-mono text-[11px] md:text-sm font-bold uppercase tracking-wider px-3 md:px-4 py-1 md:py-2 border border-cream text-white"
                >
                  {g}
                </span>
              ))}
              {profile.city && (
                <span className="font-mono text-[11px] md:text-sm font-bold uppercase tracking-wider px-3 md:px-4 py-1 md:py-2 border border-cream text-white">
                  {profile.city}
                  {profile.country ? ` · ${profile.country}` : ""}
                </span>
              )}
              {profile.record_label && (
                <span className="font-mono text-[11px] md:text-sm font-bold uppercase tracking-wider px-3 md:px-4 py-1 md:py-2 border border-cream text-white">
                  Sello · {profile.record_label}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ TABS row brutalist (anchors a secciones, scroll-spy) ═══ */}
      <SectionNav sections={navSections} />

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
                      className="font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 border-border bg-bg-panel"
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
              <div className="grid grid-cols-3 border-2 border-border">
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
                      value={profile.country ? profile.country.toUpperCase() : "—"}
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
                <ul className="border-2 border-border divide-y-2 divide-border">
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
                      <li key={gig.id} className="flex items-stretch bg-bg-panel">
                        <div className="bg-ink text-white px-4 py-3 flex flex-col items-center justify-center shrink-0 min-w-[72px]">
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
            {(sc || yt || sp || bp || bc || web || hasFeaturedSets || beatportReleases.length > 0) && (
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

                {sp && (
                  <div className="mb-6">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2">
                      Spotify
                    </div>
                    <SpotifyEmbed
                      url={sp}
                      userId={profile.user_id}
                      onClickEvent="click_spotify"
                    />
                  </div>
                )}

                <BandcampReleases releases={bandcampReleases} />

                {beatportReleases.length > 0 && (
                  <div className="mb-6">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2">
                      Releases en Beatport
                    </div>
                    <div className="space-y-2">
                      {beatportReleases.map((u) => (
                        <BeatportEmbed key={u} url={u} />
                      ))}
                    </div>
                  </div>
                )}

                {(bp || bc || web) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {bp && (
                      <TrackedLink
                        href={normalizeUrl(bp)}
                        userId={profile.user_id}
                        event="click_beatport"
                        external
                        className="inline-flex items-center justify-center h-10 px-4 border-2 border-border bg-orange text-ink hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
                      >
                        Beatport →
                      </TrackedLink>
                    )}
                    {bc && (
                      <TrackedLink
                        href={normalizeUrl(bc)}
                        userId={profile.user_id}
                        event="click_bandcamp"
                        external
                        className="inline-flex items-center justify-center h-10 px-4 border-2 border-border bg-orange text-ink hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
                      >
                        Bandcamp →
                      </TrackedLink>
                    )}
                    {web && (
                      <TrackedLink
                        href={normalizeUrl(web)}
                        userId={profile.user_id}
                        event="click_website"
                        external
                        className="inline-flex items-center justify-center h-10 px-4 border-2 border-border bg-orange text-ink hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
                      >
                        Website →
                      </TrackedLink>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ── DISPONIBILIDAD ── */}
            {showAvailabilityCalendar && (
              <section id="disponibilidad" className="mb-10 scroll-mt-20">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4 text-orange">
                  — DISPONIBILIDAD
                </div>
                <AvailabilityCalendar
                  availableFrom={profile.available_from}
                  availableUntil={profile.available_until}
                  busyDates={busyDates}
                />
                {profile.available_note && (
                  <p className="mt-4 text-sm text-fg-muted leading-relaxed border-l-2 border-orange pl-3">
                    {profile.available_note}
                  </p>
                )}
              </section>
            )}

            {/* ── TECH RIDER ── */}
            {/* Prioridad: el texto simple IDEAL/ALTERNATIVO (lo que el DJ edita
                en Configuración) manda. El rider estructurado + stage plot queda
                como fallback solo para quien tenga ítems pero ningún texto. */}
            {profile.tech_rider_ideal ||
            profile.tech_rider_alt ||
            profile.hospitality ? (
              <section id="rider" className="mb-10 scroll-mt-20">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4 text-orange">
                  — TECH RIDER
                </div>

                {/* Capa 2 — visual auto-generado desde el texto del rider:
                    diagrama de cabina + tarjetas de gear. RTP solo muestra
                    fotos sueltas; acá mostramos el layout real de la cabina. */}
                {showStagePlot && (
                  <StagePlot
                    items={parsedRiderItems}
                    artistName={profile.artist_name}
                  />
                )}
                {showRiderVisual && <GearCards items={parsedRiderItems} />}

                <div className="grid md:grid-cols-2 gap-4">
                  {profile.tech_rider_ideal && (
                    <div className="p-4 border-2 border-border bg-bg-panel">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                        IDEAL · texto
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {profile.tech_rider_ideal}
                      </div>
                    </div>
                  )}
                  {profile.tech_rider_alt && (
                    <div className="p-4 border-2 border-border bg-bg-panel">
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
                  <div className="mt-4 p-4 border-2 border-border bg-bg-panel">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                      HOSPITALITY
                    </div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {profile.hospitality}
                    </div>
                  </div>
                )}
              </section>
            ) : hasStructuredRider ? (
              <section id="rider" className="mb-10 scroll-mt-20">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] mb-4 text-orange">
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
              </section>
            ) : null}
          </div>

          {/* ────── COLUMNA DERECHA: contacto sticky card naranja ────── */}
          <aside id="contacto" className="scroll-mt-20">
            <div className="md:sticky md:top-20">
              {/* Sprint RA-1 — Información de reserva destacada (estilo RA).
                  Fee/Agenda son públicos; el email/WhatsApp van GATED por
                  cuenta de booker vía <GatedContact> (no salen al HTML). */}
              {/* Confiabilidad (Fase 1 · 1F) — checklist de confianza arriba */}
              {trustChecks.length > 0 && (
                <div className="bg-bg-panel border-2 border-border p-4 mb-4">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
                    — CONFIABILIDAD
                  </div>
                  <ul className="space-y-1.5">
                    {trustChecks.map((c) => (
                      <li
                        key={c}
                        className="flex items-center gap-2 text-sm font-medium text-fg"
                      >
                        <span className="text-orange font-bold">✓</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(hasContact || feeLabel || profile.available_note) && (
                <div className="bg-bg-panel border-2 border-border p-4 mb-4">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
                    — INFORMACIÓN DE RESERVA
                  </div>
                  {(feeLabel || profile.available_note) && (
                    <div className="space-y-1 text-sm">
                      {feeLabel && (
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted shrink-0 w-16">
                            Fee ref.
                          </span>
                          <span className="font-medium text-fg">{feeLabel}</span>
                        </div>
                      )}
                      {profile.available_note && (
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted shrink-0 w-16">
                            Agenda
                          </span>
                          <span className="font-medium text-fg">
                            {profile.available_note}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {hasContact && (
                    <div className={feeLabel || profile.available_note ? "mt-3" : ""}>
                      <GatedContact djUserId={profile.user_id} />
                    </div>
                  )}
                </div>
              )}

              {/* Instagram es público; WhatsApp/Email van gated dentro de
                  <GatedContact> y no se exponen en el HTML público. */}
              {ig && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <TrackedLink
                    href={normalizeUrl(ig)}
                    userId={profile.user_id}
                    event="click_instagram"
                    external
                    className="inline-flex items-center justify-center h-10 px-3 bg-bg-panel border-2 border-border font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-ink hover:text-orange transition-colors"
                  >
                    Instagram
                  </TrackedLink>
                </div>
              )}

              {/* Botón "Ver press kit (PDF)" — solo si el DJ subió un PDF.
                  Antes el PDF reemplazaba toda la página; ahora es un
                  complemento opcional al perfil generado. Abre en pestaña
                  nueva para no perder el contexto del perfil. */}
              {hasPdfPressKit && (
                <>
                  <a
                    href={profile.press_kit_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-orange text-ink border-2 border-border p-5 hover:bg-ink hover:text-orange transition-colors"
                  >
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                      — PRESS KIT
                    </div>
                    <div className="font-display text-2xl md:text-3xl leading-none mt-2 mb-3 flex items-center gap-2">
                      <span>Ver press kit.</span>
                      <span className="text-xl">↗</span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                      Mi press kit en PDF · abre en pestaña nueva
                    </div>
                  </a>

                  {/* Separación visual entre el press kit y el contacto */}
                  <div className="flex items-center gap-3 my-5">
                    <span className="flex-1 h-0.5 bg-ink/20" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
                      o contáctame
                    </span>
                    <span className="flex-1 h-0.5 bg-ink/20" />
                  </div>
                </>
              )}

              {/* Form de booking — card clara con acentos naranjos (más
                  sobria que el bloque 100% naranja anterior). */}
              <div className="bg-bg-panel border-2 border-border p-5">
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
        <footer className="mt-16 pt-6 border-t-2 border-border flex flex-wrap justify-between items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-subtle">
          <div>{profile.artist_name}</div>
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
    white: "bg-bg-panel text-fg",
    ink: "bg-ink text-white",
    orange: "bg-orange text-ink",
  }[variant];
  const isLast = variant === "orange"; // borde derecho solo si no es la última
  return (
    <div
      className={`${bg} text-center py-4 px-2 ${
        isLast ? "" : "border-r-2 border-border"
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
