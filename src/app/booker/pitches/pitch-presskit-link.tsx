"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <Button asChild variant="clay" size="sm" className="shrink-0 gap-1.5 [&_svg]:!size-3.5">
      <Link
        href={`/p/${slug}`}
        target="_blank"
        onClick={() => {
          void markPitchViewedAction(pitchId);
        }}
      >
        Press kit
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </Button>
  );
}
