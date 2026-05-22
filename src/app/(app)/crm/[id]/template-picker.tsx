"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Copy,
  Check,
  MessageCircle,
  Mail,
  X,
  ExternalLink,
} from "lucide-react";
import type { Template } from "@/types/database";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CHANNEL_LABELS,
} from "@/types/database";
import { resolveTemplate, type TemplateVars } from "@/lib/templates/variables";
import { whatsappLink } from "@/lib/format";
import { fetchUserTemplatesAction, bumpTemplateUsageAction } from "./template-actions";
import { addInteractionAction } from "../actions";
import Link from "next/link";

interface Props {
  contactId: string;
  contactName: string;
  contactWhatsapp: string;
  contactEmail: string;
  vars: TemplateVars;
}

export function TemplatePicker({
  contactId,
  contactName,
  contactWhatsapp,
  contactEmail,
  vars,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [resolvedText, setResolvedText] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || templates !== null) return;
    void (async () => {
      const list = await fetchUserTemplatesAction();
      setTemplates(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    })();
  }, [open, templates]);

  useEffect(() => {
    if (!selectedId || !templates) return;
    const t = templates.find((x) => x.id === selectedId);
    if (!t) return;
    const { text, missing } = resolveTemplate(t.body, vars);
    setResolvedText(text);
    setMissing(missing);
  }, [selectedId, templates, vars]);

  const selected = templates?.find((t) => t.id === selectedId) || null;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(resolvedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function openWhatsApp() {
    if (!selected) return;
    const wa = whatsappLink(contactWhatsapp, resolvedText);
    if (!wa) {
      alert("Este contacto no tiene WhatsApp configurado.");
      return;
    }
    // Bump usage
    void bumpTemplateUsageAction(selected.id);
    window.open(wa, "_blank");
  }

  function openEmail() {
    if (!selected) return;
    if (!contactEmail) {
      alert("Este contacto no tiene email configurado.");
      return;
    }
    const subj = resolveTemplate(selected.subject || "", vars).text;
    const url = `mailto:${contactEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(resolvedText)}`;
    void bumpTemplateUsageAction(selected.id);
    window.location.href = url;
  }

  function registerAsInteraction() {
    if (!selected) return;
    startTransition(async () => {
      await addInteractionAction({
        contact_id: contactId,
        channel:
          selected.channel_suggested === "whatsapp"
            ? "whatsapp"
            : selected.channel_suggested === "email"
            ? "email"
            : selected.channel_suggested === "instagram"
            ? "instagram"
            : "otro",
        direction: "out",
        note: `[Plantilla: ${selected.name}]\n${resolvedText}`,
        happened_at: new Date().toISOString(),
      });
      await bumpTemplateUsageAction(selected.id);
      router.refresh();
      setOpen(false);
      alert("Registrado como interacción saliente");
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <FileText className="w-4 h-4" />
        Usar plantilla
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            className="bg-bg-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Plantilla para {contactName}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-fg-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {templates === null && (
              <p className="text-sm text-fg-muted">Cargando plantillas…</p>
            )}

            {templates && templates.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
                <p className="text-sm text-fg-muted mb-4">
                  No tienes plantillas todavía.
                </p>
                <Button asChild>
                  <Link href="/plantillas">Crear plantillas →</Link>
                </Button>
              </div>
            )}

            {templates && templates.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tpl-select">Elige una plantilla</Label>
                  <SelectNative
                    id="tpl-select"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {TEMPLATE_CATEGORY_LABELS[t.category]} ·{" "}
                        {TEMPLATE_CHANNEL_LABELS[t.channel_suggested]}
                      </option>
                    ))}
                  </SelectNative>
                </div>

                {selected?.subject && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Asunto (email)</Label>
                    <Input
                      value={resolveTemplate(selected.subject, vars).text}
                      readOnly
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">Mensaje resuelto</Label>
                  <Textarea
                    value={resolvedText}
                    onChange={(e) => setResolvedText(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                {missing.length > 0 && (
                  <div className="text-xs bg-warning/10 border border-warning/30 rounded p-3 text-warning">
                    Faltan datos para resolver: {missing.map((m) => `{${m}}`).join(", ")}
                    {missing.includes("contact_person") && (
                      <div className="mt-1 text-fg-muted">
                        Edita el contacto para llenar la persona de contacto.
                      </div>
                    )}
                    {missing.some((m) => m.startsWith("my_")) && (
                      <div className="mt-1 text-fg-muted">
                        Edita tu perfil DJ en{" "}
                        <Link
                          href="/configuracion"
                          className="text-accent hover:underline"
                        >
                          configuración
                        </Link>{" "}
                        para llenar tus datos.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button onClick={copyText} variant="outline" size="sm">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  {contactWhatsapp && (
                    <Button onClick={openWhatsApp} size="sm">
                      <MessageCircle className="w-4 h-4" />
                      Abrir WhatsApp
                    </Button>
                  )}
                  {contactEmail && (
                    <Button onClick={openEmail} variant="outline" size="sm">
                      <Mail className="w-4 h-4" />
                      Abrir email
                    </Button>
                  )}
                  <Button
                    onClick={registerAsInteraction}
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Registrar como interacción enviada
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

// Wrapper Input para que sea solo readonly
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="flex h-10 w-full rounded-md border border-input bg-bg-panel px-3 py-2 text-sm text-foreground"
    />
  );
}
