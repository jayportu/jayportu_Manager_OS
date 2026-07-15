"use client";

/**
 * Contacto (email + WhatsApp) del DJ, GATED por cuenta de booker.
 *
 * Vive en la página pública cacheada /p/[slug]. Al montar, consulta
 * /api/dj/contact?dj=... que responde con el contacto SOLO si el visitante es
 * un booker autenticado (o el dueño). Así el dato nunca está en el HTML público
 * y solo se carga client-side cuando corresponde.
 *
 * - Cargando → placeholder.
 * - Booker/dueño → email + WhatsApp + botones de acción (con tracking).
 * - Cualquier otro → candado + CTA a crear cuenta de booker.
 */
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { TrackedLink } from "./tracked-link";
import { whatsappLink } from "@/lib/format";

type State =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "unlocked"; email: string; whatsapp: string };

export function GatedContact({ djUserId }: { djUserId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/dj/contact?dj=${encodeURIComponent(djUserId)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as
          | { unlocked: true; email: string; whatsapp: string }
          | { unlocked: false };
        if (cancelled) return;
        setState(
          data.unlocked
            ? {
                status: "unlocked",
                email: data.email || "",
                whatsapp: data.whatsapp || "",
              }
            : { status: "locked" }
        );
      } catch {
        if (!cancelled) setState({ status: "locked" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [djUserId]);

  if (state.status === "loading") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-white/45">
          Cargando contacto…
        </div>
      </div>
    );
  }

  if (state.status === "locked") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-orange" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/85">
            Contacto bloqueado
          </span>
        </div>
        <p className="text-[13px] leading-snug text-white/70 mb-3">
          Debes tener cuenta como{" "}
          <span className="font-semibold text-white/90">booker</span> para ver el
          email y WhatsApp del DJ.
        </p>
        <a
          href="/signup/booker"
          className="flex w-full items-center justify-center rounded-full h-10 px-4 bg-orange text-ink shadow-[var(--hos-clay-btn)] font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-transform active:translate-y-px hover:brightness-95"
        >
          Crear cuenta de booker →
        </a>
        <div className="text-center text-[11px] mt-2 text-white/50">
          ¿Ya tienes cuenta?{" "}
          <a
            href="/login"
            className="text-orange font-semibold hover:underline"
          >
            Inicia sesión
          </a>
        </div>
      </div>
    );
  }

  const { email, whatsapp } = state;
  const wa = whatsappLink(whatsapp);

  return (
    <div className="space-y-1 text-sm">
      {email && (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45 shrink-0 w-16">
            Email
          </span>
          <TrackedLink
            href={`mailto:${email}`}
            userId={djUserId}
            event="click_email"
            className="font-medium text-white/85 hover:text-orange transition-colors break-all"
          >
            {email}
          </TrackedLink>
        </div>
      )}
      {whatsapp && wa && (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45 shrink-0 w-16">
            WhatsApp
          </span>
          <TrackedLink
            href={wa}
            userId={djUserId}
            event="click_whatsapp"
            external
            className="font-medium text-white/85 hover:text-orange transition-colors"
          >
            +{whatsapp.replace(/[^0-9]/g, "")}
          </TrackedLink>
        </div>
      )}
      {(wa || email) && (
        <div className="flex flex-wrap gap-2 pt-2">
          {wa && (
            <TrackedLink
              href={wa}
              userId={djUserId}
              event="click_whatsapp"
              external
              className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-orange text-ink shadow-[var(--hos-clay-btn)] font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-transform active:translate-y-px hover:brightness-95"
            >
              WhatsApp
            </TrackedLink>
          )}
          {email && (
            <TrackedLink
              href={`mailto:${email}`}
              userId={djUserId}
              event="click_email"
              className="hos-clay-btn inline-flex items-center justify-center h-10 px-4 rounded-full text-white/85 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-transform active:translate-y-px"
            >
              Email
            </TrackedLink>
          )}
        </div>
      )}
    </div>
  );
}
