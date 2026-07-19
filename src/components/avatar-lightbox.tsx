"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface AvatarLightboxProps {
  src: string;
  alt: string;
  /** Classes del botón trigger (tamaño, márgenes). */
  className?: string;
  /** Classes de la imagen dentro del trigger. Default: circular con borde naranja (press kit). */
  imgClassName?: string;
}

const DEFAULT_IMG_CLASS =
  "w-full h-full rounded-full object-cover border-4 border-orange transition-transform group-hover:scale-[1.03]";

/**
 * Avatar circular que abre la foto a tamaño real en un overlay al hacer
 * click. Cierra con ESC, con click fuera o con la X. Bloquea scroll del
 * body mientras está abierto.
 */
export function AvatarLightbox({
  src,
  alt,
  className,
  imgClassName,
}: AvatarLightboxProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver foto a tamaño real"
        className={`group relative cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-ink rounded-full ${className ?? ""}`}
      >
        {/* next/image fill → retina automática (1x/2x/3x srcset) + WebP/AVIF
            si el browser lo soporta. Sin esto, el thumbnail (72-112px) tiraba
            del JPEG original de 4 MB y se veía con bordes pixelados en Mac
            Retina / iPhone. El parent button ya tiene `relative` para fill. */}
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 96px, 128px"
          className={imgClassName ?? DEFAULT_IMG_CLASS}
          quality={90}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${alt}`}
          onClick={() => setOpen(false)}
        >
          {/* Botón cerrar — esquina superior derecha */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Cerrar"
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-orange text-ink border border-white/20 hover:bg-orange/85 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl border border-white/15 shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
