"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, ExternalLink } from "lucide-react";
import {
  promoteLeadAction,
  updateLeadStatusAction,
  deleteLeadAction,
} from "./actions";
import type { LeadStatus } from "@/types/database";

interface Props {
  leadId: string;
  status: LeadStatus;
  promotedContactId: string | null;
}

export function LeadActions({ leadId, status, promotedContactId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status === "added_to_crm" && promotedContactId) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/crm/${promotedContactId}`}>
          Ver en CRM <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </Button>
    );
  }

  async function handlePromote() {
    startTransition(async () => {
      const r = await promoteLeadAction(leadId);
      if (r.ok) {
        router.push(`/crm/${r.data.contact_id}`);
      } else {
        alert(`Error: ${r.error}`);
      }
    });
  }

  async function handleDismiss() {
    startTransition(async () => {
      await updateLeadStatusAction(leadId, "dismissed");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm("¿Borrar este lead?")) return;
    startTransition(async () => {
      await deleteLeadAction(leadId);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        onClick={handlePromote}
        disabled={isPending}
        size="sm"
      >
        <ArrowRight className="w-4 h-4" />
        Agregar al CRM
      </Button>
      {status !== "dismissed" ? (
        <Button
          onClick={handleDismiss}
          disabled={isPending}
          variant="ghost"
          size="sm"
        >
          <X className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          onClick={handleDelete}
          disabled={isPending}
          variant="ghost"
          size="sm"
          className="text-danger hover:text-danger"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
