"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  addGalleryImageAction,
  removeGalleryImageAction,
} from "./gallery-actions";
import type { GalleryImage } from "@/types/database";

const MAX_GALLERY = 40;
const NO_FOLDER = "— Sin carpeta —";

export function GallerySection({
  initialGallery,
}: {
  initialGallery: GalleryImage[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>(initialGallery ?? []);
  const [folder, setFolder] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Carpetas existentes (para sugerir / agrupar el preview)
  const folders = Array.from(
    new Set(gallery.map((g) => g.folder?.trim() || "").filter(Boolean))
  );
  const grouped = groupByFolder(gallery);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);

    const room = MAX_GALLERY - gallery.length;
    if (room <= 0) {
      setError(`Llegaste al máximo de ${MAX_GALLERY} fotos.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const batch = files.slice(0, room);
    const assignFolder = folder.trim() || null;

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Tu sesión expiró. Recarga la página e intenta de nuevo.");
        return;
      }
      let latest = gallery;
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        setProgress(`Subiendo ${i + 1} de ${batch.length}…`);
        if (file.size > 10 * 1024 * 1024) {
          setError(
            `"${file.name}" pesa ${(file.size / 1024 / 1024).toFixed(1)} MB (máx 10 MB). Se omitió.`
          );
          continue;
        }
        try {
          const toUpload = await compressImage(file);
          if (!toUpload) {
            setError(
              `No pudimos procesar "${file.name}" de forma segura (quitamos los metadatos EXIF, como la ubicación GPS, antes de subir). Se omitió.`
            );
            continue;
          }
          const ext =
            toUpload.type === "image/png"
              ? "png"
              : toUpload.type === "image/webp"
              ? "webp"
              : "jpg";
          const path = `${user.id}/gallery/${Date.now()}-${i}-${Math.random()
            .toString(36)
            .slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("avatars")
            .upload(path, toUpload, {
              contentType: toUpload.type,
              cacheControl: "31536000",
              upsert: false,
            });
          if (upErr) {
            setError(`No se pudo subir "${file.name}": ${upErr.message}`);
            continue;
          }
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(path);
          const res = await addGalleryImageAction(publicUrl, assignFolder);
          if (res.ok) {
            latest = res.data.gallery;
            setGallery(latest);
          } else {
            setError(res.error);
          }
        } catch (e) {
          setError(
            e instanceof Error ? `No se pudo subir "${file.name}": ${e.message}` : "Error al subir."
          );
        }
      }
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleRemove(url: string) {
    setError(null);
    // Optimista: saca del estado y confirma en el server.
    const prev = gallery;
    setGallery((g) => g.filter((x) => x.url !== url));
    startTransition(async () => {
      const res = await removeGalleryImageAction(url);
      if (res.ok) setGallery(res.data.gallery);
      else {
        setGallery(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-[180px]">
          <label className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted">
            — Carpeta (opcional)
          </label>
          <Input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Ej: Live, Estudio, Backstage…"
            list="gallery-folders"
            maxLength={40}
          />
          {folders.length > 0 && (
            <datalist id="gallery-folders">
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || gallery.length >= MAX_GALLERY}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? progress ?? "Subiendo…" : "Subir fotos"}
        </Button>
      </div>
      <p className="text-xs text-fg-subtle">
        JPG, PNG o WebP · máx. 10 MB c/u · hasta {MAX_GALLERY} fotos. Las fotos que
        subas con una carpeta escrita arriba quedan agrupadas en ella.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      {gallery.length === 0 ? (
        <p className="text-sm text-fg-subtle border-2 border-dashed border-border p-6 text-center">
          Aún no subiste fotos. La galería aparece en tu press kit público.
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ folder: f, items }) => (
            <div key={f ?? "__none__"} className="space-y-2">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
                — {f || NO_FOLDER} · {items.length}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {items.map((img) => (
                  <div
                    key={img.url}
                    className="relative aspect-square border-2 border-border bg-bg-subtle overflow-hidden group"
                  >
                    <Image
                      src={img.url}
                      alt={img.caption || "Foto de galería"}
                      fill
                      sizes="(max-width: 640px) 33vw, 160px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(img.url)}
                      disabled={isPending}
                      aria-label="Quitar foto"
                      className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-ink/80 text-white border border-border opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-danger transition-opacity disabled:opacity-50"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByFolder(
  gallery: GalleryImage[]
): { folder: string | null; items: GalleryImage[] }[] {
  const map = new Map<string, GalleryImage[]>();
  for (const img of gallery) {
    const k = img.folder?.trim() || "";
    const arr = map.get(k);
    if (arr) arr.push(img);
    else map.set(k, [img]);
  }
  // Sin-carpeta al final; el resto en orden de aparición.
  return Array.from(map.entries())
    .map(([k, items]) => ({ folder: k || null, items }))
    .sort((a, b) => (a.folder === null ? 1 : 0) - (b.folder === null ? 1 : 0));
}

// ─── Compresión client-side (igual patrón que el avatar) ───────────────────
const MAX_DIM = 1600;
const QUALITY = 0.85;

async function compressImage(file: File): Promise<File | null> {
  // Rechaza (null) lo que no se pueda re-encodear de forma segura: el canvas
  // elimina los metadatos EXIF (incluida la geolocalización GPS). Preferimos
  // rechazar antes que subir el archivo crudo con EXIF.
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return null;
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("read fail"));
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode fail"));
      el.src = dataUrl;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const toBlob = (type: string) =>
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), type, QUALITY)
      );
    // WebP primero; JPEG si el navegador no lo soporta. Ambos salen sin EXIF.
    let blob = await toBlob("image/webp");
    let outType = "image/webp";
    let outName = "gallery.webp";
    if (!blob || blob.size === 0) {
      blob = await toBlob("image/jpeg");
      outType = "image/jpeg";
      outName = "gallery.jpg";
    }
    if (!blob || blob.size === 0) return null;
    return new File([blob], outName, { type: outType });
  } catch {
    return null;
  }
}
