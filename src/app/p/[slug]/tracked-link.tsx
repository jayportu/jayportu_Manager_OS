"use client";

import type { PresskitEventType } from "@/types/database";
import { cn } from "@/lib/utils";

interface TrackedLinkProps {
  href: string;
  userId: string;
  event: PresskitEventType;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function TrackedLink({
  href,
  userId,
  event,
  external = false,
  className,
  children,
}: TrackedLinkProps) {
  function handleClick() {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event }),
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      className={cn(className)}
    >
      {children}
    </a>
  );
}
