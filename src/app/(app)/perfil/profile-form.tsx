"use client";

import { useState, useTransition, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import type { DjProfile, DjProfileUpdate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassPanel, MonoLabel, ClayChip, Toggle, Alert } from "@/components/hos";
import { saveProfileAction } from "../configuracion/actions";
import { AvatarUpload } from "./avatar-upload";
import { GallerySection } from "./gallery-section";
import { computeCompleteness } from "@/lib/match/completeness";
import { X, TrendingUp, Check, AlertCircle } from "lucide-react";

// Memoizados: solo re-renderizan si cambian SUS props (avatar/artistName/
// gallery), no en cada tecla de otros campos del form. Ambos usan sus props
// únicamente como estado inicial (useState(prop)), así que memoizar no cambia
// comportamiento — solo evita re-renders innecesarios.
const AvatarUploadMemo = memo(AvatarUpload);
const GallerySectionMemo = memo(GallerySection);

const GENRE_SUGGESTIONS = [
  "House",
  "Tech House",
  "Jackin",
  "Progressive",
  "Melodic Techno",
  "Minimal",
  "Funky House",
  "Nu Disco",
  "Deep House",
  "Afro House",
];

interface ProfileFormProps {
  initialProfile: DjProfile;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<DjProfile>(initialProfile);
  const [genreInput, setGenreInput] = useState("");
  const [setUrlInput, setSetUrlInput] = useState("");
  const [releaseInput, setReleaseInput] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function update<K extends keyof DjProfileUpdate>(
    field: K,
    value: DjProfileUpdate[K]
  ) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Callback estable para AvatarUpload (memoizado) — evita recrear la función
  // en cada render, que anularía el memo del hijo.
  const handleAvatarChange = useCallback(
    (url: string) => setForm((f) => ({ ...f, avatar_url: url })),
    []
  );
  // Referencia estable de la galería (antes `form.gallery ?? []` creaba un
  // array nuevo por render).
  const galleryInitial = useMemo(() => form.gallery ?? [], [form.gallery]);

  function addGenre(g: string) {
    const trimmed = g.trim();
    if (!trimmed) return;
    if (form.genres.includes(trimmed)) return;
    update("genres", [...form.genres, trimmed]);
    setGenreInput("");
  }

  function removeGenre(g: string) {
    update("genres", form.genres.filter((x) => x !== g));
  }

  function addSet(u: string) {
    const trimmed = u.trim();
    if (!trimmed) return;
    const current = form.featured_sets ?? [];
    if (current.includes(trimmed) || current.length >= 4) return;
    update("featured_sets", [...current, trimmed]);
    setSetUrlInput("");
  }

  function removeSet(u: string) {
    update("featured_sets", (form.featured_sets ?? []).filter((x) => x !== u));
  }

  function addRelease(u: string) {
    const trimmed = u.trim();
    if (!trimmed) return;
    const current = form.beatport_releases ?? [];
    if (current.includes(trimmed) || current.length >= 6) return;
    update("beatport_releases", [...current, trimmed]);
    setReleaseInput("");
  }

  function removeRelease(u: string) {
    update("beatport_releases", (form.beatport_releases ?? []).filter((x) => x !== u));
  }

  function addAlias(v: string) {
    const t = v.trim();
    const cur = form.aliases ?? [];
    if (!t || cur.includes(t) || cur.length >= 6) return;
    update("aliases", [...cur, t]);
    setAliasInput("");
  }

  function removeAlias(v: string) {
    update("aliases", (form.aliases ?? []).filter((x) => x !== v));
  }

  function addBrand(v: string) {
    const t = v.trim();
    const cur = form.brands_worked ?? [];
    if (!t || cur.includes(t) || cur.length >= 12) return;
    update("brands_worked", [...cur, t]);
    setBrandInput("");
  }

  function removeBrand(v: string) {
    update("brands_worked", (form.brands_worked ?? []).filter((x) => x !== v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const patch: DjProfileUpdate = {
      artist_name: form.artist_name,
      tagline: form.tagline,
      bio_short: form.bio_short,
      bio_long: form.bio_long,
      genres: form.genres,
      city: form.city,
      country: form.country,
      instagram_url: form.instagram_url,
      soundcloud_url: form.soundcloud_url,
      youtube_url: form.youtube_url,
      spotify_url: form.spotify_url,
      beatport_url: form.beatport_url,
      bandcamp_url: form.bandcamp_url,
      website: form.website,
      featured_sets: form.featured_sets,
      beatport_releases: form.beatport_releases,
      brands_worked: form.brands_worked,
      aliases: form.aliases,
      record_label: form.record_label,
      show_fee: form.show_fee,
      fee_min: form.fee_min,
      fee_max: form.fee_max,
      public_email: form.public_email,
      whatsapp: form.whatsapp,
      // tech_rider_ideal / tech_rider_alt / hospitality: legacy fields,
      // ya NO se editan desde acá (movido a /configuracion · tech rider).
      // Las columnas quedan en DB con su valor anterior por back-compat.
    };

    startTransition(async () => {
      const result = await saveProfileAction(patch);
      if (result.ok) {
        // Re-sincronizar los inputs con lo que realmente quedó guardado
        // (URLs con https:// agregado, fee corregido), no lo que se tipeó.
        setForm((f) => ({ ...f, ...result.normalized }) as DjProfile);
        setMessage({ type: "ok", text: "Guardado." });
        setTimeout(() => setMessage(null), 3000); // que no quede colgado
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error || "Error al guardar." });
      }
    });
  }

  // Completitud del perfil (live, según lo que está en el form). Mismo cálculo
  // que usa Smart Match para rankear → el incentivo calza con la realidad.
  const completeness = computeCompleteness(form);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Visibilidad — más completo = más arriba en Smart Match */}
      {completeness.percent < 100 && (
        <div className="rounded-xl border border-orange/25 bg-orange/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-orange" />
            <span className="text-sm font-semibold text-white/90">
              Tu perfil está {completeness.percent}% completo
            </span>
          </div>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-orange transition-all"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          <p className="text-xs text-white/55">
            Mientras más completo, más arriba apareces en las búsquedas de
            bookers (Smart Match).
            {completeness.missing.length > 0 && (
              <>
                {" "}
                Te falta:{" "}
                <span className="font-medium text-white/85">
                  {completeness.missing.slice(0, 3).join(", ")}
                </span>
                .
              </>
            )}
          </p>
        </div>
      )}

      {/* Identidad */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Identidad</MonoLabel>
          <AvatarUploadMemo
            initialUrl={form.avatar_url}
            artistName={form.artist_name}
            onChange={handleAvatarChange}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="artist_name">Nombre artístico *</Label>
              <Input
                id="artist_name"
                value={form.artist_name ?? ""}
                onChange={(e) => update("artist_name", e.target.value)}
                placeholder="JAY PORTU"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline ?? ""}
                onChange={(e) => update("tagline", e.target.value)}
                placeholder="DJ chileno · House & Tech House"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio_short">Bio corta (1-2 líneas)</Label>
            <Textarea
              id="bio_short"
              value={form.bio_short ?? ""}
              onChange={(e) => update("bio_short", e.target.value)}
              rows={2}
              placeholder="Para usar en cards y previews."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio_long">Bio larga (para press kit)</Label>
            <Textarea
              id="bio_long"
              value={form.bio_long ?? ""}
              onChange={(e) => update("bio_long", e.target.value)}
              rows={6}
              placeholder="Texto completo para el press kit público."
            />
          </div>
        </div>
      </GlassPanel>

      {/* Galería */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Galería</MonoLabel>
          <p className="text-sm text-white/55">
            Fotos para tu press kit público. Organízalas en carpetas (ej. Live,
            Estudio) y se muestran con un visor a tamaño real.
          </p>
          <GallerySectionMemo initialGallery={galleryInitial} />
        </div>
      </GlassPanel>

      {/* Estilos musicales */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Estilos musicales</MonoLabel>
          <div className="space-y-2">
            <Label>Géneros</Label>
            <div className="flex flex-wrap gap-2">
              {form.genres.map((g) => (
                <ClayChip key={g} active>
                  <span className="inline-flex items-center gap-1.5">
                    {g}
                    <button
                      type="button"
                      onClick={() => removeGenre(g)}
                      className="transition-opacity hover:opacity-60"
                      aria-label={`Quitar ${g}`}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                </ClayChip>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGenre(genreInput);
                  }
                }}
                placeholder="Agregar género y Enter"
              />
              <Button
                type="button"
                variant="clay"
                onClick={() => addGenre(genreInput)}
              >
                Agregar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {GENRE_SUGGESTIONS.filter((g) => !form.genres.includes(g)).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => addGenre(g)}
                  className="rounded-full transition-transform active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]"
                >
                  <ClayChip>+ {g}</ClayChip>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Ubicación */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Ubicación</MonoLabel>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={form.city ?? ""}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={form.country ?? ""}
                onChange={(e) => update("country", e.target.value)}
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Canales públicos */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Canales públicos</MonoLabel>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                value={form.instagram_url ?? ""}
                onChange={(e) => update("instagram_url", e.target.value)}
                placeholder="https://instagram.com/jay_portu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="soundcloud_url">SoundCloud URL</Label>
              <Input
                id="soundcloud_url"
                value={form.soundcloud_url ?? ""}
                onChange={(e) => update("soundcloud_url", e.target.value)}
                placeholder="https://soundcloud.com/jay-portu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_url">YouTube URL</Label>
              <Input
                id="youtube_url"
                value={form.youtube_url ?? ""}
                onChange={(e) => update("youtube_url", e.target.value)}
                placeholder="https://youtube.com/@jayportu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spotify_url">Spotify URL</Label>
              <Input
                id="spotify_url"
                value={form.spotify_url ?? ""}
                onChange={(e) => update("spotify_url", e.target.value)}
                placeholder="https://open.spotify.com/artist/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beatport_url">Beatport URL</Label>
              <Input
                id="beatport_url"
                value={form.beatport_url ?? ""}
                onChange={(e) => update("beatport_url", e.target.value)}
                placeholder="https://www.beatport.com/artist/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bandcamp_url">Bandcamp URL</Label>
              <Input
                id="bandcamp_url"
                value={form.bandcamp_url ?? ""}
                onChange={(e) => update("bandcamp_url", e.target.value)}
                placeholder="https://tunombre.bandcamp.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website ?? ""}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://tunombre.com"
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Sets destacados (Fase 1 · 1B) */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Sets destacados</MonoLabel>
          <p className="text-sm text-white/55">
            Hasta 4 sets o mixes para mostrar en tu press kit (SoundCloud,
            Mixcloud o YouTube). Se embeben solos según la plataforma.
          </p>
          {(form.featured_sets ?? []).length > 0 && (
            <div className="space-y-2">
              {(form.featured_sets ?? []).map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm"
                >
                  <span className="flex-1 truncate text-white/70">{s}</span>
                  <button
                    type="button"
                    onClick={() => removeSet(s)}
                    className="shrink-0 transition-colors hover:text-danger"
                    aria-label={`Quitar ${s}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {(form.featured_sets ?? []).length < 4 && (
            <div className="flex gap-2">
              <Input
                value={setUrlInput}
                onChange={(e) => setSetUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSet(setUrlInput);
                  }
                }}
                placeholder="Pega la URL del set y Enter"
              />
              <Button
                type="button"
                variant="clay"
                onClick={() => addSet(setUrlInput)}
              >
                Agregar
              </Button>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Discografía · Beatport */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Discografía · Beatport</MonoLabel>
          <p className="text-sm text-white/55">
            Hasta 6 releases de Beatport para mostrar en tu press kit. Pega el link
            del track o release (ej: beatport.com/track/...) y se embebe el player
            oficial — con preview, BPM y tonalidad.
          </p>
          {(form.beatport_releases ?? []).length > 0 && (
            <div className="space-y-2">
              {(form.beatport_releases ?? []).map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-sm"
                >
                  <span className="flex-1 truncate text-white/70">{s}</span>
                  <button
                    type="button"
                    onClick={() => removeRelease(s)}
                    className="shrink-0 transition-colors hover:text-danger"
                    aria-label={`Quitar ${s}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {(form.beatport_releases ?? []).length < 6 && (
            <div className="flex gap-2">
              <Input
                value={releaseInput}
                onChange={(e) => setReleaseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRelease(releaseInput);
                  }
                }}
                placeholder="Pega el link de Beatport y Enter"
              />
              <Button
                type="button"
                variant="clay"
                onClick={() => addRelease(releaseInput)}
              >
                Agregar
              </Button>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Trayectoria & identidad (Fase 1 · 1C + 1D) */}
      <GlassPanel>
        <div className="space-y-5">
          <MonoLabel>Trayectoria & identidad</MonoLabel>

          {/* Alias / proyectos */}
          <div className="space-y-2">
            <Label>Alias / proyectos (b2b, otros nombres)</Label>
            {(form.aliases ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.aliases ?? []).map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-sm text-white/80"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => removeAlias(a)}
                      className="transition-colors hover:text-danger"
                      aria-label={`Quitar ${a}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAlias(aliasInput);
                  }
                }}
                placeholder="Ej: SOMBRA · JAY b2b FER"
              />
              <Button
                type="button"
                variant="clay"
                onClick={() => addAlias(aliasInput)}
              >
                Agregar
              </Button>
            </div>
          </div>

          {/* Sello */}
          <div className="space-y-2">
            <Label htmlFor="record_label">Sello / label</Label>
            <Input
              id="record_label"
              value={form.record_label ?? ""}
              onChange={(e) => update("record_label", e.target.value)}
              placeholder="Ej: Cordillera Records"
            />
          </div>

          {/* Marcas / clubs */}
          <div className="space-y-2">
            <Label>Marcas y clubs con los que trabajaste</Label>
            <p className="text-xs text-white/45">
              Aparecen como sellos de confianza en tu press kit.
            </p>
            {(form.brands_worked ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(form.brands_worked ?? []).map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-sm text-white/80"
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => removeBrand(b)}
                      className="transition-colors hover:text-danger"
                      aria-label={`Quitar ${b}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBrand(brandInput);
                  }
                }}
                placeholder="Ej: Club La Feria · Corona · Lollapalooza"
              />
              <Button
                type="button"
                variant="clay"
                onClick={() => addBrand(brandInput)}
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Tarifa referencial (Fase 1 · 1E) */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Tarifa referencial</MonoLabel>
          <Toggle
            checked={form.show_fee}
            onChange={() => update("show_fee", !form.show_fee)}
            label="Mostrar tarifa en tu press kit"
            sub={
              form.show_fee
                ? "Visible en tu press kit. Ayuda al booker a estimar antes de escribir."
                : "Oculta. Actívala solo si quieres mostrar un rango de fee."
            }
          />
          {form.show_fee && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee_min">Desde (CLP)</Label>
                <Input
                  id="fee_min"
                  type="number"
                  inputMode="numeric"
                  value={form.fee_min ?? ""}
                  onChange={(e) =>
                    update("fee_min", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="300000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee_max">Hasta (CLP, opcional)</Label>
                <Input
                  id="fee_max"
                  type="number"
                  inputMode="numeric"
                  value={form.fee_max ?? ""}
                  onChange={(e) =>
                    update("fee_max", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="800000"
                />
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Contacto público */}
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Contacto público (visible en press kit y formularios)</MonoLabel>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="public_email">Email de booking</Label>
              <Input
                id="public_email"
                type="email"
                value={form.public_email ?? ""}
                onChange={(e) => update("public_email", e.target.value)}
                placeholder="tunombre@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (con código país, sin +)</Label>
              <Input
                id="whatsapp"
                value={form.whatsapp ?? ""}
                onChange={(e) => update("whatsapp", e.target.value)}
                placeholder="56988188531"
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Tech rider — se edita en Configuración (editor simple IDEAL/ALT) */}
      <GlassPanel>
        <div className="space-y-3">
          <MonoLabel>Tech rider & hospitality</MonoLabel>
          <p className="text-sm text-white/55">
            Tu tech rider y hospitality se editan en Configuración:{" "}
            <strong>un equipo por línea</strong>, en los cuadros IDEAL y
            ALTERNATIVO. Se muestran tal cual en tu press kit público.
          </p>
          <Button asChild variant="clay">
            <a href="/configuracion#tech-rider">Editar tech rider →</a>
          </Button>
        </div>
      </GlassPanel>

      {/* Submit */}
      <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-xl border border-white/12 bg-bg/95 p-4 backdrop-blur">
        {message && (
          <div role="status" aria-live="polite">
            <Alert tone={message.type === "ok" ? "success" : "danger"}>
              <span className="inline-flex items-center gap-1.5">
                {message.type === "ok" ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {message.text}
              </span>
            </Alert>
          </div>
        )}
        <div className="ml-auto">
          <Button type="submit" variant="clayPrimary" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
