"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DjProfile, DjProfileUpdate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { saveProfileAction } from "./actions";
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
      public_email: form.public_email,
      whatsapp: form.whatsapp,
      tech_rider_ideal: form.tech_rider_ideal,
      tech_rider_alt: form.tech_rider_alt,
      hospitality: form.hospitality,
    };

    startTransition(async () => {
      const result = await saveProfileAction(patch);
      if (result.ok) {
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
              placeholder="https://jayportu.com"
            />
          </div>
        </div>
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
              placeholder="hola@jayportu.com"
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

      {/* Tech rider */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Tech rider & hospitality
        </h2>
        <div className="space-y-2">
          <Label htmlFor="tech_rider_ideal">Tech rider ideal</Label>
          <Textarea
            id="tech_rider_ideal"
            value={form.tech_rider_ideal}
            onChange={(e) => update("tech_rider_ideal", e.target.value)}
            rows={3}
            placeholder="1x Pioneer DJM-V10 + 3x CDJ-3000 (LINKED) + 1x Booth monitor"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tech_rider_alt">Tech rider alternativo</Label>
          <Textarea
            id="tech_rider_alt"
            value={form.tech_rider_alt}
            onChange={(e) => update("tech_rider_alt", e.target.value)}
            rows={3}
            placeholder="1x Allen & Heath Xone 92/96 + 3x XDJ-1000MK2 (LINKED) + 1x Booth monitor"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hospitality">Hospitality</Label>
          <Textarea
            id="hospitality"
            value={form.hospitality}
            onChange={(e) => update("hospitality", e.target.value)}
            rows={2}
            placeholder="Agua mineral con gas · Red Bull Sugar Free"
          />
        </div>
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
