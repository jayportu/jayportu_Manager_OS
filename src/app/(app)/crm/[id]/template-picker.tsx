"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
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
import { EmptyState, Alert, FIELD, SELECT } from "@/components/hos";
import { cn } from "@/lib/utils";

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
  const confirm = useConfirm();
  const aviso = (msg: string) =>
    confirm({ title: "Aviso", message: msg, confirmLabel: "Entendido", hideCancel: true });
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [resolvedText, setResolvedText] = useState("");
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
    setResolvedText(resolveTemplate(t.body, vars).text);
  }, [selectedId, templates, vars]);

  // "Faltan datos" se recalcula sobre el texto actual del textarea (las
  // variables sin resolver quedan como {variable}), así refleja ediciones
  // manuales y se limpia al cambiar de plantilla.
  const missing = useMemo(() => {
    const found =
      resolvedText.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [];
    return Array.from(new Set(found.map((m) => m.slice(1, -1))));
  }, [resolvedText]);

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
      void aviso("Este contacto no tiene WhatsApp configurado.");
      return;
    }
    // Bump usage
    void bumpTemplateUsageAction(selected.id);
    window.open(wa, "_blank");
  }

  function openEmail() {
    if (!selected) return;
    if (!contactEmail) {
      void aviso("Este contacto no tiene email configurado.");
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
      await aviso("Registrado como interacción saliente.");
    });
  }

  return (
    <>
      <Button variant="clay" size="sm" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" />
        Usar plantilla
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-bg-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl leading-none text-fg">
                Plantilla para {contactName}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-fg-muted hover:text-fg"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {templates === null && (
              <p className="text-sm text-fg-muted">Cargando plantillas…</p>
            )}

            {templates && templates.length === 0 && (
              <EmptyState
                icon={FileText}
                title="No tienes plantillas todavía"
                action={
                  <Button asChild variant="clayPrimary" size="sm">
                    <Link href="/plantillas">Crear plantillas →</Link>
                  </Button>
                }
              />
            )}

            {templates && templates.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                    Elige una plantilla
                  </span>
                  <select
                    aria-label="Elige una plantilla"
                    className={SELECT}
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-bg-panel">
                        {t.name} · {TEMPLATE_CATEGORY_LABELS[t.category]} ·{" "}
                        {TEMPLATE_CHANNEL_LABELS[t.channel_suggested]}
                      </option>
                    ))}
                  </select>
                </div>

                {selected?.subject && (
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                      Asunto (email)
                    </span>
                    <input
                      aria-label="Asunto (email)"
                      className={FIELD}
                      value={resolveTemplate(selected.subject, vars).text}
                      readOnly
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                    Mensaje resuelto
                  </span>
                  <textarea
                    aria-label="Mensaje resuelto"
                    value={resolvedText}
                    onChange={(e) => setResolvedText(e.target.value)}
                    rows={10}
                    className={cn(FIELD, "font-mono")}
                  />
                </div>

                {missing.length > 0 && (
                  <Alert tone="warn" title="Faltan datos">
                    {missing.map((m) => `{${m}}`).join(", ")}
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
                          className="text-orange hover:underline"
                        >
                          configuración
                        </Link>{" "}
                        para llenar tus datos.
                      </div>
                    )}
                  </Alert>
                )}

                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button variant="clay" size="sm" onClick={copyText}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  {contactWhatsapp && (
                    <Button variant="clayPrimary" size="sm" onClick={openWhatsApp}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      Abrir WhatsApp
                    </Button>
                  )}
                  {contactEmail && (
                    <Button variant="clay" size="sm" onClick={openEmail}>
                      <Mail className="h-3.5 w-3.5" />
                      Abrir email
                    </Button>
                  )}
                  <Button
                    variant="clay"
                    size="sm"
                    onClick={registerAsInteraction}
                    disabled={isPending}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Registrar como interacción enviada
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
