"use client";

import { PrivacyNotice } from "@/components/privacy-notice";
import { TOS_VERSION } from "@/lib/legal";

/**
 * Bloque B · B2 — Form de signup de Booker.
 *
 * Diferencias vs LoginForm (DJ):
 *   - Pide full_name desde el inicio (Booker no tiene artist_name)
 *   - Tipo de booker (productora, venue, evento privado, etc.) opcional
 *   - Pasa account_type='booker' en user_metadata para que el callback
 *     redirija a /booker/requests
 *   - Después del email confirm, /booker/layout asegura el booker_account
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  COUNTRY_API_BY_ES,
  fetchCities,
} from "@/lib/geo/countries";
import { TurnstileWidget, TURNSTILE_ENABLED } from "@/components/turnstile-widget";

const BOOKER_TYPES = [
  { value: "venue", label: "Venue / Club / Bar" },
  { value: "productora", label: "Productora de eventos" },
  { value: "agencia", label: "Agencia de booking" },
  { value: "evento_privado", label: "Evento privado" },
  { value: "casamiento", label: "Casamiento / Matrimonio" },
  { value: "corporativo", label: "Evento corporativo" },
  { value: "festival", label: "Festival" },
  { value: "otro", label: "Otro" },
];

function translateError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("rate limit")) {
    return "Demasiados intentos seguidos. Espera unos minutos.";
  }
  if (m.includes("at least 6") || m.includes("password should")) {
    return "La contraseña debe tener mínimo 6 caracteres.";
  }
  if (m.includes("already registered") || m.includes("user already")) {
    return "Este email ya tiene cuenta. Inicia sesión.";
  }
  if (m.includes("invalid email")) {
    return "El email no tiene formato válido.";
  }
  return `${message}. Si persiste, escríbenos.`;
}

export function BookerSignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [bookerType, setBookerType] = useState("otro");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [acceptedTos, setAcceptedTos] = useState(false);
  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
  }

  // Ciudades dependientes del país elegido. Si la API falla, queda [] y el
  // input degrada a texto libre (sigue siendo obligatorio).
  useEffect(() => {
    let cancelled = false;
    setCities([]);
    setLoadingCities(true);
    fetchCities(COUNTRY_API_BY_ES[country] ?? country).then((list) => {
      if (!cancelled) {
        setCities(list);
        setLoadingCities(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (TURNSTILE_ENABLED && !captchaToken) {
      setError("Completa la verificación anti-bot.");
      setLoading(false);
      return;
    }

    if (!acceptedTos) {
      setError("Debes aceptar los Términos y la Política de Privacidad.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/booker/requests`,
        captchaToken: captchaToken || undefined,
        data: {
          account_type: "booker",
          full_name: fullName.trim(),
          booker_type: bookerType,
          city: city.trim(),
          country,
          tos_accepted: "true",
          tos_version: TOS_VERSION,
        },
      },
    });

    if (error) {
      setError(translateError(error.message, error.status));
      resetCaptcha();
      setLoading(false);
      return;
    }

    // Detección de email ya registrado (Supabase devuelve user con identities=[])
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      setError("Este email ya tiene cuenta. Usa 'Iniciar sesión'.");
      resetCaptcha();
      setLoading(false);
      return;
    }

    // Si Supabase está en modo email-confirm OFF (auto-confirm), data.session existe
    if (data.session) {
      router.refresh();
      router.push("/booker/requests");
      return;
    }

    setInfo(
      "Te mandamos un email para confirmar tu cuenta. Revisa tu bandeja (también spam). El link dura unos minutos. Si ya tenías cuenta con este email, no recibirás nada nuevo: usa 'Iniciar sesión'."
    );
    resetCaptcha();
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-2 border-border bg-bg-panel p-6 space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="full-name">Tu nombre</Label>
        <Input
          id="full-name"
          type="text"
          placeholder="Carlos Pérez"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="hola@tu-evento.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="booker-type">¿Qué tipo de booker? (opcional)</Label>
        <select
          id="booker-type"
          value={bookerType}
          onChange={(e) => setBookerType(e.target.value)}
          className="w-full border-2 border-border bg-cream px-3 py-2 text-sm font-mono"
        >
          {BOOKER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="country">País</Label>
          <select
            id="country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity(""); // las ciudades cambian con el país
            }}
            required
            className="w-full border-2 border-border bg-cream px-3 py-2 text-sm font-mono"
          >
            {COUNTRIES.map((c) => (
              <option key={c.es} value={c.es}>
                {c.es}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            type="text"
            list="city-options"
            placeholder={loadingCities ? "Cargando…" : "Tu ciudad"}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            autoComplete="address-level2"
          />
          <datalist id="city-options">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {error && (
        <div className="border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {info && (
        <div className="border-2 border-success bg-success/10 px-3 py-2 text-sm text-success">
          {info}
        </div>
      )}

      {TURNSTILE_ENABLED && (
        <TurnstileWidget
          key={captchaKey}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
      )}

      <label className="flex items-start gap-2 text-[12px] text-fg-muted cursor-pointer select-none">
        <input
          type="checkbox"
          checked={acceptedTos}
          onChange={(e) => setAcceptedTos(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-orange"
        />
        <span>
          He leído y acepto los{" "}
          <a href="/terms" target="_blank" className="underline hover:text-orange">
            Términos
          </a>{" "}
          y la{" "}
          <a
            href="/privacy"
            target="_blank"
            className="underline hover:text-orange"
          >
            Política de Privacidad
          </a>
          .
        </span>
      </label>

      <Button
        type="submit"
        variant="default"
        size="lg"
        disabled={loading || (TURNSTILE_ENABLED && !captchaToken) || !acceptedTos}
        className="w-full"
      >
        {loading ? "Creando cuenta…" : "Crear cuenta gratis →"}
      </Button>

      <div className="font-mono text-[10px] text-fg-subtle tracking-wider leading-relaxed">
        Al crear cuenta aceptas recibir notificaciones de tus requests y
        DJs guardados. Sin spam — puedes salir cuando quieras.
      </div>

      <PrivacyNotice purpose="crear y operar tu cuenta de booker" />
    </form>
  );
}
