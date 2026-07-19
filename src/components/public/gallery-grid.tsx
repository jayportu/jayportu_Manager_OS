"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryImage } from "@/types/database";
import { MonoLabel } from "@/components/hos";

/**
 * Galería pública del press kit: miniaturas agrupadas por carpeta + lightbox
 * con navegación ← →. La navegación recorre TODAS las fotos en orden (carpeta
 * tras carpeta), no solo la carpeta abierta.
 */
export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const flat = images.filter((i) => i.url);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpenIdx(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);
  const go = useCallback(
    (dir: 1 | -1) => setOpenIdx((i) => (i === null ? i : (i + dir + flat.length) % flat.length)),
    [flat.length]
  );

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openIdx, close, go]);

  if (flat.length === 0) return null;

  const grouped = groupByFolder(flat);
  const current = openIdx === null ? null : flat[openIdx];

  return (
    <>
      <div className="space-y-6">
        {grouped.map(({ folder, items }) => (
          <div key={folder ?? "__none__"} className="space-y-3">
            {folder && <MonoLabel className="block">{folder}</MonoLabel>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
              {items.map((img) => {
                const idx = flat.indexOf(img);
                return (
                  <button
                    key={img.url}
                    type="button"
                    onClick={(e) => {
                      triggerRef.current = e.currentTarget;
                      setOpenIdx(idx);
                    }}
                    aria-label={img.caption || "Ampliar foto"}
                    className="group relative aspect-square rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Image
                      src={img.url}
                      alt={img.caption || "Foto"}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 240px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label="Galería"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); close(); }}
            aria-label="Cerrar"
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-orange text-ink border border-white/20 hover:bg-orange/85 transition-colors z-10"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {flat.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label="Foto anterior"
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-ink/70 text-white border border-white/20 hover:bg-orange hover:text-ink transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label="Foto siguiente"
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-ink/70 text-white border border-white/20 hover:bg-orange hover:text-ink transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" aria-hidden="true" />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.caption || "Foto de galería"}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl border border-white/15 shadow-2xl"
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[11px] text-white/80 tracking-wider">
            {(openIdx ?? 0) + 1} / {flat.length}
            {current.caption ? ` · ${current.caption}` : ""}
          </div>
        </div>
      )}
    </>
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
  return Array.from(map.entries())
    .map(([k, items]) => ({ folder: k || null, items }))
    .sort((a, b) => (a.folder === null ? 1 : 0) - (b.folder === null ? 1 : 0));
}
