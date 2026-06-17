"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  setPressKitPdfUrlAction,
  deletePressKitPdfAction,
  setPressKitModeAction,
} from "./press-kit-actions";

interface Props {
  mode: "generated" | "pdf";
  pdfUrl: string;
  pdfFilename: string;
  pdfSizeBytes: number;
  publicSlug: string;
}

export function PressKitSection({
  mode,
  pdfUrl,
  pdfFilename,
  pdfSizeBytes,
  publicSlug,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPdf = !!pdfUrl;
  const publicUrl = publicSlug ? `/p/${publicSlug}` : "";

  function chooseFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setInfo(null);

    if (file.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF");
      e.target.value = "";
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError(
        `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo permitido: 25 MB.`
      );
      e.target.value = "";
      return;
    }

    startTransition(async () => {
      try {
        // Subida DIRECTA a Supabase Storage desde el navegador (no por el
        // Server Action) → el byte del PDF no pasa por la función de Vercel y
        // se evita el tope de 4.5 MB que rompía PDFs grandes con el críptico
        // "An unexpected response was received from the server" (mismo bug que
        // tenía el avatar, arreglado en PR #141).
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Tu sesión expiró. Recarga la página e intenta de nuevo.");
          return;
        }

        const safeName = sanitizeFilename(file.name);
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("press-kits")
          .upload(path, file, {
            contentType: "application/pdf",
            cacheControl: "3600",
            upsert: false,
          });
        if (upErr) {
          setError(`No se pudo subir el PDF: ${upErr.message}`);
          return;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("press-kits").getPublicUrl(path);

        // Guardar la URL en el perfil (payload mínimo → sin límite de body).
        const r = await setPressKitPdfUrlAction(publicUrl, file.name, file.size);
        if (r.ok) {
          setInfo("PDF subido. Tu press kit ahora muestra el PDF tal cual.");
          router.refresh();
        } else {
          setError(r.error);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? `No se pudo subir el PDF: ${err.message}`
            : "No se pudo subir el PDF. Vuelve a intentarlo."
        );
      } finally {
        e.target.value = "";
      }
    });
  }

  async function removePdf() {
    const { ok } = await confirm({
      title: "¿Borrar el PDF?",
      message: "Tu press kit volverá a generarse desde tus datos de perfil.",
      variant: "warning",
      confirmLabel: "Borrar PDF",
    });
    if (!ok) return;
    startTransition(async () => {
      const r = await deletePressKitPdfAction();
      if (r.ok) {
        setInfo("PDF borrado. Press kit vuelve al modo generado.");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function switchMode(newMode: "generated" | "pdf") {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await setPressKitModeAction(newMode);
      if (r.ok) {
        setInfo(
          newMode === "pdf"
            ? "Tu press kit ahora muestra el PDF."
            : "Tu press kit ahora se genera desde tus datos."
        );
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <Card className="p-6 space-y-5">
      {/* Mode toggle */}
      <div>
        <div className="text-xs uppercase tracking-wider text-fg-muted font-semibold mb-2">
          ¿Cómo se muestra tu press kit público?
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ModeOption
            active={mode === "generated"}
            onClick={() => switchMode("generated")}
            disabled={isPending}
            icon={Wand2}
            label="Generado por la app"
            desc="La página se arma con tus datos: bio, géneros, links, tech rider."
          />
          <ModeOption
            active={mode === "pdf"}
            onClick={() => switchMode("pdf")}
            disabled={isPending || !hasPdf}
            icon={FileText}
            label="PDF propio"
            desc={
              hasPdf
                ? "Mostramos el PDF que subiste tal cual."
                : "Sube un PDF primero (abajo)."
            }
          />
        </div>
      </div>

      {/* Upload */}
      <div className="pt-4 border-t border-border">
        <div className="text-xs uppercase tracking-wider text-fg-muted font-semibold mb-2">
          {hasPdf ? "PDF subido" : "Subir tu PDF"}
        </div>

        {hasPdf ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {pdfFilename || "press-kit.pdf"}
                </div>
                <div className="text-[11px] text-fg-muted">
                  {formatBytes(pdfSizeBytes)} · subido a Supabase Storage
                </div>
              </div>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1 shrink-0"
              >
                Abrir <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={chooseFile}
                disabled={isPending}
                variant="outline"
                size="sm"
              >
                <Upload className="w-3.5 h-3.5" />
                Reemplazar PDF
              </Button>
              <Button
                onClick={removePdf}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Borrar
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-fg-muted mb-3">
              Si ya tienes un press kit diseñado en PDF, súbelo. Máximo 25 MB.
            </p>
            <Button onClick={chooseFile} disabled={isPending} size="sm">
              <Upload className="w-3.5 h-3.5" />
              {isPending ? "Subiendo…" : "Elegir PDF"}
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {publicUrl && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-fg-muted">
            Tu press kit público:{" "}
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              {publicUrl} <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="text-sm text-success bg-success/10 border border-success/30 rounded p-3 flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{info}</span>
        </div>
      )}
    </Card>
  );
}

function ModeOption({
  active,
  onClick,
  disabled,
  icon: Icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  icon: typeof Wand2;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex gap-3 p-3 rounded-lg border text-left transition-colors ${
        active
          ? "border-accent bg-accent-soft/30"
          : "border-border bg-bg hover:border-fg-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
          active
            ? "bg-accent text-bg"
            : "bg-secondary border border-border text-fg-muted"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-semibold ${active ? "text-accent" : "text-fg"}`}
        >
          {label}
          {active && (
            <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-bg">
              activo
            </span>
          )}
        </div>
        <div className="text-[11px] text-fg-muted mt-0.5 leading-snug">
          {desc}
        </div>
      </div>
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Path-safe: quita acentos/espacios, deja solo a-z0-9._- y asegura .pdf. */
function sanitizeFilename(name: string): string {
  const noAccents = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const cleaned = noAccents
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
  return cleaned.endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}
