"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import {
  Sparkles,
  Copy,
  ExternalLink,
  Check,
  StickyNote,
  Users,
} from "lucide-react";
import {
  buildContactContext,
  buildStrategyPrompt,
} from "@/lib/ai/prompts";
import {
  loadContactForStrategy,
  saveStrategyResponseAction,
} from "./actions";
import type { Contact, DjProfile, Interaction } from "@/types/database";
import { CONTACT_STATUS_LABELS, CONTACT_TYPE_LABELS } from "@/types/database";
import Link from "next/link";

type ContactLite = Pick<Contact, "id" | "name" | "type" | "status" | "score">;

interface Props {
  contacts: ContactLite[];
  firstContact: Contact | null;
  firstInteractions: Interaction[];
  djProfile: DjProfile | null;
}

const QUESTION_TEMPLATES = [
  {
    label: "Selecciona o escribe tu pregunta…",
    value: "",
  },
  {
    label: "¿Cómo abordo este contacto sin sonar genérico?",
    value:
      "¿Cuál es la mejor forma de abordar este contacto para una primera reunión sin sonar genérico ni desesperado?",
  },
  {
    label: "Sugiéreme estrategia de follow-up de 3 mensajes",
    value:
      "Sugiéreme una estrategia de follow-up con 3 mensajes espaciados en el tiempo. Dame los 3 mensajes redactados.",
  },
  {
    label: "¿Qué propuesta concreta le envío?",
    value:
      "Tomando el estado actual del pipeline, redacta una propuesta concreta para enviarle (mensaje + qué adjuntar).",
  },
  {
    label: "Recomiéndame 1 acción para los próximos 7 días",
    value:
      "Recomiéndame UNA acción concreta para los próximos 7 días con este contacto. Sé específico.",
  },
  {
    label: "¿Cómo respondo a una pregunta de fee/tarifa?",
    value:
      "Cómo respondo si me piden mi fee/tarifa sin haber visto el contexto del evento. Dame 2 opciones de respuesta.",
  },
];

export function StrategyMode({
  contacts,
  firstContact,
  firstInteractions,
  djProfile,
}: Props) {
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState(firstContact?.id || "");
  const [contact, setContact] = useState<Contact | null>(firstContact);
  const [interactions, setInteractions] =
    useState<Interaction[]>(firstInteractions);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadingContact, setLoadingContact] = useState(false);

  async function changeContact(id: string) {
    setSelectedId(id);
    if (!id) {
      setContact(null);
      setInteractions([]);
      return;
    }
    setLoadingContact(true);
    const { contact: c, interactions: ix } = await loadContactForStrategy(id);
    setContact(c);
    setInteractions(ix);
    setLoadingContact(false);
  }

  const contactContext = contact
    ? buildContactContext(contact, interactions, djProfile)
    : "(Selecciona un contacto)";

  const fullPrompt = contact
    ? buildStrategyPrompt({
        contactContext,
        question: question || "(Sin pregunta específica)",
        djProfile,
      })
    : "";

  async function copyPrompt() {
    if (!fullPrompt) return;
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function openChatGPT() {
    window.open("https://chatgpt.com/", "_blank");
  }

  function handleSave(saveAsNote: boolean) {
    if (!contact || !response.trim()) return;
    startTransition(async () => {
      const result = await saveStrategyResponseAction({
        contactId: contact.id,
        question,
        response,
        saveAsNote,
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (saveAsNote) {
          // El response queda; las notas se actualizaron en server
        }
      } else {
        await confirm({
          title: "Error",
          message: result.error,
          confirmLabel: "Entendido",
          hideCancel: true,
          variant: "danger",
        });
      }
    });
  }

  if (contacts.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Users className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
        <h3 className="font-semibold mb-1">Sin contactos aún</h3>
        <p className="text-sm text-fg-muted mb-4">
          Necesitas al menos un contacto en el CRM para usar el modo estrategia.
        </p>
        <Button asChild>
          <Link href="/crm/nuevo">+ Crear contacto</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Selector de contacto */}
      <Card className="p-5 space-y-3">
        <Label htmlFor="contact" className="text-sm">
          Contacto sobre el que quieres consultar
        </Label>
        <SelectNative
          id="contact"
          value={selectedId}
          onChange={(e) => void changeContact(e.target.value)}
          disabled={loadingContact}
        >
          <option value="">Selecciona un contacto…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {CONTACT_TYPE_LABELS[c.type]} ·{" "}
              {CONTACT_STATUS_LABELS[c.status]} · {c.score}
            </option>
          ))}
        </SelectNative>
      </Card>

      {/* Pregunta */}
      {contact && (
        <Card className="p-5 space-y-3">
          <Label htmlFor="question" className="text-sm">
            ¿Qué necesitas resolver con este contacto?
          </Label>
          <SelectNative
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          >
            {QUESTION_TEMPLATES.map((t, i) => (
              <option key={i} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectNative>
          <Textarea
            id="question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Escribe tu pregunta o usa una plantilla de arriba…"
          />
        </Card>
      )}

      {/* Prompt generado */}
      {contact && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Prompt generado
            </h2>
            <div className="flex gap-2">
              <Button onClick={copyPrompt} variant="outline" size="sm">
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button onClick={openChatGPT} size="sm">
                <ExternalLink className="w-4 h-4" />
                Abrir ChatGPT
              </Button>
            </div>
          </div>
          <pre className="bg-bg border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {fullPrompt}
          </pre>
        </Card>
      )}

      {/* Respuesta pegada */}
      {contact && (
        <Card className="p-5 space-y-3">
          <Label htmlFor="response" className="text-sm">
            Pega aquí la respuesta de ChatGPT
          </Label>
          <Textarea
            id="response"
            rows={10}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="La respuesta de ChatGPT…"
          />
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              onClick={() => handleSave(true)}
              disabled={isPending || !response.trim()}
            >
              <StickyNote className="w-4 h-4" />
              Guardar como nota del contacto
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isPending || !response.trim()}
            >
              Solo guardar en historial IA
            </Button>
            {saved && (
              <span className="text-sm text-success">✓ Guardado</span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
