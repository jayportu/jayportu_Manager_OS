"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <Button onClick={handleCopy} variant={copied ? "clayPrimary" : "clay"} size="sm">
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copiar
        </>
      )}
    </Button>
  );
}
