import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  listPublicDjs,
  listPublicGenres,
  listPublicCities,
  getLandingRanking,
  type PublicDjProfile,
} from "@/lib/queries/directory";
import { getUpcomingPublicEvents } from "@/lib/queries/events";
import { isSupabaseStorageUrl } from "@/lib/format";
import { SiteHeader, SiteFooter } from "@/components/public/site-chrome";
import { EventCard } from "@/components/public/event-card";

/**
 * Landing público (arquitectura editorial estilo RA) — ALIMENTADO POR DATA REAL.
 *
 * Flujo de auth:
 *   - Sin sesión → renderiza el landing (con DJs/ranking/conteos reales).
 *   - Sesión DJ → /dashboard · Booker → /booker/requests · sin tipo → /welcome.
 *
 * Las secciones dinámicas (SUENA AHORA, DROP RECOMIENDA, ranking) se alimentan
 * de `listPublicDjs`/`getLandingRanking` (lectura base cacheada 5 min) → se
 * actualizan solas cuando entran DJs. Cada sección se OCULTA si no tiene data:
 * cero relleno falso.
 */

export const metadata: Metadata = {
  title: "DROP. · The DJ OS",
  description:
    "La escena no cabe en un grupo de WhatsApp. Perfiles reales, sets que puedes escuchar y contacto directo con el artista. Sin comisión, sin intermediarios.",
  openGraph: {
    title: "DROP. · The DJ OS",
    description:
      "Perfiles reales, sets que puedes escuchar y contacto directo con el artista. Sin comisión, sin intermediarios.",
    type: "website",
    url: "/",
    siteName: "DROP.",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "DROP. — The DJ OS" },
    ],
  },
};

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

/** Colecciones editoriales (curaduría nuestra). Los conteos y links son REALES
 *  (se calculan sobre los DJs que existen); si una matchea 0, se oculta. */
