"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { markPitchViewedAction } from "../actions";

/**
 * Link al press kit del DJ que mandó el pitch. Al click marca ESE pitch como
 * visto (consume el token del DJ) — antes se marcaban todos al cargar la
 * pestaña, gastando tokens sin lectura real. Fire-and-forget: abre en nueva
 * pestaña igual aunque la marca falle.
 */
export function PitchPressKitLink({
  pitchId,
  slug,
}: {
  pitchId: string;
  slug: string;
}) {
  return (
    <Link
      href={`/p/${slug}`}
      target="_blank"
      onClick={() => {
        void markPitchViewedAction(pitchId);
      }}
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border-2 border-ink font-mono text-[10px] font-bold tracking-wider uppercase hover:bg-orange hover:border-orange transition-colors"
    >
      Press kit
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}
