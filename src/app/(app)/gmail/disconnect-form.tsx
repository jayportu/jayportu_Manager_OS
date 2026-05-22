"use client";

import { Button } from "@/components/ui/button";
import { Unlink } from "lucide-react";

export function DisconnectForm() {
  function handleSubmit(e: React.FormEvent) {
    if (!confirm("¿Desconectar Gmail? Tu data de contactos y plantillas no se borra, solo la conexión OAuth.")) {
      e.preventDefault();
    }
  }
  return (
    <form action="/api/gmail/disconnect" method="POST" onSubmit={handleSubmit}>
      <Button type="submit" variant="outline" size="sm">
        <Unlink className="w-4 h-4" />
        Desconectar
      </Button>
    </form>
  );
}
