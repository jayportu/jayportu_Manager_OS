"use client";

import { ArrowRight, ArrowDownLeft, MessageCircle } from "lucide-react";
import {
  INTERACTION_CHANNEL_LABELS,
  type Interaction,
} from "@/types/database";
import { dateTime } from "@/lib/format";
import { EmptyState } from "@/components/hos";

interface Props {
  interactions: Interaction[];
}

export function InteractionTimeline({ interactions }: Props) {
  if (interactions.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Sin interacciones aún"
        sub="Registra la próxima vez que te escribas con este contacto."
      />
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {interactions.map((i) => {
        const Icon = i.direction === "in" ? ArrowDownLeft : ArrowRight;
        const dirLabel = i.direction === "in" ? "Entrante" : "Saliente";
        return (
          <li
            key={i.id}
            className="flex gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange/30 bg-orange/10">
              <Icon className="h-4 w-4 text-orange" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                <span className="font-bold text-fg">
                  {dateTime(i.happened_at)}
                </span>
                <span>·</span>
                <span>{INTERACTION_CHANNEL_LABELS[i.channel]}</span>
                <span>·</span>
                <span>{dirLabel}</span>
              </div>
              {i.note && (
                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">
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
