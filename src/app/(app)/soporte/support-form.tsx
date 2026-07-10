"use client";

import { useState, useTransition } from "react";
import { Send, Check, Paperclip, X } from "lucide-react";
import { compressImage } from "@/lib/images/compress-image";
import { enviarSoporte, type SoporteFormValues } from "./actions";

const CATEGORIAS = [
  "Problema técnico",
  "Duda de uso",
  "Sugerencia",
  "Cuenta y pagos",
  "Otro",
];

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
      const r = await enviarSoporte(values);
      if (r.ok) setDone(true);
      else setErr(r.error);
    });
  }

  if (done) {
    return (
      <div className="border-2 border-border p-8 text-center">
        <Check className="w-10 h-10 text-accent mx-auto mb-3" />
        <h2 className="text-xl font-bold">Recibimos tu mensaje</h2>
        <p className="text-sm text-fg-muted mt-2">
          Te responderemos a <b>{email}</b> lo antes posible.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-xl">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            Nombre
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
          Tipo de consulta
        </label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
          Mensaje
        </label>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="Cuéntanos en qué te ayudamos…"
          className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent resize-none"
        />
        <div className="text-[10px] text-fg-muted text-right font-mono">
          {mensaje.length}/4000
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
          Adjuntar imagen (opcional)
        </label>
        {imageDataUrl ? (
          <div className="border-2 border-border p-2 flex items-center gap-2 text-sm">
            <Paperclip className="w-4 h-4 shrink-0" />
            <span className="flex-1 min-w-0 truncate">{imageName} · listo</span>
            <button
              type="button"
              onClick={() => {
                setImageDataUrl("");
                setImageName("");
              }}
              className="text-danger hover:opacity-80"
              title="Quitar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="w-full text-xs"
          />
        )}
      </div>

      {err && (
        <div className="text-xs text-danger border-2 border-danger/40 bg-danger/10 p-2">
          {err}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !mensaje.trim()}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {pending ? "Enviando…" : "Enviar consulta"}
      </button>
    </div>
  );
}