const COLLECTIONS: { title: string; desc: string; genres: string[] }[] = [
  {
    title: "Para un after que se respete.",
    desc: "Bass, techno duro y nadie que baje el pulso antes de las 6 AM.",
    genres: ["techno", "hard techno", "minimal", "tech house"],
  },
  {
    title: "House para un domingo largo.",
    desc: "Cálido, sin prisa, para una terraza que no quiere que se acabe.",
    genres: ["house", "deep house", "nu disco", "afro house"],
  },
  {
    title: "Algo melódico al atardecer.",
    desc: "Rooftop, sunset y un viaje que sube de a poco.",
    genres: ["melodic techno", "deep house", "afro house", "progressive"],
  },
  {
    title: "Un evento que por una vez no sea aburrido.",
    desc: "Lectura de pista impecable, repertorio amplio, cero incomodidad.",
    genres: ["nu disco", "funky house", "house", "deep house", "indie dance"],
  },
];

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [{ data: dj }, { data: booker }] = await Promise.all([
      supabase.from("dj_profile").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("booker_accounts").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
    if (dj) redirect("/dashboard");
    const accountType = user.user_metadata?.account_type;
    if (booker || accountType === "booker") redirect("/booker/requests");
    redirect("/welcome");
  }

  // ── Data real para el landing (todo deriva de la lectura base cacheada) ──
  const [suenaRaw, ranking, genres, cities, allDjs, collectionsRaw, eventos] =
    await Promise.all([
      listPublicDjs({ sort: "recent", limit: 8 }),
      getLandingRanking(5),
      listPublicGenres(),
      listPublicCities(),
      listPublicDjs({}), // total real del directorio (para la línea de tracción)
      Promise.all(
        COLLECTIONS.map(async (c) => ({
          ...c,
          count: (await listPublicDjs({ genres: c.genres })).length,
        }))
      ),
      getUpcomingPublicEvents(4),
    ]);
  const topGenres = genres.slice(0, 5);
  const collections = collectionsRaw.filter((c) => c.count > 0).slice(0, 3);
  const genresHref = (gs: string[]) =>
    `/dj?genres=${encodeURIComponent(gs.join(","))}`;
  // Foto-first: las cards con foto adelante (evita la "pared de iniciales").
  const suena = [...suenaRaw].sort(
    (a, b) =>
      (isSupabaseStorageUrl(b.avatar_url) || isSupabaseStorageUrl(b.hero_image_url) ? 1 : 0) -
      (isSupabaseStorageUrl(a.avatar_url) || isSupabaseStorageUrl(a.hero_image_url) ? 1 : 0)
  );
  // Línea de tracción en el hero: solo cuando hay masa real (decisión: ≥25 DJs).
  const TRACTION_MIN = 25;
  const showTraction = allDjs.length >= TRACTION_MIN;

  return (
    <main className="bg-cream text-ink">
      <SiteHeader />

      {/* CAPA 1 · HERO + DOS PUERTAS */}
      <section className="relative overflow-hidden border-b-2 border-ink">
        <span aria-hidden className="absolute pointer-events-none select-none" style={{ right: -50, bottom: -150, fontFamily: ANTON, fontSize: 380, lineHeight: 0.7, color: "rgba(255,92,0,0.06)" }}>D.</span>
        <div className="max-w-[1140px] mx-auto px-6 py-16 relative z-10">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-orange flex items-center gap-3">
            <span>DROP<span className="text-orange">.</span></span>
            <span className="w-[60px] h-px bg-orange/40" />
            <span>The DJ OS</span>
          </div>
          <h1 className="mt-3" style={{ fontFamily: ANTON, fontSize: "clamp(40px,6vw,78px)", lineHeight: 0.95, maxWidth: "15ch" }}>
            La escena no cabe<br className="hidden md:inline" /> en un grupo de WhatsApp<span className="text-orange">.</span>
          </h1>
          <p className="mt-5 text-[17px] text-fg-muted" style={{ maxWidth: "52ch" }}>
            Perfiles reales, sets que puedes escuchar y contacto directo con el artista. Sin comisión, sin intermediarios y sin perseguir a nadie por DM.
          </p>

          {/* Línea de tracción real — solo cuando hay masa (≥25 DJs) */}
          {showTraction && (
            <div className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-ink">{allDjs.length}</span> DJs
              <span className="text-orange">·</span>
              <span className="text-ink">{cities.length}</span> {cities.length === 1 ? "ciudad" : "ciudades"}
              <span className="text-orange">·</span> sin comisión
            </div>
          )}

          {/* Afordancia de búsqueda — la barra es un Link real a /dj; los chips
              son géneros reales del directorio. */}
          {topGenres.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2 items-center bg-white border-2 border-ink p-3 max-w-[720px]">
              <Link href="/dj" className="flex-1 min-w-[170px] flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.04em] text-fg-subtle hover:text-ink transition-colors">
                <Search className="w-3.5 h-3.5 shrink-0" /> Busca por sonido o ciudad…
              </Link>
              {topGenres.map((g) => (
                <Link key={g.genre} href={genresHref([g.genre])} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] border-2 border-ink px-2.5 py-1 bg-cream hover:bg-orange transition-colors">
                  {g.genre}
                </Link>
              ))}
            </div>
          )}

          {/* DOS PUERTAS (único lugar con CTA fuerte) */}
          <div className="grid md:grid-cols-2 mt-10 border-2 border-ink">
            <div className="bg-ink text-cream p-7 md:p-8 border-b-2 md:border-b-0 md:border-r-2 border-orange">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">— Eres DJ</div>
              <h2 className="mt-2.5 mb-3.5" style={{ fontFamily: ANTON, fontSize: "clamp(28px,3.4vw,40px)", lineHeight: 0.95 }}>
                Toma el control<br />de tu carrera<span className="text-orange">.</span>
              </h2>
              <p className="text-sm opacity-90 mb-4">El sistema operativo para DJs independientes: tu press kit, tus bookings y tu carrera en un solo lugar.</p>
              <Link href="/beta" className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-orange text-ink border-2 border-orange font-mono text-[12px] font-bold uppercase tracking-[0.14em] hover:bg-cream hover:border-cream transition-colors">
                Solicitar invitación →
              </Link>
              <div className="mt-3.5 font-mono text-[10px] tracking-[0.14em] text-cream/55">
                ¿Ya tienes invitación? <Link href="/login" className="text-orange underline">Entra aquí</Link>
              </div>
            </div>
            <div className="bg-white text-ink p-7 md:p-8">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">— Eres booker</div>
              <h2 className="mt-2.5 mb-3.5" style={{ fontFamily: ANTON, fontSize: "clamp(28px,3.4vw,40px)", lineHeight: 0.95 }}>
                Encuentra al DJ<br />indicado<span className="text-orange">.</span>
              </h2>
              <p className="text-sm text-fg-muted mb-4">Filtra por género, ciudad, disponibilidad y presupuesto. Escucha antes de escribir. Envía tu solicitud directo, sin comisión.</p>
              <Link href="/dj" className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-ink text-cream border-2 border-ink font-mono text-[12px] font-bold uppercase tracking-[0.14em] hover:bg-orange hover:text-ink transition-colors">
                Buscar DJs →
              </Link>
              <div className="mt-3.5 font-mono text-[10px] tracking-[0.14em] text-fg-subtle">
                Explorar es gratis · <Link href="/signup/booker" className="text-orange underline">crea tu cuenta booker</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPA 2 · SUENA AHORA (DJs reales) */}
      {suena.length > 0 && (
        <section className="max-w-[1140px] mx-auto px-6 py-16">
          <div className="flex items-end justify-between gap-4 mb-7">
            <h2 style={{ fontFamily: ANTON, fontSize: 34, lineHeight: 0.9 }}>SUENA AHORA</h2>
            <Link href="/dj" className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] border-b-2 border-orange pb-0.5 hover:text-orange transition-colors">Ver todo el directorio →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {suena.map((dj, i) => (
              <SuenaCard key={dj.user_id} dj={dj} className={i >= 4 ? "max-sm:hidden" : ""} />
            ))}
          </div>
        </section>
      )}

      {/* CAPA 2.5 · PRÓXIMOS EVENTOS (para los fans — RSVP sin cuenta) */}
      {eventos.length > 0 && (
        <section id="eventos" className="scroll-mt-[78px] border-y-2 border-ink bg-white">
          <div className="max-w-[1140px] mx-auto px-6 py-16">
            <div className="flex items-end justify-between gap-4 mb-2.5">
              <h2 style={{ fontFamily: ANTON, fontSize: 34, lineHeight: 0.9 }}>PRÓXIMOS EVENTOS</h2>
              <Link href="/eventos" className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] border-b-2 border-orange pb-0.5 hover:text-orange transition-colors">Ver todos los eventos →</Link>
            </div>
            <p className="text-sm text-fg-muted mb-7" style={{ maxWidth: "56ch" }}>
              Fiestas y shows de la escena. Confirma tu asistencia sin crear cuenta — y entérate cuando tu DJ anuncie el próximo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {eventos.map((ev) => <EventCard key={ev.public_token} ev={ev} />)}
            </div>
          </div>
        </section>
      )}

      {/* CAPA 3 · CURADURÍA + RANKING */}
      {(collections.length > 0 ||
        (ranking.mode === "followed" && ranking.items.length > 0)) && (
        <section id="curaduria" className="scroll-mt-[78px] border-y-2 border-ink" style={{ background: "#E8E1D3" }}>
          <div className="max-w-[1140px] mx-auto px-6 py-16">
            {collections.length > 0 && (
              <>
                <div className="flex items-end justify-between gap-4 mb-7">
                  <h2 style={{ fontFamily: ANTON, fontSize: 34, lineHeight: 0.9 }}>DROP. RECOMIENDA</h2>
                  <Link href="/dj" className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] border-b-2 border-orange pb-0.5 hover:text-orange transition-colors">Ver el directorio →</Link>
                </div>
                <div className="grid md:grid-cols-3 gap-3.5 mb-14">
                  {collections.map((c) => (
                    <Link key={c.title} href={genresHref(c.genres)} className="bg-ink text-cream border-2 border-ink p-5 min-h-[150px] flex flex-col justify-between hover:bg-[#161616] transition-colors">
                      <span className="self-start font-mono text-[9px] font-bold uppercase tracking-[0.12em] bg-orange text-ink px-1.5 py-0.5">drop. recomienda</span>
                      <div>
                        <h3 className="mt-4 mb-2" style={{ fontFamily: ANTON, fontSize: 24, lineHeight: 0.98 }}>{c.title}</h3>
                      </div>
                      <p className="text-[13px] text-cream/70 mb-3.5">{c.desc}</p>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">{c.count} {c.count === 1 ? "DJ" : "DJs"} · abrir en el directorio →</span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {ranking.mode === "followed" && ranking.items.length > 0 && (
              <>
                <div className="mb-5"><h2 style={{ fontFamily: ANTON, fontSize: 28, lineHeight: 0.9 }}>{ranking.label.toUpperCase()}</h2></div>
                <div className="border-2 border-ink bg-white">
                  {ranking.items.map((dj, i) => (
                    <Link key={dj.user_id} href={`/p/${dj.public_slug}`} className="flex items-center gap-4 px-4 py-3.5 border-b-2 border-ink last:border-b-0 hover:bg-[#E8E1D3] transition-colors group">
                      <span className="w-10 shrink-0 group-hover:text-orange transition-colors" style={{ fontFamily: ANTON, fontSize: 26 }}>{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <div style={{ fontFamily: ANTON, fontSize: 18 }}>{dj.artist_name}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle truncate">
                          {(dj.genres[0] || "DJ")}{dj.city ? ` · ${dj.city}` : ""}{dj.country ? `, ${dj.country.toUpperCase()}` : ""}
                        </div>
                      </div>
                      <span className="ml-auto font-mono text-[11px] text-fg-muted shrink-0">
                        {ranking.mode === "followed" && dj.followers_count != null
                          ? <><b className="text-ink">{dj.followers_count}</b> seguidores</>
                          : dj.is_verified ? "✓ Verificado" : dj.is_drop_pick ? "★ DROP Pick" : "Nuevo"}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* CAPA 4 · CÓMO FUNCIONA */}
      <section id="conexion" className="scroll-mt-[78px] bg-white border-b-2 border-ink">
        <div className="max-w-[1140px] mx-auto px-6 py-16">
          <div className="mb-7"><h2 style={{ fontFamily: ANTON, fontSize: 34, lineHeight: 0.9 }}>BUSCA. ESCUCHA. CONTACTA.</h2></div>
          <div className="grid md:grid-cols-3 gap-3.5">
            {[
              ["01", "Busca", "Filtra por género, ciudad, disponibilidad y presupuesto. Perfiles reales, no carteles repetidos."],
              ["02", "Escucha el set", "Ve el press kit público y escucha cómo suena antes de escribir."],
              ["03", "Envía tu solicitud", "Directo al artista, con estado en vivo en tu bandeja."],
            ].map(([k, t, d], i) => (
              <div key={k} className={`px-0 md:px-6 py-2 ${i > 0 ? "md:border-l-2 border-ink" : ""}`}>
                <div className="text-orange" style={{ fontFamily: ANTON, fontSize: 46, lineHeight: 0.9 }}>{k}</div>
                <h3 className="mt-2 mb-2" style={{ fontFamily: ANTON, fontSize: 22 }}>{t}</h3>
                <p className="text-sm text-fg-muted" style={{ maxWidth: "32ch" }}>{d}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[12px] text-fg-subtle mt-6">{"// Sin comisión, sin intermediarios. drop. ordena la escena y te conecta — el trato y la fecha los cierran ustedes."}</p>
        </div>
      </section>

      {/* CAPA 5 · TODO LO QUE INCLUYE (detalle; CTA liviano, no repite el del hero) */}
      <section id="incluye" className="scroll-mt-[78px] max-w-[1140px] mx-auto px-6 py-16">
        <div className="mb-7"><h2 style={{ fontFamily: ANTON, fontSize: 34, lineHeight: 0.9 }}>TODO LO QUE INCLUYE</h2></div>
        <div className="grid md:grid-cols-2 gap-[18px]">
          <div className="bg-ink text-cream border-2 border-ink p-7 md:p-8">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">— Para DJs · The DJ OS</div>
            <h3 className="mt-2.5 mb-3.5" style={{ fontFamily: ANTON, fontSize: 30, lineHeight: 0.95 }}>Tu press kit, tus fechas, tu data<span className="text-orange">.</span></h3>
            <ul className="mb-4">
              {[
                "Press kit público en /p/tu-nombre — un link que se ve profesional",
                "Bandeja de bookings con cotización y agenda automática",
                "CRM con etiquetas, recurrencias y notas privadas",
                "Métricas de crecimiento de tus redes, todo en un lugar",
              ].map((t) => (
                <li key={t} className="text-[13.5px] text-cream/80 py-2 pl-5 relative border-b border-[#2a2a2a] last:border-b-0">
                  <span className="absolute left-1 top-1.5 text-orange font-bold">›</span>{t}
                </li>
              ))}
            </ul>
            <div className="font-mono text-[11px] text-cream/55">Beta · gratis 15 días, sin tarjeta · luego $9.990/mes</div>
            <Link href="/beta" className="inline-block mt-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-orange border-b-2 border-orange pb-0.5">Solicitar invitación →</Link>
          </div>
          <div className="bg-white text-ink border-2 border-ink p-7 md:p-8">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">— Para bookers</div>
            <h3 className="mt-2.5 mb-3.5" style={{ fontFamily: ANTON, fontSize: 30, lineHeight: 0.95 }}>Encuentra y reserva sin vueltas.</h3>
            <ul className="mb-4">
              {[
                "Búsqueda real por género, ciudad, disponibilidad y presupuesto",
                "Escucha el set antes de comprometer una fecha",
                "Favoritos: guarda tus DJs para el próximo evento",
                "Smart Match: te decimos a quién llamar para tu evento",
              ].map((t) => (
                <li key={t} className="text-[13.5px] text-fg-muted py-2 pl-5 relative border-b border-[#E8E1D3] last:border-b-0">
                  <span className="absolute left-1 top-1.5 text-orange font-bold">›</span>{t}
                </li>
              ))}
            </ul>
            <div className="font-mono text-[11px] text-fg-subtle">Explorar es gratis · Smart Match para bookers frecuentes</div>
            <Link href="/signup/booker" className="inline-block mt-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-orange border-b-2 border-orange pb-0.5">Crear cuenta booker →</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

/** Tarjeta de "Suena ahora" — server, sin client JS. Toda la tarjeta enlaza al
 *  press kit. Badge real: "Nuevo" (alta <14 días) o "Internacional" (país ≠ CL). */
function SuenaCard({ dj, className = "" }: { dj: PublicDjProfile; className?: string }) {
  const initials = dj.artist_name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const cardImg = [dj.avatar_url, dj.hero_image_url].find(isSupabaseStorageUrl) ?? "";
  const isNew = dj.created_at && Date.now() - new Date(dj.created_at).getTime() < 14 * 86400000;
  const isIntl = dj.country && !/chile/i.test(dj.country) && dj.country.toUpperCase() !== "CL";
  const tag = isNew ? "Nuevo" : isIntl ? "Internacional" : null;

  return (
    <Link href={`/p/${dj.public_slug}`} className={`group border-2 border-ink bg-white flex flex-col hover:shadow-[6px_6px_0_#FF5C00] transition-all ${className}`}>
      <div className="relative aspect-square bg-ink flex items-center justify-center overflow-hidden border-b-2 border-ink">
        {cardImg ? (
          <Image src={cardImg} alt={dj.artist_name} fill sizes="(max-width:640px) 50vw, 280px" className="object-cover" quality={85} />
        ) : (
          <span style={{ fontFamily: ANTON, fontSize: 44, color: "#F4EFE7" }}>{initials || "DJ"}<span style={{ color: "#FF5C00" }}>.</span></span>
        )}
        {/* Disponible = badge PRIMARIO sólido (unificado con /dj; legible sobre foto) */}
        {dj.is_available_now && (
          <span className="absolute top-0 left-0 font-mono text-[9px] font-bold uppercase tracking-[0.1em] bg-orange text-ink px-2 py-0.5 border-r-2 border-b-2 border-ink">★ Disponible</span>
        )}
        {/* Nuevo/Internacional = secundario blanco/tinta */}
        {tag && (
          <span className="absolute top-0 right-0 font-mono text-[9px] font-bold uppercase tracking-[0.1em] bg-white text-ink px-2 py-0.5 border-l-2 border-b-2 border-ink">{tag}</span>
        )}
      </div>
      <div className="p-3">
        {dj.genres[0] && <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-fg-muted truncate">{dj.genres[0]}</div>}
        <div className="mt-0.5 truncate" style={{ fontFamily: ANTON, fontSize: 20, textTransform: "uppercase" }}>{dj.artist_name}</div>
        <div className="flex items-center justify-between mt-2 font-mono text-[11px] text-fg-subtle">
          <span className="truncate">{dj.city || "—"}{dj.country ? `, ${dj.country.toUpperCase()}` : ""}</span>
          <span className="text-ink font-bold group-hover:text-orange transition-colors shrink-0 ml-2">Ver →</span>
        </div>
      </div>
    </Link>
  );
}
