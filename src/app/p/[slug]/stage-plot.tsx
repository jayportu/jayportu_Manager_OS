/**
 * Sprint 21 — Stage plot Tier 2: SVG estático que se rellena con datos del
 * rider del DJ. Layout fijo (mixer al centro, CDJs a los costados, monitores
 * arriba). Las etiquetas se sacan de los items reproduccion/mixer/monitores.
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

  // Cantidad total de CDJs (suma quantity)
  const cdjCount = reproduccion.reduce((sum, i) => sum + i.quantity, 0);
  const cdjName = reproduccion[0]?.name || "CDJ";
  const mixerName = mixers[0]?.name || "MIXER";
  const monitorName = monitores[0]?.name || "MONITOR";
  const monitorCount = monitores.reduce((sum, i) => sum + i.quantity, 0) || 2;

  // No mostrar si no hay ningún ítem de cabina
  if (reproduccion.length === 0 && mixers.length === 0 && monitores.length === 0) {
    return null;
  }

  // Distribución de CDJs alrededor del mixer.
  // Si hay 2 CDJs: uno a cada lado. Si hay 3+: 2 izq, 1 der + extras a los costados.
  // Vamos a renderizar máximo 4 CDJs (caso real). Anchura del SVG: 600.
  const cdjsToRender = Math.min(Math.max(cdjCount, 2), 4);
  const cdjPositions = computeCDJPositions(cdjsToRender);

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
        viewBox="0 0 600 380"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto bg-cream"
        role="img"
        aria-label={`Stage plot de ${artistName}: ${cdjsToRender} ${cdjName}, ${mixerName}, ${monitorCount} ${monitorName}`}
      >
        {/* Marco "audiencia" */}
        <text
          x="300"
          y="20"
          textAnchor="middle"
          className="fill-ink/40 font-mono"
          fontSize="11"
          fontWeight="700"
          letterSpacing="3"
        >
          ↑ MONITORES SIDE-FILL ↑
        </text>

        {/* Monitores arriba */}
        <g>
          {Array.from({ length: Math.min(monitorCount, 2) }).map((_, i) => {
            const x = i === 0 ? 130 : 410;
            return (
              <g key={`mon-${i}`}>
                <polygon
                  points={`${x},50 ${x + 60},50 ${x + 50},85 ${x + 10},85`}
                  fill="#0A0A0A"
                  stroke="#0A0A0A"
                  strokeWidth="2"
                />
                <text
                  x={x + 30}
                  y="72"
                  textAnchor="middle"
                  fill="#F4EFE7"
                  fontSize="9"
                  fontFamily="ui-monospace,monospace"
                  fontWeight="700"
                >
                  MON
                </text>
              </g>
            );
          })}
        </g>

        {/* Mesa / superficie */}
        <rect
          x="50"
          y="120"
          width="500"
          height="180"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <text
          x="55"
          y="135"
          fill="#0A0A0A"
          fontSize="9"
          fontFamily="ui-monospace,monospace"
          opacity="0.5"
        >
          MESA / SUPERFICIE
        </text>

        {/* Mixer al centro */}
        <g>
          <rect
            x="240"
            y="180"
            width="120"
            height="80"
            fill="#FF5C00"
            stroke="#0A0A0A"
            strokeWidth="3"
          />
          <text
            x="300"
            y="215"
            textAnchor="middle"
            fill="#0A0A0A"
            fontSize="11"
            fontFamily="ui-monospace,monospace"
            fontWeight="700"
          >
            MIXER
          </text>
          <text
            x="300"
            y="232"
            textAnchor="middle"
            fill="#0A0A0A"
            fontSize="9"
            fontFamily="ui-monospace,monospace"
          >
            {truncate(mixerName, 16)}
          </text>
          <text
            x="300"
            y="248"
            textAnchor="middle"
            fill="#0A0A0A"
            fontSize="8"
            fontFamily="ui-monospace,monospace"
            opacity="0.7"
          >
            {mixers[0]?.quantity ?? 1}×
          </text>
        </g>

        {/* CDJs */}
        {cdjPositions.map((pos, idx) => (
          <g key={`cdj-${idx}`}>
            <rect
              x={pos.x}
              y={pos.y}
              width="90"
              height="80"
              fill="#0A0A0A"
              stroke="#0A0A0A"
              strokeWidth="2"
            />
            <text
              x={pos.x + 45}
              y={pos.y + 32}
              textAnchor="middle"
              fill="#F4EFE7"
              fontSize="10"
              fontFamily="ui-monospace,monospace"
              fontWeight="700"
            >
              CDJ {idx + 1}
            </text>
            <text
              x={pos.x + 45}
              y={pos.y + 50}
              textAnchor="middle"
              fill="#F4EFE7"
              fontSize="8"
              fontFamily="ui-monospace,monospace"
              opacity="0.8"
            >
              {truncate(cdjName, 14)}
            </text>
          </g>
        ))}

        {/* DJ ubicación */}
        <g>
          <circle cx="300" cy="320" r="14" fill="#FF5C00" stroke="#0A0A0A" strokeWidth="2" />
          <text
            x="300"
            y="324"
            textAnchor="middle"
            fill="#0A0A0A"
            fontSize="10"
            fontFamily="ui-monospace,monospace"
            fontWeight="700"
          >
            DJ
          </text>
        </g>

        {/* Audiencia */}
        <text
          x="300"
          y="360"
          textAnchor="middle"
          className="fill-ink/40 font-mono"
          fontSize="11"
          fontWeight="700"
          letterSpacing="3"
        >
          ↓ AUDIENCIA ↓
        </text>
      </svg>

      <div className="px-4 py-3 border-t-2 border-ink bg-cream text-[10px] font-mono text-fg-muted">
        Layout estándar de cabina. {cdjsToRender}× CDJ + 1× mixer + {Math.min(monitorCount, 2)}× monitor.
        Auto-generado desde tu tech rider.
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function computeCDJPositions(count: number): Array<{ x: number; y: number }> {
  // Posiciones x,y de cada CDJ alrededor del mixer (que está en x=240..360).
  // y default = 180 (alineado con mixer)
  switch (count) {
    case 2:
      return [
        { x: 130, y: 180 },
        { x: 380, y: 180 },
      ];
    case 3:
      // 2 izquierda apilados + 1 derecha
      return [
        { x: 80, y: 130 },
        { x: 130, y: 180 },
        { x: 380, y: 180 },
      ];
    case 4:
    default:
      // 2 izquierda + 2 derecha
      return [
        { x: 80, y: 130 },
        { x: 130, y: 180 },
        { x: 380, y: 180 },
        { x: 430, y: 130 },
      ];
  }
}
