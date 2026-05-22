"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Link2, Check } from "lucide-react";
import { associateAction } from "./actions";

interface Props {
  threadId: string;
  contacts: Array<{ id: string; name: string; email: string }>;
  subject: string;
  snippet: string;
  fromHeader: string;
  toHeader: string;
  messagesCount: number;
  lastMessageAt: string | null;
}

export function AssociateContactSelect({
  threadId,
  contacts,
  subject,
  snippet,
  fromHeader,
  toHeader,
  messagesCount,
  lastMessageAt,
}: Props) {
  // Sugerir contacto por email del from
  const fromEmail = (fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader)
    .trim()
    .toLowerCase();
  const suggested = contacts.find(
    (c) => c.email && c.email.toLowerCase() === fromEmail
  );

  const [selected, setSelected] = useState<string>(suggested?.id || "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    startTransition(async () => {
      const result = await associateAction({
        threadId,
        contactId: selected || null,
        subject,
        snippet,
        fromHeader,
        toHeader,
        messagesCount,
        lastMessageAt,
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-accent" />
        <Label className="text-sm">
          Asociar a contacto del CRM
        </Label>
        {suggested && (
          <span className="text-[10px] uppercase tracking-wider text-accent">
            sugerido por email
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <SelectNative
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 min-w-[200px]"
        >
          <option value="">— Sin asociar —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.email ? ` · ${c.email}` : ""}
            </option>
          ))}
        </SelectNative>
        <Button
          onClick={handleSave}
          disabled={isPending}
          variant={saved ? "default" : "outline"}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Guardado
            </>
          ) : isPending ? (
            "Guardando…"
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </div>
  );
}
