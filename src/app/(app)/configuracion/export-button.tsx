"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Download } from "lucide-react";

export function ExportButton() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        throw new Error("No se pudo exportar");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().split("T")[0];
      a.download = `jay-manager-os-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      await confirm({
        title: "Error al exportar",
        message: "Inténtalo de nuevo en un momento.",
        confirmLabel: "Entendido",
        hideCancel: true,
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline">
      <Download className="w-4 h-4" />
      {loading ? "Generando…" : "Exportar todo a JSON"}
    </Button>
  );
}
