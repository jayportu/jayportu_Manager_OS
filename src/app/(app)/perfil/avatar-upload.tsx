"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { setAvatarUrlAction, deleteAvatarAction } from "./avatar-actions";
import { AvatarLightbox } from "@/components/avatar-lightbox";

interface AvatarUploadProps {
  initialUrl: string;
  artistName: string;
  /** Avisa al form padre del nuevo avatar para que recalcule la completitud
      (el nudge "te falta foto") sin esperar un reload ni pisar otras ediciones. */
  onChange?: (url: string) => void;
}

export function AvatarUpload({ initialUrl, artistName, onChange }: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial = (artistName.trim().charAt(0) || "?").toUpperCase();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    // Validación client-side temprana — antes el Server Action rechazaba
    // archivos >1MB con error críptico que crasheaba toda la app; ahora el
    // techo es 10 MB y filtramos acá para dar mensaje claro de inmediato.
    if (file.size > 10 * 1024 * 1024) {
      setError(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo permitido: 10 MB.`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    startTransition(async () => {
      try {
        // Comprimir antes de subir: la foto del celular (2-10 MB) se
        // redimensiona a 1600px WebP (~150-400 KB) en el browser → baja el
        // egress de Supabase. Si la compresión falla (ej. Safari sin WebP),
        // sube el original; ya NO importa el peso porque va directo a Storage.
        const toUpload = await compressAvatar(file);

        // Subida DIRECTA a Supabase Storage desde el navegador (no por el
        // Server Action) → el byte de la imagen no pasa por la función de
        // Vercel y se evita el tope de 4.5 MB que rompía fotos grandes.
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Tu sesión expiró. Recarga la página e intenta de nuevo.");
          return;
        }
        const ext =
          toUpload.type === "image/png"
            ? "png"
            : toUpload.type === "image/webp"
            ? "webp"
            : "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, toUpload, {
            contentType: toUpload.type,
            cacheControl: "31536000",
            upsert: false,
          });
        if (upErr) {
          setError(`No se pudo subir la imagen: ${upErr.message}`);
          return;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);

        // Guardar la URL en el perfil (payload mínimo → sin límite de body).
        const res = await setAvatarUrlAction(publicUrl);
        if (res.ok) {
          setUrl(publicUrl);
          onChange?.(publicUrl);
          router.refresh();
        } else {
          setError(res.error);
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? `No se pudo subir la imagen: ${e.message}`
            : "No se pudo subir la imagen. Vuelve a intentarlo."
        );
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deleteAvatarAction();
        if (res.ok) {
          setUrl("");
          onChange?.("");
          router.refresh();
        } else {
          setError(res.error);
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? `No se pudo quitar la imagen: ${e.message}`
            : "No se pudo quitar la imagen."
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted">
        — Foto de perfil
      </span>
      <div className="flex items-center gap-4">
        {/* Preview circular (click → tamaño real) */}
        {url ? (
          <AvatarLightbox
            src={url}
            alt="Foto de perfil"
            className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden border-2 border-ink bg-ink"
            imgClassName="w-full h-full object-cover transition-transform group-hover:scale-[1.05]"
          />
        ) : (
          <div className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden border-2 border-ink bg-ink flex items-center justify-center">
            <span
              className="text-orange"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "34px",
                lineHeight: 0.85,
              }}
            >
              {initial}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              {isPending ? "Subiendo…" : url ? "Cambiar foto" : "Subir foto"}
            </Button>
            {url && (
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={handleRemove}
              >
                Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-subtle">JPG, PNG o WebP · máx. 10 MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

// ─── Compresión client-side ───────────────────────────────────────────────
// El avatar se sirve por next/image en las miniaturas (sidebar, card /dj, hero),
// así que esas vistas las optimiza y cachea Vercel: NO depende del tamaño del
// original. Lo que SÍ depende del original es el lightbox "a tamaño real", que
// con 1024px se veía blando en pantallas retina. Subimos a 1600px / 0.9 para
// que el zoom se vea nítido. El egress no se resiente: next/image baja el
// original de Storage UNA sola vez y sirve el resto desde su CDN; el lightbox
// crudo se abre rara vez. (Aplica a uploads NUEVOS; los avatares ya subidos
// quedaron en 1024 — hay que re-subir la foto para ganar la nitidez.)
const AVATAR_MAX_DIM = 1600;
const AVATAR_QUALITY = 0.9;

/**
 * Redimensiona y reencodea la imagen a WebP en el browser. Devuelve un File
 * listo para subir. Robusto: ante cualquier fallo (decode, canvas, toBlob no
 * soportado) o si comprimir no reduce el peso, devuelve el archivo original
 * — el Server Action valida tipo/tamaño igual.
 */
async function compressAvatar(file: File): Promise<File> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }
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

    const scale = Math.min(1, AVATAR_MAX_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", AVATAR_QUALITY)
    );
    // toBlob puede no soportar WebP (Safari viejo) → blob null; o la imagen ya
    // era más liviana que el reencode. En ambos casos: original.
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;

    return new File([blob], "avatar.webp", { type: "image/webp" });
  } catch {
    return file;
  }
}
