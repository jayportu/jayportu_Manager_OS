"use client";

/**
 * Medidor de fuerza de contraseña — feedback en vivo durante el signup.
 *
 * `scorePassword` es una función PURA: la usa también el login-form para gatear
 * el submit (no dejar crear cuenta con una clave "Muy débil"/"Débil"). El
 * componente pinta 4 segmentos + label + checklist con la estética Hybrid OS
 * (naranja DROP, mono labels, glass).
 *
 * OJO: esto NO reemplaza la protección de "contraseñas filtradas" de Supabase
 * (Auth → Attack Protection → leaked password). Aquella es la red dura del lado
 * servidor; este medidor solo EDUCA mientras el user escribe (mejor UX). Lo
 * ideal es tener ambos.
 */

import { Check, Circle } from "lucide-react";

/** Mínimo aceptado en signup: 2 = "Regular". */
export const PASSWORD_MIN_STRENGTH = 2;

export interface PasswordScore {
  /** -1 vacío · 0-4 (Muy débil → Fuerte). */
  score: number;
  met: { len: boolean; case: boolean; num: boolean; sym: boolean };
}

/**
 * Puntúa una contraseña sumando criterios cumplidos. Una clave larga (>=12) con
 * 3+ criterios sube directo a "Fuerte" — largo compensa complejidad.
 */
export function scorePassword(v: string): PasswordScore {
  const met = {
    len: v.length >= 8,
    case: /[a-z]/.test(v) && /[A-Z]/.test(v),
    num: /[0-9]/.test(v),
    sym: /[^a-zA-Z0-9]/.test(v),
  };
  const count = [met.len, met.case, met.num, met.sym].filter(Boolean).length;
  let score = count;
  if (v.length >= 12 && count >= 3) score = 4;
  if (v.length === 0) score = -1;
  return { score: Math.min(score, 4), met };
}

const LABELS = ["Muy débil", "Débil", "Regular", "Buena", "Fuerte"];
// Rojo → ámbar → verde. Explícitos (no tokens) porque son un gradiente de
// severidad, no roles semánticos de la UI.
const COLORS = ["#e5484d", "#e5484d", "#f5a623", "#8bc34a", "#3fbf5f"];

const CRITERIA: { key: keyof PasswordScore["met"]; label: string }[] = [
  { key: "len", label: "Al menos 8 caracteres" },
  { key: "case", label: "Mayúsculas y minúsculas" },
  { key: "num", label: "Al menos un número" },
  { key: "sym", label: "Al menos un símbolo" },
];

export function PasswordStrength({ value }: { value: string }) {
  const { score, met } = scorePassword(value);
  const color = COLORS[Math.max(0, score)];

  return (
    <div className="mt-2.5" aria-live="polite">
      {/* Barra de 4 segmentos */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: score > i ? color : "rgba(255,255,255,0.08)" }}
          />
        ))}
      </div>

      {/* Label de fuerza */}
      <div
        className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em]"
        style={{ color: score < 0 ? "rgba(255,255,255,0.4)" : color }}
      >
        {score < 0 ? "Fuerza —" : `Fuerza · ${LABELS[score]}`}
      </div>

      {/* Checklist de criterios */}
      <ul className="mt-2.5 space-y-1.5">
        {CRITERIA.map(({ key, label }) => {
          const ok = met[key];
          return (
            <li
              key={key}
              className="flex items-center gap-2 text-[12px] transition-colors"
              style={{ color: ok ? "rgb(232 232 234)" : "rgba(255,255,255,0.45)" }}
            >
              {ok ? (
                <Check size={14} className="shrink-0" style={{ color: "#3fbf5f" }} />
              ) : (
                <Circle size={14} className="shrink-0 text-white/25" />
              )}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
