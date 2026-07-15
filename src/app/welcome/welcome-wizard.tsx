"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { GlassPanel, ClayChip, Alert, FIELD } from "@/components/hos";
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
  /** Si el user ya aceptó los Términos en el signup (email/password),
   *  no le pedimos el checkbox de nuevo. Si entró por Google OAuth llega
   *  en false y se lo pedimos en el último paso. */
  tosAlreadyAccepted: boolean;
}

export function WelcomeWizard({
  initialIdentity,
  initialSocials,
  tosAlreadyAccepted,
}: WelcomeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [identity, setIdentity] = useState<IdentityInput>(initialIdentity);
  const [socials, setSocials] = useState<SocialsInput>(initialSocials);
  const [genreInput, setGenreInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tosChecked, setTosChecked] = useState(false);
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
      // Redes opcionales: se puede saltar (se agregan luego desde el perfil).
      // Guardamos lo que haya cargado (o nada) y avanzamos.
      startTransition(async () => {
        try {
          await saveSocials(socials);
          setStep(3);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error al guardar");
        }
      });
    } else {
      // Paso final: si todavía no aceptó los Términos (ej. signup con
      // Google OAuth), exigir el checkbox antes de cerrar el onboarding.
      if (!tosAlreadyAccepted && !tosChecked) {
        setError(
          "Tienes que aceptar los Términos de servicio y la Política de privacidad para continuar."
        );
        return;
      }
      startTransition(async () => {
        try {
          await completeOnboarding(!tosAlreadyAccepted);
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
                  ? "w-12 bg-orange"
                  : n < step
                  ? "w-8 bg-orange/50"
                  : "w-8 bg-white/12"
              }`}
            />
          ))}
        </div>
        <div className="text-center text-[10px] uppercase tracking-widest text-fg-subtle mb-6">
          Paso {step} de 3
        </div>

        <GlassPanel padded={false} className="p-8">
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
          {step === 3 && (
            <StepDone
              artistName={identity.artist_name}
              needsTos={!tosAlreadyAccepted}
              tosChecked={tosChecked}
              setTosChecked={setTosChecked}
            />
          )}

          {error && (
            <div className="mt-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button
                type="button"
                variant="clay"
                onClick={prevStep}
                disabled={isPending}
              >
                <ArrowLeft className="w-4 h-4" />
                Atrás
              </Button>
            )}
            <Button
              type="button"
              variant="clayPrimary"
              onClick={nextStep}
              disabled={
                isPending ||
                (step === 3 && !tosAlreadyAccepted && !tosChecked)
              }
              className="flex-1"
            >
              {isPending
                ? "Guardando…"
                : step === 3
                ? "Empezar"
                : step === 2 &&
                  !(
                    socials.instagram_url.trim() ||
                    socials.spotify_url.trim() ||
                    socials.youtube_url.trim() ||
                    socials.soundcloud_username.trim()
                  )
                ? "Saltar por ahora"
                : "Continuar"}
              {!isPending && step < 3 && <ArrowRight className="w-4 h-4" />}
              {!isPending && step === 3 && <Check className="w-4 h-4" />}
            </Button>
          </div>
        </GlassPanel>

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
        <h1 className="font-display text-2xl leading-none mb-1">
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
          className={FIELD}
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
          className={FIELD}
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
            className={FIELD}
          />
          <Button
            type="button"
            variant="clay"
            onClick={() => addGenre(genreInput)}
            disabled={!genreInput.trim() || identity.genres.length >= 8}
          >
            Agregar
          </Button>
        </div>
        {identity.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {identity.genres.map((g) => (
              <ClayChip key={g} active>
                <span className="inline-flex items-center gap-1.5">
                  {g}
                  <button
                    type="button"
                    onClick={() => removeGenre(g)}
                    className="transition-opacity hover:opacity-60"
                    aria-label={`Quitar ${g}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              </ClayChip>
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
                className="rounded-full transition-transform active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ClayChip>+ {g}</ClayChip>
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
        <h1 className="font-display text-2xl leading-none mb-1">
          Conecta tu música
        </h1>
        <p className="text-sm text-fg-muted">
          Opcional, pero recomendado. Si pones tu usuario de SoundCloud, la app
          actualiza tus seguidores automáticamente todos los días. Puedes
          agregarlas después desde tu perfil.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="soundcloud_username" className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5 text-orange" />
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
            className={FIELD}
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
          className={FIELD}
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
          className={FIELD}
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
          className={FIELD}
        />
      </div>
    </div>
  );
}

function StepDone({
  artistName,
  needsTos,
  tosChecked,
  setTosChecked,
}: {
  artistName: string;
  needsTos: boolean;
  tosChecked: boolean;
  setTosChecked: (v: boolean) => void;
}) {
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
        <h1 className="font-display text-2xl leading-none mb-1">
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
            <GlassPanel key={s.title} padded={false} className="p-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange/10 border border-orange/30 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-fg">{s.title}</div>
                  <div className="text-[11px] text-fg-muted leading-snug mt-0.5">
                    {s.desc}
                  </div>
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {needsTos && (
        <label className="flex items-start gap-2.5 text-[13px] text-fg-muted leading-snug cursor-pointer select-none border-t border-white/10 pt-4">
          <input
            type="checkbox"
            checked={tosChecked}
            onChange={(e) => setTosChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-orange cursor-pointer"
          />
          <span>
            He leído y acepto los{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline hover:text-orange transition-colors"
            >
              Términos de servicio
            </a>{" "}
            y la{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline hover:text-orange transition-colors"
            >
              Política de privacidad
            </a>
            .
          </span>
        </label>
      )}

      <p className="text-[11px] text-fg-subtle text-center">
        Puedes ajustar todo más adelante en /configuracion.
      </p>
    </div>
  );
}
