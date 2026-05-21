"use client";

import { ArrowRight, ArrowLeft, MessageCircle } from "lucide-react";
import {
  INTERACTION_CHANNEL_LABELS,
  type Interaction,
} from "@/types/database";
import { dateTime } from "@/lib/format";

interface Props {
  interactions: Interaction[];
}

export function InteractionTimeline({ interactions }: Props) {
  if (interactions.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-lg">
        <MessageCircle className="w-8 h-8 mx-auto text-fg-subtle mb-2" />
        <p className="text-sm text-fg-muted">
          Sin interacciones aún. Registra la próxima vez que te escribas con
          este contacto.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {interactions.map((i) => {
        const Icon = i.direction === "in" ? ArrowLeft : ArrowRight;
        const dirLabel = i.direction === "in" ? "Entrante" : "Saliente";
        return (
          <li
            key={i.id}
            className="flex gap-3 p-3 rounded-lg bg-bg border border-border"
          >
            <div className="w-8 h-8 rounded-md bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-fg">
                  {dateTime(i.happened_at)}
                </span>
                <span className="text-fg-subtle">·</span>
                <span className="text-fg-muted">
                  {INTERACTION_CHANNEL_LABELS[i.channel]}
                </span>
                <span className="text-fg-subtle">·</span>
                <span className="text-fg-muted">{dirLabel}</span>
              </div>
              {i.note && (
                <div className="text-sm text-fg mt-1.5 whitespace-pre-wrap leading-relaxed">
                  {i.note}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
