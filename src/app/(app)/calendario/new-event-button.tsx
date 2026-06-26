"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Plus, X } from "lucide-react";
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type CalendarEventType,
  type PaymentStatus,
  type DocumentType,
} from "@/lib/calendar/types";
import { createEventAction } from "./actions";

interface Props {
  /** Si está presente, el modal queda con contactId preseleccionado */
  contactId?: string;
  /** Label custom del botón */
  buttonLabel?: string;
  /** Variant del botón */
  buttonVariant?:
    | "default"
    | "outline"
    | "ghost"
    | "secondary"
    | "destructive"
    | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

function defaultStart(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function defaultEnd(): string {
  const d = new Date();
  d.setHours(d.getHours() + 3, 0, 0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function NewEventButton({
  contactId,
  buttonLabel,
  buttonVariant,
  buttonSize,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<CalendarEventType>("show");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(defaultStart());
  const [endAt, setEndAt] = useState(defaultEnd());
  // Sprint 19 — campos financieros opcionales
  const [showFinance, setShowFinance] = useState(false);
  const [amountClp, setAmountClp] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("none");
  const [documentType, setDocumentType] = useState<DocumentType>("none");

  function close() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Pon un título.");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }
    const amount = amountClp ? parseInt(amountClp.replace(/\D/g, ""), 10) : null;
    startTransition(async () => {
      const result = await createEventAction({
        type,
        title,
        description,
        location,
        startISO: new Date(startAt).toISOString(),
        endISO: new Date(endAt).toISOString(),
        contactId: contactId || null,
        // Sprint 19 — solo enviar si el bloque está abierto + valor válido
        amount_clp: showFinance && amount && !isNaN(amount) ? amount : null,
        payment_status: showFinance ? paymentStatus : "none",
        document_type: showFinance ? documentType : "none",
      });
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={buttonVariant || "default"}
        size={buttonSize || "sm"}
      >
        <Plus className="w-4 h-4" />
        {buttonLabel || "Nuevo evento"}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
        >
          <Card
            className="bg-bg-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nuevo evento</h2>
              <button
                type="button"
                onClick={close}
                className="text-fg-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-xs">
                    Tipo
                  </Label>
                  <SelectNative
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as CalendarEventType)}
                  >
                    {CALENDAR_EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {CALENDAR_EVENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs">
                    Lugar
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Club, dirección…"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">
                  Título *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="JAY @ Club La Feria"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_at" className="text-xs">
                    Inicio
                  </Label>
                  <Input
                    id="start_at"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_at" className="text-xs">
                    Fin
                  </Label>
                  <Input
                    id="end_at"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Fee, condiciones, rider, etc."
                />
              </div>

              {/* Sprint 19 — Bloque financiero opcional */}
              {type === "show" && (
                <div className="border-2 border-dashed border-border p-3 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFinance}
                      onChange={(e) => setShowFinance(e.target.checked)}
                      className="w-4 h-4 accent-orange"
                    />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange">
                      💰 Agregar info de cobro
                    </span>
                  </label>
                  {showFinance && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="amount" className="text-[10px]">
                          Monto (CLP)
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="pay-status" className="text-[10px]">
                            Estado pago
                          </Label>
                          <SelectNative
                            id="pay-status"
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
                          <Label htmlFor="doc" className="text-[10px]">
                            Documento
                          </Label>
                          <SelectNative
                            id="doc"
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
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={close}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creando…" : "Crear en Google Calendar"}
                </Button>
              </div>

              <p className="text-[10px] text-fg-subtle text-center pt-2">
                El evento se crea en tu Google Calendar (calendario primario)
                y queda registrado en la app.
              </p>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
