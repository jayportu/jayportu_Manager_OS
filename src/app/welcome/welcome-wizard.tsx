"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Users,
  TrendingUp,
  Calendar,
  FileText,
  Instagram,
  Music,
  Youtube,
} from "lucide-react";
import {
  saveIdentity,
  saveSocials,
  completeOnboarding,
  type IdentityInput,
  type SocialsInput,
} from "./actions";

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

type Step = 1 | 2 | 3;

interface WelcomeWizardProps {
  initialIdentity: IdentityInput;
  initialSocials: SocialsInput;
}

export function WelcomeWizard({
  initialIdentity,
  initialSocials,
}: WelcomeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [identity, setIdentity] = useState<IdentityInput>(initialIdentity);
  const [socials, setSocials] = useState<SocialsInput>(initialSocials);
  const [genreInput, setGenreInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function nextStep() {
    setError(null);
    if (step === 1) {
      if (!identity.artist_name.trim()) {
        setError("Necesitas un nombre artístico para empezar");
        return;
      }
      startTransition(async () => {
        try {
          await saveIdentity(identity);
          setStep(2);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error al guardar");
        }
      });
    } else if (step === 2) {
      const hasAny =
        socials.instagram_url.trim() ||
        socials.spotify_url.trim() ||
        socials.youtube_url.trim() ||
        socials.soundcloud_username.trim();
      if (!hasAny) {
        setError("Conecta al menos una red para continuar");
        return;
      }
      startTransition(async () => {
        try {
          await saveSocials(socials);
          setStep(3);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error al guardar");
        }
      });
    } else {
      startTransition(async () => {
        try {
          await completeOnboarding();
          router.refresh();
          router.push("/dashboard");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error al finalizar");
        }
      });
    }
  }

  function prevStep() {
    setError(null);
    if (step > 1) setStep((step - 1) as Step);
  }

  function addGenre(g: string) {
    const trimmed = g.trim();
    if (!trimmed) return;
    if (identity.genres.includes(trimmed)) return;
    if (identity.genres.length >= 8) return;
    setIdentity((s) => ({ ...s, genres: [...s.genres, trimmed] }));
    setGenreInput("");
  }

  function removeGenre(g: string) {
    setIdentity((s) => ({ ...s, genres: s.genres.filter((x) => x !== g) }));
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Logo variant="wordmark" tone="ink" size={96} priority />
          <div className="text-[10px] uppercase tracking-[0.3em] text-fg-subtle mt-2 font-mono">
            — The DJ OS
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === step
                  ? "w-12 bg-accent"
                  : n < step
                  ? "w-8 bg-accent/60"
                  : "w-8 bg-border"
              }`}
            />
          ))}
        </div>
        <div className="text-center text-[10px] uppercase tracking-widest text-fg-subtle mb-6">
          Paso {step} de 3
        </div>

        <Card className="p-8">
          {step === 1 && (
            <StepIdentity
              identity={identity}
              setIdentity={setIdentity}
              genreInput={genreInput}
              setGenreInput={setGenreInput}
              addGenre={addGenre}
              removeGenre={removeGenre}
            />
          )}
          {step === 2 && (
            <StepSocials socials={socials} setSocials={setSocials} />
          )}
          {step === 3 && <StepDone artistName={identity.artist_name} />}

          {error && (
            <div className="mt-4 text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isPending}
              >
                <ArrowLeft className="w-4 h-4" />
                Atrás
              </Button>
            )}
            <Button
              type="button"
              onClick={nextStep}
              disabled={isPending}
              className="flex-1"
            >
              {isPending
                ? "Guardando…"
                : step === 3
                ? "Empezar"
                : "Continuar"}
              {!isPending && step < 3 && <ArrowRight className="w-4 h-4" />}
              {!isPending && step === 3 && <Check className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        <div className="text-center mt-6 text-[10px] uppercase tracking-widest text-fg-subtle font-mono">
          DROP. · THE DJ OS · v0.13
        </div>
      </div>
    </div>
  );
}

function StepIdentity({
  identity,
  setIdentity,
  genreInput,
  setGenreInput,
  addGenre,
  removeGenre,
}: {
  identity: IdentityInput;
  setIdentity: (s: IdentityInput | ((prev: IdentityInput) => IdentityInput)) => void;
  genreInput: string;
  setGenreInput: (s: string) => void;
  addGenre: (g: string) => void;
  removeGenre: (g: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">
          ¿Quién eres?
        </h1>
        <p className="text-sm text-fg-muted">
          Empezamos con lo básico. Esto define cómo te ve la app y cómo
          aparece tu nombre en el press kit.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="artist_name">Nombre artístico *</Label>
        <Input
          id="artist_name"
          placeholder="Ej. Jay Portu"
          value={identity.artist_name}
          onChange={(e) =>
            setIdentity((s) => ({ ...s, artist_name: e.target.value }))
          }
          autoFocus
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">Ciudad</Label>
        <Input
          id="city"
          placeholder="Santiago"
          value={identity.city}
          onChange={(e) =>
            setIdentity((s) => ({ ...s, city: e.target.value }))
          }
          maxLength={40}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="genres">Géneros (opcional)</Label>
        <div className="flex gap-2">
          <Input
            id="genres"
            placeholder="Agrega un género"
            value={genreInput}
            onChange={(e) => setGenreInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGenre(genreInput);
              }
            }}
            maxLength={30}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addGenre(genreInput)}
            disabled={!genreInput.trim() || identity.genres.length >= 8}
          >
            Agregar
          </Button>
        </div>
        {identity.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {identity.genres.map((g) => (
              <span
                key={g}
                className="text-xs px-2 py-1 rounded bg-accent-soft border border-accent/30 text-accent inline-flex items-center gap-1"
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
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {GENRE_SUGGESTIONS.filter((g) => !identity.genres.includes(g)).map(
            (g) => (
              <button
                key={g}
                type="button"
                onClick={() => addGenre(g)}
                disabled={identity.genres.length >= 8}
                className="text-[11px] px-2 py-1 rounded border border-border text-fg-muted hover:border-accent/40 hover:text-fg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + {g}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function StepSocials({
  socials,
  setSocials,
}: {
  socials: SocialsInput;
  setSocials: (s: SocialsInput | ((prev: SocialsInput) => SocialsInput)) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">
          Conecta tu música
        </h1>
        <p className="text-sm text-fg-muted">
          Al menos una red social. Si pones tu usuario de SoundCloud, la app
          actualiza tus seguidores automáticamente todos los días.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="soundcloud_username" className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5 text-accent" />
          SoundCloud (usuario)
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted whitespace-nowrap">
            soundcloud.com/
          </span>
          <Input
            id="soundcloud_username"
            placeholder="jay_portu"
            value={socials.soundcloud_username}
            onChange={(e) =>
              setSocials((s) => ({
                ...s,
                soundcloud_username: e.target.value,
              }))
            }
            maxLength={60}
          />
        </div>
        <p className="text-[11px] text-fg-subtle">
          Solo el usuario, sin URL. La app activa auto-sync diario.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagram_url" className="flex items-center gap-2">
          <Instagram className="w-3.5 h-3.5" />
          Instagram (URL)
        </Label>
        <Input
          id="instagram_url"
          type="url"
          placeholder="https://instagram.com/tu_handle"
          value={socials.instagram_url}
          onChange={(e) =>
            setSocials((s) => ({ ...s, instagram_url: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="spotify_url" className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5" />
          Spotify (URL de artista)
        </Label>
        <Input
          id="spotify_url"
          type="url"
          placeholder="https://open.spotify.com/artist/…"
          value={socials.spotify_url}
          onChange={(e) =>
            setSocials((s) => ({ ...s, spotify_url: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtube_url" className="flex items-center gap-2">
          <Youtube className="w-3.5 h-3.5" />
          YouTube (URL del canal)
        </Label>
        <Input
          id="youtube_url"
          type="url"
          placeholder="https://youtube.com/@tu_canal"
          value={socials.youtube_url}
          onChange={(e) =>
            setSocials((s) => ({ ...s, youtube_url: e.target.value }))
          }
        />
      </div>
    </div>
  );
}

function StepDone({ artistName }: { artistName: string }) {
  const sections = [
    {
      icon: Users,
      title: "CRM",
      desc: "Tus contactos: bookers, productores, fellow DJs. Cada uno con su historial.",
    },
    {
      icon: TrendingUp,
      title: "Growth",
      desc: "Tus stats por plataforma + posts y campañas.",
    },
    {
      icon: Calendar,
      title: "Calendario",
      desc: "Tus gigs sincronizados con Google Calendar.",
    },
    {
      icon: FileText,
      title: "Press kit",
      desc: "Tu página pública con bio, música y formulario de booking.",
    },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight mb-1">
          Listo{artistName ? `, ${artistName.trim()}` : ""}
        </h1>
        <p className="text-sm text-fg-muted">
          Esto es lo que tienes a tu disposición. Puedes empezar por donde
          prefieras.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="flex gap-3 p-3 rounded-lg bg-bg border border-border"
            >
              <div className="w-8 h-8 rounded-md bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-fg">{s.title}</div>
                <div className="text-[11px] text-fg-muted leading-snug mt-0.5">
                  {s.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-fg-subtle text-center">
        Puedes ajustar todo más adelante en /configuracion.
      </p>
    </div>
  );
}
