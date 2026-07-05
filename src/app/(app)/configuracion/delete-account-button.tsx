"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { deleteMyAccountAction } from "./actions";
import { Trash2 } from "lucide-react";

export function DeleteAccountButton() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const { ok } = await confirm({
      title: "Eliminar cuenta",
      message:
        "Esto borra tu perfil, press kit, contactos, calendario, integraciones y archivos de forma PERMANENTE e irreversible. Los documentos tributarios se conservan por obligación legal y los registros de baja de correo se mantienen para respetar tu oposición. Antes de continuar, considera exportar tus datos.",
      confirmLabel: "Eliminar mi cuenta",
      variant: "danger",
      typeToConfirm: "ELIMINAR",
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await deleteMyAccountAction("ELIMINAR");
      if (!res.ok) {
        setLoading(false);
        await confirm({
          title: "No se pudo eliminar",
          message: res.error,
          confirmLabel: "Entendido",
          hideCancel: true,
          variant: "danger",
        });
        return;
      }
      // La cuenta de auth ya no existe → cerramos la sesión local y salimos.
      try {
        await createClient().auth.signOut();
      } catch {
        /* la sesión ya es inválida; redirigimos igual */
      }
      window.location.href = "/";
    } catch {
      setLoading(false);
      await confirm({
        title: "No se pudo eliminar",
        message: "Inténtalo de nuevo en un momento.",
        confirmLabel: "Entendido",
        hideCancel: true,
        variant: "danger",
      });
    }
  }

  return (
    <Button onClick={handleDelete} disabled={loading} variant="destructive">
      <Trash2 className="w-4 h-4" />
      {loading ? "Eliminando…" : "Eliminar mi cuenta"}
    </Button>
  );
}
