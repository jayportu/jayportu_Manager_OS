"use client";

import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function ConnectGmailButton() {
  return (
    <Button asChild variant="clayPrimary">
      <a href="/api/gmail/auth">
        <Mail className="w-4 h-4" />
        Conectar Gmail
      </a>
    </Button>
  );
}
