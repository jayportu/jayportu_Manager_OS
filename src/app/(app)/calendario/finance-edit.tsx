"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { DollarSign, X } from "lucide-react";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type PaymentStatus,
  type DocumentType,
} from "@/lib/calendar/types";
import { updateEventFinanceAction } from "./actions";

interface Props {
  eventId: string;
  title: string;
  current: {
    amount_clp: number | null;
    payment_status: PaymentStatus;
    document_type: DocumentType;
  };
}

export function FinanceEditDialog({ eventId, title, current }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [amountClp, setAmountClp] = useState(
    current.amount_clp ? `$${current.amount_clp.toLocaleString("es-CL")}` : ""
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    current.payment_status
  );
  const [documentType, setDocumentType] = useState<DocumentType>(
    current.document_type
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = amountClp
      ? parseInt(amountClp.replace(/\D/g, ""), 10)
      : null;
    startTransition(async () => {
      const result = await updateEventFinanceAction(eventId, {
        amount_clp: amount && !isNaN(amount) ? amount : null,
        payment_status: paymentStatus,
        document_type: documentType,
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const hasFinanceInfo =
    current.amount_clp !== null || current.payment_status !== "none";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={`p-1.5 border-2 border-ink transition-colors ${
          hasFinanceInfo
            ? "bg-orange text-ink hover:bg-ink hover:text-orange"
            : "bg-cream hover:bg-ink hover:text-orange"
        }`}
        title="Editar info de cobro"
      >
        <DollarSign className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
                  — INFO DE COBRO
                </div>
                <h2 className="font-display text-2xl leading-none mt-1">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-fg-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-[10px]">
                  Monto cobrado (CLP)
                </Label>
                <Input
                  id="amount"
                  value={amountClp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setAmountClp(
                      v ? `$${parseInt(v, 10).toLocaleString("es-CL")}` : ""
                    );
                  }}
                  placeholder="$420.000"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-status-edit" className="text-[10px]">
                  Estado del pago
                </Label>
                <SelectNative
                  id="pay-status-edit"
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(e.target.value as PaymentStatus)
                  }
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PAYMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-edit" className="text-[10px]">
                  Documento
                </Label>
                <SelectNative
                  id="doc-edit"
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(e.target.value as DocumentType)
                  }
                >
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {DOCUMENT_TYPE_LABELS[d]}
                    </option>
                  ))}
                </SelectNative>
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger/10 border-2 border-danger px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-ink">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="orange" disabled={isPending}>
                  {isPending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
