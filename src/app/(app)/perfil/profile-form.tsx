"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DjProfile, DjProfileUpdate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { saveProfileAction } from "../configuracion/actions";
import { AvatarUpload } from "./avatar-upload";
import { X } from "lucide-react";

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
  const [aliasInput, setAliasInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function update<K extends keyof DjProfileUpdate>(
    field: K,
    value: DjProfileUpdate[K]
  ) {
    setForm((f) => ({ ...f, [field]: value }));
  }

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
      website: form.website,
      featured_sets: form.featured_sets,
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
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error || "Error al guardar." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Identidad */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Identidad
        </h2>
        <AvatarUpload
          initialUrl={form.avatar_url}
          artistName={form.artist_name}
        />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="artist_name">Nombre artístico *</Label>
            <Input
              id="artist_name"
              value={form.artist_name}
              onChange={(e) => update("artist_name", e.target.value)}
              placeholder="JAY PORTU"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="DJ chileno · House & Tech House"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio_short">Bio corta (1-2 líneas)</Label>
          <Textarea
            id="bio_short"
            value={form.bio_short}
            onChange={(e) => update("bio_short", e.target.value)}
            rows={2}
            placeholder="Para usar en cards y previews."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio_long">Bio larga (para press kit)</Label>
          <Textarea
            id="bio_long"
            value={form.bio_long}
            onChange={(e) => update("bio_long", e.target.value)}
            rows={6}
            placeholder="Texto completo para el press kit público."
          />
        </div>
      </Card>

      {/* Estilos musicales */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Estilos musicales
        </h2>
        <div className="space-y-2">
          <Label>Géneros</Label>
          <div className="flex flex-wrap gap-2">
            {form.genres.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1 px-3 py-1 bg-accent-soft text-accent border border-accent/30 rounded-full text-xs font-medium"
              >
                {g}
                <button
                  type="button"
                  onClick={() => removeGenre(g)}
                  className="hover:text-fg"
                  aria-label={`Quitar ${g}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
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
              variant="outline"
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
                className="text-xs px-2 py-1 rounded border border-border text-fg-muted hover:border-accent hover:text-accent transition-colors"
              >
                + {g}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Ubicación */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Ubicación
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Canales públicos */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Canales públicos
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram URL</Label>
            <Input
              id="instagram_url"
              value={form.instagram_url}
              onChange={(e) => update("instagram_url", e.target.value)}
              placeholder="https://instagram.com/jay_portu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="soundcloud_url">SoundCloud URL</Label>
            <Input
              id="soundcloud_url"
              value={form.soundcloud_url}
              onChange={(e) => update("soundcloud_url", e.target.value)}
              placeholder="https://soundcloud.com/jay-portu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube_url">YouTube URL</Label>
            <Input
              id="youtube_url"
              value={form.youtube_url}
              onChange={(e) => update("youtube_url", e.target.value)}
              placeholder="https://youtube.com/@jayportu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spotify_url">Spotify URL</Label>
            <Input
              id="spotify_url"
              value={form.spotify_url}
              onChange={(e) => update("spotify_url", e.target.value)}
              placeholder="https://open.spotify.com/artist/..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://tunombre.com"
            />
          </div>
        </div>
      </Card>

      {/* Sets destacados (Fase 1 · 1B) */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Sets destacados
        </h2>
        <p className="text-sm text-fg-muted">
          Hasta 4 sets o mixes para mostrar en tu press kit (SoundCloud,
          Mixcloud o YouTube). Se embeben solos según la plataforma.
        </p>
        {(form.featured_sets ?? []).length > 0 && (
          <div className="space-y-2">
            {(form.featured_sets ?? []).map((s) => (
              <div
                key={s}
                className="flex items-center gap-2 border border-border px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate text-fg-muted">{s}</span>
                <button
                  type="button"
                  onClick={() => removeSet(s)}
                  className="hover:text-fg shrink-0"
                  aria-label={`Quitar ${s}`}
                >
                  <X className="w-3.5 h-3.5" />
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
              variant="outline"
              onClick={() => addSet(setUrlInput)}
            >
              Agregar
            </Button>
          </div>
        )}
      </Card>

      {/* Trayectoria & identidad (Fase 1 · 1C + 1D) */}
      <Card className="p-6 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Trayectoria & identidad
        </h2>

        {/* Alias / proyectos */}
        <div className="space-y-2">
          <Label>Alias / proyectos (b2b, otros nombres)</Label>
          {(form.aliases ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(form.aliases ?? []).map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-sm"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => removeAlias(a)}
                    className="hover:text-fg"
                    aria-label={`Quitar ${a}`}
                  >
                    <X className="w-3 h-3" />
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
              variant="outline"
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
          <p className="text-xs text-fg-muted">
            Aparecen como sellos de confianza en tu press kit.
          </p>
          {(form.brands_worked ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(form.brands_worked ?? []).map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-sm"
                >
                  {b}
                  <button
                    type="button"
                    onClick={() => removeBrand(b)}
                    className="hover:text-fg"
                    aria-label={`Quitar ${b}`}
                  >
                    <X className="w-3 h-3" />
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
              variant="outline"
              onClick={() => addBrand(brandInput)}
            >
              Agregar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tarifa referencial (Fase 1 · 1E) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
              Tarifa referencial
            </h2>
            <p className="text-sm text-fg-muted mt-1">
              {form.show_fee
                ? "Visible en tu press kit. Ayuda al booker a estimar antes de escribir."
                : "Oculta. Actívala solo si quieres mostrar un rango de fee."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => update("show_fee", !form.show_fee)}
            aria-label="Mostrar fee"
            className={`shrink-0 w-14 h-7 border-2 border-ink relative transition-colors ${
              form.show_fee ? "bg-orange" : "bg-cream"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-ink transition-all ${
                form.show_fee ? "left-7" : "left-0.5"
              }`}
            />
          </button>
        </div>
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
      </Card>

      {/* Contacto público */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Contacto público (visible en press kit y formularios)
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="public_email">Email de booking</Label>
            <Input
              id="public_email"
              type="email"
              value={form.public_email}
              onChange={(e) => update("public_email", e.target.value)}
              placeholder="tunombre@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp (con código país, sin +)</Label>
            <Input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="56988188531"
            />
          </div>
        </div>
      </Card>

      {/* Tech rider — movido a Configuración (editor estructurado) */}
      <Card className="p-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Tech rider & hospitality
        </h2>
        <p className="text-sm text-fg-muted">
          Tu tech rider y hospitality ahora se editan desde el{" "}
          <strong>editor estructurado</strong> en Configuración: cada equipo
          con su categoría, cantidad y alternativo. Eso alimenta tu press kit
          y el stage plot automático.
        </p>
        <a
          href="/configuracion#tech-rider"
          className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-ink bg-cream hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors w-fit"
        >
          Editar tech rider →
        </a>
      </Card>

      {/* Submit */}
      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border border-border rounded-xl p-4 flex items-center justify-between gap-4">
        {message && (
          <div
            className={`text-sm ${
              message.type === "ok" ? "text-success" : "text-danger"
            }`}
          >
            {message.text}
          </div>
        )}
        <div className="ml-auto">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
