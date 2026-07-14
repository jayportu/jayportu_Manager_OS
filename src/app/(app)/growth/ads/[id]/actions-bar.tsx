"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  GROWTH_CAMPAIGN_STATUS,
  GROWTH_CAMPAIGN_STATUS_LABELS,
  type GrowthCampaignStatus,
} from "@/types/database";
import {
  updateGrowthCampaignStatusAction,
  deleteGrowthCampaignAction,
} from "../../actions";

interface Props {
  campaignId: string;
  status: GrowthCampaignStatus;
}

export function GrowthCampaignActions({ campaignId, status }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  function changeStatus(newStatus: GrowthCampaignStatus) {
    if (newStatus === status) return;
    startTransition(async () => {
      await updateGrowthCampaignStatusAction(campaignId, newStatus);
      router.refresh();
    });
  }

  async function handleDelete() {
    const { ok } = await confirm({
      title: "¿Borrar esta campaña?",
      message: "Los posts asociados quedan en /growth/posts (sin campaña).",
      variant: "danger",
      confirmLabel: "Borrar campaña",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteGrowthCampaignAction(campaignId);
    });
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <SelectNative
        value={status}
        onChange={(e) =>
          changeStatus(e.target.value as GrowthCampaignStatus)
        }
        disabled={isPending}
        className="w-32 text-xs"
      >
        {GROWTH_CAMPAIGN_STATUS.map((s) => (
          <option key={s} value={s}>
            {GROWTH_CAMPAIGN_STATUS_LABELS[s]}
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
