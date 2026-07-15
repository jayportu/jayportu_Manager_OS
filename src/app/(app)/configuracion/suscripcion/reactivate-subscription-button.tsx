"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reactivateSubscriptionAction } from "@/app/suscripcion/actions";
import { Button } from "@/components/ui/button";

export function ReactivateSubscriptionButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await reactivateSubscriptionAction();
      if (res.ok) {
        router.push("/suscripcion");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="clay"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? "Reactivando…" : "Reactivar"}
    </Button>
  );
}
