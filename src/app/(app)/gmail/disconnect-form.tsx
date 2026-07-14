"use client";

import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Unlink } from "lucide-react";

export function DisconnectForm() {
  const confirm = useConfirm();
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { ok } = await confirm({
      title: "¿Desconectar Gmail?",
      message:
        "Tu data de contactos y plantillas no se borra, solo la conexión OAuth.",
      variant: "warning",
      confirmLabel: "Desconectar",
    });
    if (ok) form.submit();
  }
  return (
    <form action="/api/gmail/disconnect" method="POST" onSubmit={handleSubmit}>
      <Button type="submit" variant="clay" size="sm">
        <Unlink className="w-4 h-4" />
        Desconectar
      </Button>
    </form>
  );
}
