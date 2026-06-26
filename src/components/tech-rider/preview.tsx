"use client";

/**
 * Preview en vivo del tech rider para el editor (/configuracion).
 * Parsea el texto IDEAL que el DJ está escribiendo y muestra cómo se verá en
 * su press kit público: diagrama de cabina + tarjetas de gear. Así el DJ ve
 * el valor de escribir bien su rider sin ningún formulario extra.
 */
import { parseRiderText, hasCabinItems } from "@/lib/tech-rider/parse";
import { StagePlot } from "./stage-plot";
import { GearCards } from "./gear-cards";

export function RiderVisualPreview({
  idealText,
  artistName,
}: {
  idealText: string;
  artistName?: string;
}) {
  const items = parseRiderText(idealText);
  if (items.length === 0) return null;
  const showStage = hasCabinItems(items);

  return (
    <div className="mt-2 border-2 border-dashed border-border/30 bg-cream/40 p-4">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
        Vista previa · así lo ve un booker
      </div>
      {showStage ? (
        <StagePlot items={items} artistName={artistName || "Tu set"} />
      ) : (
        <p className="text-xs text-fg-muted mb-3">
          Agrega CDJs, mixer o monitores en IDEAL para ver el diagrama de cabina.
        </p>
      )}
      <GearCards items={items} />
    </div>
  );
}
