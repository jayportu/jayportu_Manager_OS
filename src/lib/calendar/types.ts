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
  created_at: string;
  updated_at: string;
}
