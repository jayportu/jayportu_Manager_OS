"use client";

import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

interface TopbarProps {
  userEmail?: string;
}

export function Topbar({ userEmail }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header
      className="border-b border-border bg-bg flex items-center px-4 md:px-6 gap-4 shrink-0 h-16"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        height: "calc(4rem + env(safe-area-inset-top))",
      }}
    >
      {/* Logo mobile */}
      <div className="md:hidden flex items-center">
        <Logo variant="stacked" tone="light" size={52} />
      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar contacto, venue, fecha…"
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-bg-panel border border-border text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-accent"
        />
      </div>

      <div className="flex-1 md:hidden" />

      {/* User actions */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-xs text-fg-muted">
          {userEmail}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
