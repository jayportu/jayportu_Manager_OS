"use client";

import { useState, useTransition } from "react";
import { Send, Check, Paperclip, X } from "lucide-react";
import { compressImage } from "@/lib/images/compress-image";
import { GlassPanel, MonoLabel, Alert, FIELD, SELECT } from "@/components/hos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { enviarSoporte, type SoporteFormValues } from "./actions";

const CATEGORIAS = [
  "Problema técnico",
  "Duda de uso",
  "Sugerencia",
  "Cuenta y pagos",
  "Otro",
];

const LBL =
  "mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40";

export function SupportForm({
  defaultNombre,
  defaultEmail,
}: {
  defaultNombre: string;
  defaultEmail: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [nombre, setNombre] = useState(defaultNombre);
  const [email, setEmail] = useState(defaultEmail);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [mensaje, setMensaje] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr("Imagen muy grande (máx 5MB).");
      return;
    }
    try {
      const dataUrl = await compressImage(file, 1200, 0.75);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
      setErr(null);
    } catch {
      setErr("No se pudo procesar la imagen.");
    }
  }

  function submit() {
    if (!mensaje.trim()) {
      setErr("Escribe tu mensaje primero.");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const values: SoporteFormValues = {
        nombre,
        email,
        categoria,
        mensaje,
        imageDataUrl,
      };
      try {
        const r = await enviarSoporte(values);
        if (r.ok) setDone(true);
        else setErr(r.error);
      } catch {
        setErr("Error de red. Intenta de nuevo.");
      }
    });
  }

  if (done) {
    return (
      <GlassPanel className="text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-ink">
          <Check className="h-6 w-6" />
        </span>
        <h2 className="font-display text-2xl leading-none">Recibimos tu mensaje</h2>
        <p className="mt-2 text-sm text-white/55">
          Te responderemos a <b className="text-white/80">{email}</b> lo antes posible.
        </p>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      <MonoLabel>Nueva consulta</MonoLabel>
      <div className="mt-3 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="sop-nombre" className={LBL}>
              Nombre
            </label>
            <input
              id="sop-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="sop-email" className={LBL}>
              Email
            </label>
            <input
              id="sop-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label htmlFor="sop-categoria" className={LBL}>
            Tipo de consulta
          </label>
          <select
            id="sop-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className={SELECT}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sop-mensaje" className={LBL}>
            Mensaje
          </label>
          <textarea
            id="sop-mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="Cuéntanos en qué te ayudamos…"
            className={cn(FIELD, "resize-none")}
          />
          <div className="mt-0.5 text-right font-mono text-[10px] text-white/35">
            {mensaje.length}/4000
          </div>
        </div>

        <div>
          <label htmlFor="sop-imagen" className={LBL}>
            Adjuntar imagen (opcional)
          </label>
          {imageDataUrl ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 shrink-0 text-white/50" />
              <span className="min-w-0 flex-1 truncate text-white/70">
                {imageName} · listo
              </span>
              <button
                type="button"
                onClick={() => {
                  setImageDataUrl("");
                  setImageName("");
                }}
                className="text-white/40 hover:text-danger"
                title="Quitar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <input
              id="sop-imagen"
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2.5 font-mono text-[11px] text-white/45 hover:border-orange/40 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:font-mono file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:text-white/80"
            />
          )}
        </div>

        {err && <Alert tone="danger">{err}</Alert>}

        <div className="pt-1">
          <Button
            type="button"
            variant="clayPrimary"
            onClick={submit}
            disabled={pending || !mensaje.trim()}
          >
            <Send className="h-4 w-4" />
            {pending ? "Enviando…" : "Enviar consulta"}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
