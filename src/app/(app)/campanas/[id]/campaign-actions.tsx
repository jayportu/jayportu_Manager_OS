"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatus,
} from "@/types/database";
import {
  updateCampaignStatusAction,
  deleteCampaignAction,
} from "../actions";

interface Props {
  campaignId: string;
  status: CampaignStatus;
}

export function CampaignActions({ campaignId, status }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  function changeStatus(newStatus: CampaignStatus) {
    if (newStatus === status) return;
    startTransition(async () => {
      await updateCampaignStatusAction(campaignId, newStatus);
      router.refresh();
    });
  }

  async function handleDelete() {
    const { ok } = await confirm({
      title: "¿Borrar esta campaña?",
      message: "Los contactos no se borran del CRM, solo se quitan de la campaña.",
      variant: "danger",
      confirmLabel: "Borrar campaña",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteCampaignAction(campaignId);
      // deleteCampaignAction hace redirect("/campanas")
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <SelectNative
        aria-label="Estado de la campaña"
        value={status}
        onChange={(e) => changeStatus(e.target.value as CampaignStatus)}
        disabled={isPending}
        className="w-32 text-xs"
      >
        {CAMPAIGN_STATUS.map((s) => (
          <option key={s} value={s}>
            {CAMPAIGN_STATUS_LABELS[s]}
          </option>
        ))}
      </SelectNative>
      <Button
        onClick={handleDelete}
        variant="clay"
        size="sm"
        className="text-danger"
        disabled={isPending}
      >
        Borrar
      </Button>
    </div>
  );
}
