"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Mail } from "lucide-react";

interface Thread {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export function ThreadList({ threads }: { threads: Thread[] }) {
  return (
    <Card className="overflow-hidden">
      <ul>
        {threads.map((t, i) => (
          <li
            key={t.id}
            className={`${i > 0 ? "border-t border-border" : ""}`}
          >
            <Link
              href={`/gmail/${t.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-bg-subtle transition-colors group"
            >
              <Mail className="w-4 h-4 text-fg-subtle shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 justify-between flex-wrap">
                  <span className="text-sm font-semibold text-fg group-hover:text-accent transition-colors truncate">
                    {t.subject || "(sin asunto)"}
                  </span>
                  <span className="text-[11px] text-fg-subtle whitespace-nowrap">
                    {formatDateShort(t.date)}
                  </span>
                </div>
                <div className="text-xs text-fg-muted truncate mt-0.5">
                  {t.from || "(sin remitente)"}
                </div>
                <div className="text-xs text-fg-subtle truncate mt-1">
                  {t.snippet}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function formatDateShort(date: string): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay =
      d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}
