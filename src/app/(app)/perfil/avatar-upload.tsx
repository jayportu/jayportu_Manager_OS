"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadAvatarAction, deleteAvatarAction } from "./avatar-actions";

interface AvatarUploadProps {
  initialUrl: string;
  artistName: string;
}

export function AvatarUpload({ initialUrl, artistName }: AvatarUploadProps) {
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
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const res = await uploadAvatarAction(formData);
      if (res.ok) {
        setUrl(res.data.url);
        router.refresh();
      } else {
        setError(res.error);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteAvatarAction();
      if (res.ok) {
        setUrl("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted">
        — Foto de perfil
      </span>
      <div className="flex items-center gap-4">
        {/* Preview circular */}
        <div className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden border-2 border-ink bg-ink flex items-center justify-center">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
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
          )}
        </div>

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
          <p className="text-xs text-fg-subtle">JPG, PNG o WebP · máx. 5 MB</p>
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
