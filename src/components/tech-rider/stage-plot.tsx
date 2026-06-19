/**
 * Sprint 21 — Stage plot Tier 2: SVG estático que se rellena con datos del
 * rider del DJ. Vista superior de la cabina: el DJ va DETRÁS de los decks
 * (fila única alineada: CDJs + mixer al centro) y la audiencia AL FRENTE.
 *
 * Es "Tier 2" porque no es un editor visual drag&drop (eso sería Tier 3),
 * pero ya muestra una imagen pro en lugar de un párrafo de texto.
 */

import type { TechRiderItem } from "@/types/database";

interface Props {
  items: TechRiderItem[];
  artistName: string;
}

export function StagePlot({ items, artistName }: Props) {
  const reproduccion = items.filter(
    (i) => i.category === "reproduccion" && !i.is_alternative
  );
  const mixers = items.filter(
    (i) => i.category === "mixer" && !i.is_alternative
  );
  const monitores = items.filter(
    (i) => i.category === "monitores" && !i.is_alternative
  );

  const cdjCount = reproduccion.reduce((sum, i) => sum + i.quantity, 0);
  const cdjName = reproduccion[0]?.name || "CDJ";
  const mixerName = mixers[0]?.name || "MIXER";
  const mixerQty = mixers[0]?.quantity ?? 1;
  const monitorName = monitores[0]?.name || "MONITOR";
  const monitorCount = monitores.reduce((sum, i) => sum + i.quantity, 0) || 2;

  // No mostrar si no hay ningún ítem de cabina
  if (reproduccion.length === 0 && mixers.length === 0 && monitores.length === 0) {
    return null;
  }

  const cdjsToRender = Math.min(Math.max(cdjCount, 2), 4);

  // Fila única alineada: mitad de los CDJs, MIXER al centro, resto de CDJs.
  // Todo a la misma altura → nunca se enciman.
  const leftCount = Math.ceil(cdjsToRender / 2);
  const CDJ_W = 90;
  const MIXER_W = 108;
  const GAP = 10;
  const slots: Array<{ kind: "cdj" | "mixer" }> = [];
  for (let i = 0; i < leftCount; i++) slots.push({ kind: "cdj" });
  slots.push({ kind: "mixer" });
  for (let i = 0; i < cdjsToRender - leftCount; i++) slots.push({ kind: "cdj" });

  const rowWidth =
    slots.reduce((w, s) => w + (s.kind === "mixer" ? MIXER_W : CDJ_W), 0) +
    GAP * (slots.length - 1);
  const ROW_Y = 170;
  const BOX_H = 78;
  let cursor = (600 - rowWidth) / 2;
  let cdjNum = 0;
  const placed = slots.map((s) => {
    const w = s.kind === "mixer" ? MIXER_W : CDJ_W;
    const x = cursor;
    cursor += w + GAP;
    return { kind: s.kind, x, w, num: s.kind === "cdj" ? ++cdjNum : 0 };
  });

  return (
    <div className="my-6 border-2 border-ink bg-cream overflow-hidden">
      <div className="bg-ink text-cream px-4 py-2 flex items-center justify-between">
        <div className="font-mono text-[10px] font-bold uppercase tracking-wider">
          Stage plot · {artistName}
        </div>
        <div className="font-mono text-[10px] text-cream/60">
          vista superior · cabina
        </div>
      </div>
      <svg
        viewBox="0 0 600 360"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto bg-cream"
        role="img"
        aria-label={`Stage plot de ${artistName}: ${cdjsToRender} ${cdjName}, ${mixerName}, ${Math.min(monitorCount, 2)} ${monitorName}. El DJ va detrás de los decks, la audiencia al frente.`}
      >
        {/* ── ATRÁS: monitores side-fill + DJ ── */}
        <text
          x="300"
          y="18"
          textAnchor="middle"
          className="fill-ink/40 font-mono"
          fontSize="11"
          fontWeight="700"
          letterSpacing="3"
        >
          ↑ MONITORES SIDE-FILL ↑
        </text>

        {Array.from({ length: Math.min(monitorCount, 2) }).map((_, i) => {
          const x = i === 0 ? 110 : 430;
          return (
            <g key={`mon-${i}`}>
              <polygon
                points={`${x},34 ${x + 60},34 ${x + 50},66 ${x + 10},66`}
                fill="#0A0A0A"
                stroke="#0A0A0A"
                strokeWidth="2"
              />
              <text
                x={x + 30}
                y="55"
                textAnchor="middle"
                fill="#F4EFE7"
                fontSize="10"
                fontFamily="ui-monospace,monospace"
                fontWeight="700"
              >
                MON
              </text>
            </g>
          );
        })}

        {/* DJ — detrás de los decks (mira hacia la audiencia, abajo) */}
        <g>
          <circle cx="300" cy="96" r="16" fill="#FF5C00" stroke="#0A0A0A" strokeWidth="2" />
          <text
            x="300"
            y="100"
            textAnchor="middle"
            fill="#0A0A0A"
            fontSize="11"
            fontFamily="ui-monospace,monospace"
            fontWeight="700"
          >
            DJ
          </text>
        </g>

        {/* ── MESA / superficie con los decks ── */}
        <rect
          x="40"
          y="130"
          width="520"
          height="160"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <text
          x="48"
          y="146"
          fill="#0A0A0A"
          fontSize="10"
          fontFamily="ui-monospace,monospace"
          opacity="0.5"
        >
          MESA / SUPERFICIE
        </text>

        {/* Decks: fila alineada CDJ … MIXER … CDJ */}
        {placed.map((p, idx) =>
          p.kind === "mixer" ? (
            <g key={`slot-${idx}`}>
              <rect
                x={p.x}
                y={ROW_Y}
                width={p.w}
                height={BOX_H}
                fill="#FF5C00"
                stroke="#0A0A0A"
                strokeWidth="3"
              />
              <text
                x={p.x + p.w / 2}
                y={ROW_Y + 30}
                textAnchor="middle"
                fill="#0A0A0A"
                fontSize="12"
                fontFamily="ui-monospace,monospace"
                fontWeight="700"
              >
                MIXER
              </text>
              <text
                x={p.x + p.w / 2}
                y={ROW_Y + 48}
                textAnchor="middle"
                fill="#0A0A0A"
                fontSize="9"
                fontFamily="ui-monospace,monospace"
              >
                {truncate(mixerName, 16)}
              </text>
              <text
                x={p.x + p.w / 2}
                y={ROW_Y + 64}
                textAnchor="middle"
                fill="#0A0A0A"
                fontSize="9"
                fontFamily="ui-monospace,monospace"
                opacity="0.7"
              >
                {mixerQty}×
              </text>
            </g>
          ) : (
            <g key={`slot-${idx}`}>
              <rect
                x={p.x}
                y={ROW_Y}
                width={p.w}
                height={BOX_H}
                fill="#0A0A0A"
                stroke="#0A0A0A"
                strokeWidth="2"
              />
              <text
                x={p.x + p.w / 2}
                y={ROW_Y + 32}
                textAnchor="middle"
                fill="#F4EFE7"
                fontSize="11"
                fontFamily="ui-monospace,monospace"
                fontWeight="700"
              >
                CDJ {p.num}
              </text>
              <text
                x={p.x + p.w / 2}
                y={ROW_Y + 50}
                textAnchor="middle"
                fill="#F4EFE7"
                fontSize="9"
                fontFamily="ui-monospace,monospace"
                opacity="0.85"
              >
                {truncate(cdjName, 13)}
              </text>
            </g>
          )
        )}

        {/* ── AL FRENTE: audiencia (el DJ la mira) ── */}
        <text
          x="300"
          y="332"
          textAnchor="middle"
          className="fill-ink/40 font-mono"
          fontSize="11"
          fontWeight="700"
          letterSpacing="3"
        >
          ↓ AUDIENCIA ↓
        </text>
      </svg>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
