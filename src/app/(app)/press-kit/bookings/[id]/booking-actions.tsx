"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import {
  BOOKING_STATUS,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/types/database";
import {
  updateBookingStatusAction,
  convertBookingToContactAction,
} from "../../actions";

interface Props {
  id: string;
  status: BookingStatus;
  contactId: string | null;
}

export function BookingActions({ id, status, contactId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleStatus(newStatus: BookingStatus) {
    if (newStatus === status) return;
    startTransition(async () => {
      await updateBookingStatusAction(id, newStatus);
      router.refresh();
    });
  }

  async function handleConvert() {
    startTransition(async () => {
      const result = await convertBookingToContactAction(id);
      if (result.ok) {
        router.push(`/crm/${result.data.contact_id}`);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">
        Acciones
      </h2>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1.5 min-w-[200px]">
          <Label className="text-xs">Cambiar estado</Label>
          <SelectNative
            value={status}
            disabled={isPending}
            onChange={(e) => handleStatus(e.target.value as BookingStatus)}
          >
            {BOOKING_STATUS.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </option>
            ))}
          </SelectNative>
        </div>
        {!contactId && (
          <Button
            type="button"
            onClick={handleConvert}
            disabled={isPending}
          >
            {isPending ? "Procesando…" : "Convertir en contacto del CRM"}
          </Button>
        )}
      </div>
    </Card>
  );
}
