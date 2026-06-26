"use client";

/**
 * Sprint 24 (Bloque A · A8) — Herramientas de share del press kit.
 *
 * Combina dos quick wins de tráfico:
 *  - QR generator (PNG + SVG download) del link público con marca DROP.
 *  - UTM link picker — presets de fuentes (IG bio, WhatsApp, mail, etc.)
 *    para trackear de dónde llega cada visita.
 *
 * Los UTMs se leen en /p/[slug] vía track-beacon.tsx y se guardan en
 * presskit_events.metadata. El admin client del Sprint 3 ya acepta
 * metadata jsonb, no se requiere migración.
 */
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Download,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";

interface ShareToolsProps {
  /** URL base del press kit (sin query params). Ej: https://dropgigs.com/p/jay-portu */
  publicUrl: string;
  /** Slug del artist, usado para nombrar archivos descargados. */
  artistSlug: string;
}

/** Presets de UTMs — fuentes típicas donde un DJ comparte el press kit. */
const UTM_PRESETS: { value: string; label: string; medium: string }[] = [
  { value: "", label: "Sin tag (link directo)", medium: "" },
  { value: "ig_bio", label: "Instagram · bio", medium: "social" },
  { value: "ig_story", label: "Instagram · story", medium: "social" },
  { value: "ig_post", label: "Instagram · post", medium: "social" },
  { value: "tiktok_bio", label: "TikTok · bio", medium: "social" },
  { value: "whatsapp", label: "WhatsApp directo", medium: "messaging" },
  { value: "mail_signature", label: "Firma de mail", medium: "email" },
  { value: "mail_outreach", label: "Mail outreach", medium: "email" },
  { value: "linktree", label: "Linktree / Bio link", medium: "bio_aggregator" },
  { value: "flyer_qr", label: "Flyer físico (QR)", medium: "offline" },
  { value: "pendrive", label: "Pendrive promo", medium: "offline" },
  { value: "referral", label: "Referido (otro DJ / agencia)", medium: "referral" },
];

function buildUrl(base: string, source: string, medium: string): string {
  if (!source) return base;
  const u = new URL(base);
  u.searchParams.set("utm_source", source);
  if (medium) u.searchParams.set("utm_medium", medium);
  return u.toString();
}

export function ShareTools({ publicUrl, artistSlug }: ShareToolsProps) {
  const [selectedSource, setSelectedSource] = useState("");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const preset = UTM_PRESETS.find((p) => p.value === selectedSource);
  const finalUrl = buildUrl(publicUrl, selectedSource, preset?.medium ?? "");

  // Generar QR en canvas cada vez que cambia la URL final
  useEffect(() => {
    if (!showQR || !canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, finalUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0A0A0A",
        light: "#F4EFE7",
      },
    });
  }, [showQR, finalUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = finalUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  function downloadPNG() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `drop-${artistSlug}-qr${selectedSource ? `-${selectedSource}` : ""}.png`;
    a.click();
  }

  async function downloadSVG() {
    const svg = await QRCode.toString(finalUrl, {
      type: "svg",
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0A0A0A", light: "#F4EFE7" },
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drop-${artistSlug}-qr${selectedSource ? `-${selectedSource}` : ""}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border-2 border-ink bg-bg-panel p-5 mb-6">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
        — COMPARTIR PRESS KIT
      </div>

      {/* UTM picker */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-fg-muted">
          ¿Dónde vas a compartir el link? (opcional · trackeamos la fuente)
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-full md:w-auto md:min-w-[280px] flex items-center justify-between gap-3 border-2 border-ink bg-cream px-3 py-2 text-sm font-mono"
          >
            <span>{preset?.label ?? "Sin tag (link directo)"}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div className="absolute z-20 mt-1 w-full md:min-w-[320px] border-2 border-ink bg-bg-panel shadow-[5px_5px_0_0_#0A0A0A] max-h-[300px] overflow-y-auto">
              {UTM_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setSelectedSource(p.value);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm font-mono border-b border-ink/10 last:border-b-0 hover:bg-orange hover:text-ink transition-colors ${
                    selectedSource === p.value ? "bg-orange/20" : ""
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Final URL preview */}
      <div className="mt-3 border border-ink/30 bg-cream p-3 font-mono text-[11px] break-all leading-relaxed">
        {finalUrl}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={copied ? "default" : "outline"}
          size="sm"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar link
            </>
          )}
        </Button>
        <Button
          type="button"
          variant={showQR ? "default" : "outline"}
          size="sm"
          onClick={() => setShowQR((s) => !s)}
        >
          <QrCode className="w-4 h-4" />
          {showQR ? "Ocultar QR" : "Generar QR"}
        </Button>
      </div>

      {/* QR display + download */}
      {showQR && (
        <div className="mt-5 border-2 border-dashed border-ink p-5 bg-cream">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <div className="flex-shrink-0 flex flex-col items-center">
              <canvas
                ref={canvasRef}
                className="border-2 border-ink bg-cream"
                width={360}
                height={360}
                style={{ width: 240, height: 240 }}
              />
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-fg-muted">
                DROP<span className="text-orange">.</span> · /p/{artistSlug}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
                — QR PARA FLYERS · MERCH · PENDRIVES
              </div>
              <p className="text-sm leading-relaxed text-fg mb-4">
                Imprímelo en flyers, stickers, pendrives promo o pégalo en
                instagram stories. El QR ya incluye el UTM seleccionado, así
                trackeas de dónde llega cada visita.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadPNG}
                >
                  <Download className="w-4 h-4" />
                  PNG (alta resolución)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadSVG}
                >
                  <Download className="w-4 h-4" />
                  SVG (vectorial)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
