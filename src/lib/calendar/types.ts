/**
 * Tipos compartidos del módulo Calendar (usables en client y server).
 * Sin server-only para que se puedan importar desde Client Components.
 */

export const CALENDAR_EVENT_TYPES = [
  "show",
  "reunion",
  "follow_up",
  "bloqueo",
  "contenido",
  "otro",
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  show: "Show",
  reunion: "Reunión",
  follow_up: "Follow-up",
  bloqueo: "Bloqueo",
  contenido: "Contenido",
  otro: "Otro",
};

/** Sprint 19 — Estado del cobro de un gig */
export const PAYMENT_STATUSES = ["paid", "pending", "partial", "none"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  partial: "Parcial",
  none: "Sin cobro / canje",
};

/** Sprint 19 — Tipo de documento emitido */
export const DOCUMENT_TYPES = ["boleta", "factura", "none"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  boleta: "Boleta de honorarios",
  factura: "Factura",
  none: "Sin documento",
};

export interface CalendarEventRow {
  id: string;
  user_id: string;
  google_event_id: string | null;
  google_calendar_id: string;
  type: CalendarEventType;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  contact_id: string | null;
  sync_state: string;
  last_synced_at: string | null;
  /** Sprint 19 — Tracking financiero */
  amount_clp: number | null;
  payment_status: PaymentStatus;
  document_type: DocumentType;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
