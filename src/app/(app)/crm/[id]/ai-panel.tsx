"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import {
  Sparkles,
  Copy,
  Check,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  StickyNote,
} from "lucide-react";
import { useOllamaStatus } from "@/lib/ai/use-ollama";
import { generateText } from "@/lib/ai/ollama";
import {
  buildSummaryPrompt,
  buildReplyPrompt,
  JAY_SYSTEM_PROMPT,
  REPLY_TYPES,
  REPLY_TYPE_LABELS,
  CHANNELS_FOR_REPLY,
  CHANNEL_LABELS,
  type ReplyType,
  type ChannelForReply,
} from "@/lib/ai/prompts";
import {
  saveAiOutputAction,
  appendToContactNotesAction,
} from "./ai-actions";
import { whatsappLink } from "@/lib/format";

interface AIPanelProps {
  contactId: string;
  contactContext: string;
  presskitUrl: string;
  contactWhatsapp: string;
  contactEmail: string;
}

type Tab = "summary" | "reply";
type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; text: string; source: "ollama" | "manual" }
  | { status: "err"; error: string };

export function AIPanel({
  contactId,
  contactContext,
  presskitUrl,
  contactWhatsapp,
  contactEmail,
}: AIPanelProps) {
  const { status: ollama, loading } = useOllamaStatus();
  const [tab, setTab] = useState<Tab>("summary");
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  // Reply config
  const [replyType, setReplyType] = useState<ReplyType>("primer_contacto");
  const [channel, setChannel] = useState<ChannelForReply>("whatsapp");
  const [extra, setExtra] = useState("");

  const [copied, setCopied] = useState(false);

  // ─── Local Ollama ────────────────────────────────────────────────
  async function runLocal(prompt: string) {
    setRun({ status: "running" });
    try {
      const result = await generateText({
        prompt,
        system: JAY_SYSTEM_PROMPT,
        temperature: tab === "summary" ? 0.3 : 0.7,
      });
      setRun({ status: "ok", text: result.output, source: "ollama" });

      // Guardar en historial (no bloqueante)
      void saveAiOutputAction({
        source: "ollama",
        model: result.model,
        kind: tab === "summary" ? "summarize_contact" : "suggest_reply",
        contactId,
        input_json: tab === "reply" ? { replyType, channel, extra } : {},
        output: result.output,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setRun({ status: "err", error: msg });
    }
  }

  // ─── ChatGPT manual ──────────────────────────────────────────────
  function generateManualPrompt(): string {
    return tab === "summary"
      ? `${JAY_SYSTEM_PROMPT}\n\n${buildSummaryPrompt(contactContext)}`
      : `${JAY_SYSTEM_PROMPT}\n\n${buildReplyPrompt({
          contactContext,
          replyType,
          channel,
          extraInstructions: extra,
          presskitUrl,
        })}`;
  }

  function runManual() {
    const prompt = generateManualPrompt();
    setRun({ status: "ok", text: prompt, source: "manual" });
  }

  function handleRun() {
    if (ollama.available) {
      const prompt =
        tab === "summary"
          ? buildSummaryPrompt(contactContext)
          : buildReplyPrompt({
              contactContext,
              replyType,
              channel,
              extraInstructions: extra,
              presskitUrl,
            });
      void runLocal(prompt);
    } else {
      runManual();
    }
  }

  // ─── Acciones sobre el output ────────────────────────────────────
  async function copyOutput() {
    if (run.status !== "ok") return;
    try {
      await navigator.clipboard.writeText(run.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  }

  function openWhatsApp() {
    if (run.status !== "ok") return;
    const wa = whatsappLink(contactWhatsapp, run.text);
    if (wa) window.open(wa, "_blank");
  }

  function openEmail() {
    if (run.status !== "ok") return;
    const subject = encodeURIComponent("Hola desde JAY PORTU");
    const body = encodeURIComponent(run.text);
    window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`);
  }

  function openChatGPT() {
    window.open("https://chatgpt.com/", "_blank");
  }

  function saveAsNote() {
    if (run.status !== "ok") return;
    startTransition(async () => {
      const result = await appendToContactNotesAction(contactId, run.text);
      if (result.ok) {
        router.refresh();
        await confirm({
          title: "Guardado en notas",
          message: "Lo agregamos a las notas del contacto.",
          confirmLabel: "Listo",
          hideCancel: true,
        });
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

  return (
    <Card className="p-6 mb-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          IA
        </h2>
        <OllamaIndicator
          available={ollama.available}
          loading={loading}
          version={ollama.version}
          modelOk={ollama.defaultModelInstalled}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Resumir contacto
        </TabButton>
        <TabButton active={tab === "reply"} onClick={() => setTab("reply")}>
          Sugerir mensaje
        </TabButton>
      </div>

      {/* Config para "reply" */}
      {tab === "reply" && (
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="space-y-1.5">
            <Label htmlFor="reply_type" className="text-xs">
              Tipo de mensaje
            </Label>
            <SelectNative
              id="reply_type"
              value={replyType}
              onChange={(e) => setReplyType(e.target.value as ReplyType)}
            >
              {REPLY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPLY_TYPE_LABELS[t]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reply_channel" className="text-xs">
              Canal
            </Label>
            <SelectNative
              id="reply_channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelForReply)}
            >
              {CHANNELS_FOR_REPLY.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="extra" className="text-xs">
              Instrucciones extra (opcional)
            </Label>
            <Textarea
              id="extra"
              rows={2}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Ej: mencionar que estoy disponible para el 22 de junio"
            />
          </div>
        </div>
      )}

      {/* CTA principal */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button onClick={handleRun} disabled={run.status === "running"}>
          {run.status === "running"
            ? "Pensando…"
            : ollama.available
            ? tab === "summary"
              ? "Resumir con IA local"
              : "Generar mensaje con IA local"
            : tab === "summary"
            ? "Generar prompt para ChatGPT"
            : "Generar prompt para ChatGPT"}
        </Button>
        {ollama.available && (
          <Button variant="outline" onClick={runManual}>
            Modo ChatGPT manual
          </Button>
        )}
      </div>

      {/* Output */}
      {run.status === "err" && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">Error con Ollama local</div>
            <div className="text-xs opacity-80">{run.error}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={runManual}
              className="mt-2 -ml-2"
            >
              Cambiar a Modo ChatGPT manual →
            </Button>
          </div>
        </div>
      )}

      {run.status === "ok" && (
        <div className="space-y-3">
          {run.source === "manual" && (
            <div className="text-xs bg-accent-soft border border-accent/30 rounded p-3 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1">
                Este es un <strong>prompt completo</strong> para copiar y pegar
                en{" "}
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  chatgpt.com
                </a>
                . Pega la respuesta de ChatGPT abajo si quieres guardarla.
              </div>
            </div>
          )}
          <div className="bg-bg border border-border rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed font-mono">
            {run.text}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyOutput} variant="outline" size="sm">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            {run.source === "manual" && (
              <Button onClick={openChatGPT} variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
                Abrir ChatGPT
              </Button>
            )}
            {run.source === "ollama" && tab === "reply" && contactWhatsapp && (
              <Button onClick={openWhatsApp} variant="outline" size="sm">
                <MessageCircle className="w-4 h-4" />
                Abrir WhatsApp
              </Button>
            )}
            {run.source === "ollama" && tab === "reply" && contactEmail && (
              <Button onClick={openEmail} variant="outline" size="sm">
                Email
              </Button>
            )}
            {run.source === "ollama" && (
              <Button
                onClick={saveAsNote}
                variant="ghost"
                size="sm"
                disabled={isPending}
              >
                <StickyNote className="w-4 h-4" />
                Guardar en notas
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function OllamaIndicator({
  available,
  loading,
  version,
  modelOk,
}: {
  available: boolean;
  loading: boolean;
  version?: string;
  modelOk?: boolean;
}) {
  if (loading) {
    return (
      <span className="text-[10px] uppercase tracking-widest text-fg-subtle">
        Checking IA local…
      </span>
    );
  }
  if (available && modelOk) {
    return (
      <span className="text-[10px] uppercase tracking-widest text-success flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        Ollama {version} · modelo OK
      </span>
    );
  }
  if (available && !modelOk) {
    return (
      <span className="text-[10px] uppercase tracking-widest text-warning flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" />
        Ollama OK · falta modelo
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-widest text-fg-subtle flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-fg-subtle" />
      IA local off · usando ChatGPT manual
    </span>
  );
}
