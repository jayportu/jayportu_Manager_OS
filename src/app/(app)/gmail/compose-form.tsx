"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
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

const inputCls =
  "w-full h-10 px-3 rounded-md bg-bg-panel border border-border text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring/40";

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
    <Card className="p-5">
      <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-fg-muted mb-4">
        Nuevo correo
      </h3>

      {result?.ok && (
        <div className="flex gap-2 text-sm text-success bg-success/10 border border-success/30 rounded-md p-3 mb-4">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Correo enviado. La copia quedó en tus Enviados de Gmail.</span>
        </div>
      )}
      {result && !result.ok && (
        <div className="flex gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-md p-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-fg-muted mb-1.5">
              Contacto del CRM
            </label>
            <select
              value={contactId}
              onChange={(e) => pickContact(e.target.value)}
              className={inputCls}
            >
              <option value="">— Elige un contacto —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-muted mb-1.5">Para</label>
            <input
              type="email"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setContactId("");
              }}
              placeholder="correo@destinatario.com"
              className={inputCls}
            />
          </div>
        </div>

        {templates.length > 0 && (
          <div>
            <label className="block text-xs text-fg-muted mb-1.5">
              <Sparkles className="w-3 h-3 inline -mt-0.5 mr-1 text-accent" />
              Insertar plantilla
            </label>
            <select
              defaultValue=""
              onChange={(e) => {
                pickTemplate(e.target.value);
                e.currentTarget.value = "";
              }}
              className={inputCls}
            >
              <option value="">— Sin plantilla —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-fg-muted mb-1.5">Asunto</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del correo"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-fg-muted mb-1.5">Mensaje</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            placeholder="Escribe tu mensaje…"
            className="w-full px-3 py-2 rounded-md bg-bg-panel border border-border text-sm leading-relaxed placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring/40 resize-y"
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <p className="text-[11px] text-fg-subtle">
            Se envía desde tu Gmail (
            <span className="text-fg-muted">{googleEmail}</span>) · queda en tus
            Enviados.
          </p>
          <Button onClick={handleSend} disabled={!canSend}>
            <Send className="w-4 h-4" />
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
