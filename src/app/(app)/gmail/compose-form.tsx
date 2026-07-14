"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Alert, FIELD, SELECT } from "@/components/hos";
import { cn } from "@/lib/utils";
import { Send, Sparkles } from "lucide-react";
import { sendEmailAction } from "./actions";

export interface ComposeContact {
  id: string;
  name: string;
  email: string;
}
export interface ComposeTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export function ComposeForm({
  contacts,
  templates,
  googleEmail,
}: {
  contacts: ComposeContact[];
  templates: ComposeTemplate[];
  googleEmail: string;
}) {
  const router = useRouter();
  const [contactId, setContactId] = useState<string>("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);

  function pickContact(id: string) {
    setContactId(id);
    const c = contacts.find((c) => c.id === id);
    if (c) setTo(c.email);
  }

  function pickTemplate(id: string) {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    if (t.subject) setSubject(t.subject);
    if (t.body) setBody(t.body);
  }

  async function handleSend() {
    setResult(null);
    setSending(true);
    const res = await sendEmailAction({
      to,
      subject,
      body,
      contactId: contactId || null,
    });
    setSending(false);
    setResult(res);
    if (res.ok) {
      setTo("");
      setContactId("");
      setSubject("");
      setBody("");
      router.refresh();
    }
  }

  const canSend = to.trim() && subject.trim() && body.trim() && !sending;

  return (
    <GlassPanel>
      <MonoLabel className="mb-4 block">Nuevo correo</MonoLabel>

      {result?.ok && (
        <div className="mb-4">
          <Alert tone="success">
            Correo enviado. La copia quedó en tus Enviados de Gmail.
          </Alert>
        </div>
      )}
      {result && !result.ok && (
        <div className="mb-4">
          <Alert tone="danger">{result.error}</Alert>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="compose-contact"
              className="block text-xs text-fg-muted mb-1.5"
            >
              Contacto del CRM
            </label>
            <select
              id="compose-contact"
              value={contactId}
              onChange={(e) => pickContact(e.target.value)}
              className={SELECT}
            >
              <option value="" className="bg-bg-panel">
                — Elige un contacto —
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id} className="bg-bg-panel">
                  {c.name} · {c.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="compose-to"
              className="block text-xs text-fg-muted mb-1.5"
            >
              Para
            </label>
            <input
              id="compose-to"
              type="email"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setContactId("");
              }}
              placeholder="correo@destinatario.com"
              className={FIELD}
            />
          </div>
        </div>

        {templates.length > 0 && (
          <div>
            <label
              htmlFor="compose-template"
              className="block text-xs text-fg-muted mb-1.5"
            >
              <Sparkles className="w-3 h-3 inline -mt-0.5 mr-1 text-accent" />
              Insertar plantilla
            </label>
            <select
              id="compose-template"
              defaultValue=""
              onChange={(e) => {
                pickTemplate(e.target.value);
                e.currentTarget.value = "";
              }}
              className={SELECT}
            >
              <option value="" className="bg-bg-panel">
                — Sin plantilla —
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id} className="bg-bg-panel">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="compose-subject"
            className="block text-xs text-fg-muted mb-1.5"
          >
            Asunto
          </label>
          <input
            id="compose-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del correo"
            className={FIELD}
          />
        </div>

        <div>
          <label
            htmlFor="compose-body"
            className="block text-xs text-fg-muted mb-1.5"
          >
            Mensaje
          </label>
          <textarea
            id="compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            placeholder="Escribe tu mensaje…"
            className={cn(FIELD, "resize-y leading-relaxed")}
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <p className="text-[11px] text-fg-subtle">
            Se envía desde tu Gmail (
            <span className="text-fg-muted">{googleEmail}</span>) · queda en tus
            Enviados.
          </p>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            variant="clayPrimary"
          >
            <Send className="w-4 h-4" />
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
