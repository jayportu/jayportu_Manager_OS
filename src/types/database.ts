/**
 * Types de las tablas en Supabase Postgres (manualmente sincronizados).
 *
 * Cuando crezca el schema podemos auto-generarlos con:
 *   npx supabase gen types typescript --project-id exryfdnptrhhwlfgqmpv > src/types/database.ts
 */

// ════════════════════════════════════════════════════════════════════
// dj_profile
// ════════════════════════════════════════════════════════════════════
export interface DjProfile {
  user_id: string;
  artist_name: string;
  tagline: string;
  bio_short: string;
  bio_long: string;
  genres: string[];
  city: string;
  country: string;
  instagram_url: string;
  soundcloud_url: string;
  youtube_url: string;
  spotify_url: string;
  website: string;
  public_email: string;
  whatsapp: string;
  logo_url: string;
  hero_image_url: string;
  tech_rider_ideal: string;
  tech_rider_alt: string;
  hospitality: string;
  public_slug: string;
  created_at: string;
  updated_at: string;
}

export type DjProfileUpdate = Omit<
  Partial<DjProfile>,
  "user_id" | "created_at" | "updated_at"
>;

// ════════════════════════════════════════════════════════════════════
// contacts
// ════════════════════════════════════════════════════════════════════
export const CONTACT_TYPES = [
  "club",
  "bar",
  "rooftop",
  "productora",
  "festival",
  "booker",
  "dj",
  "productor_musical",
  "marca",
  "cliente_evento_privado",
  "promotor",
  "fan_seguidor",
  "otro",
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_STATUS = [
  "nuevo",
  "contactado",
  "respondio",
  "interesado",
  "propuesta_enviada",
  "negociando",
  "confirmado",
  "realizado",
  "perdido",
  "recontactar_despues",
  "ignorar",
] as const;
export type ContactStatus = (typeof CONTACT_STATUS)[number];

export const MAIN_CHANNELS = [
  "whatsapp",
  "email",
  "instagram",
  "presencial",
  "otro",
] as const;
export type MainChannel = (typeof MAIN_CHANNELS)[number];

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  type: ContactType;
  city: string;
  country: string;
  instagram: string;
  whatsapp: string;
  email: string;
  website: string;
  contact_person: string;
  contact_role: string;
  music_style: string;
  main_channel: MainChannel;
  status: ContactStatus;
  score: number;
  score_reason: string;
  source: string;
  last_contact_at: string | null;
  next_followup_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type ContactInsert = Omit<
  Partial<Contact>,
  "id" | "user_id" | "created_at" | "updated_at"
> & {
  name: string;
};

export type ContactUpdate = Omit<
  Partial<Contact>,
  "id" | "user_id" | "created_at" | "updated_at"
>;

// Labels en español para UI
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  club: "Club",
  bar: "Bar",
  rooftop: "Rooftop",
  productora: "Productora",
  festival: "Festival",
  booker: "Booker",
  dj: "DJ",
  productor_musical: "Productor musical",
  marca: "Marca",
  cliente_evento_privado: "Cliente evento privado",
  promotor: "Promotor",
  fan_seguidor: "Fan / seguidor",
  otro: "Otro",
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  respondio: "Respondió",
  interesado: "Interesado",
  propuesta_enviada: "Propuesta enviada",
  negociando: "Negociando",
  confirmado: "Confirmado",
  realizado: "Realizado",
  perdido: "Perdido",
  recontactar_despues: "Recontactar después",
  ignorar: "Ignorar",
};

export const MAIN_CHANNEL_LABELS: Record<MainChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram",
  presencial: "Presencial",
  otro: "Otro",
};

// ════════════════════════════════════════════════════════════════════
// interactions
// ════════════════════════════════════════════════════════════════════
export const INTERACTION_CHANNELS = [
  "whatsapp",
  "email",
  "instagram",
  "llamada",
  "presencial",
  "sms",
  "otro",
] as const;
export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number];

export type InteractionDirection = "in" | "out";

export interface Interaction {
  id: string;
  user_id: string;
  contact_id: string;
  channel: InteractionChannel;
  direction: InteractionDirection;
  note: string;
  happened_at: string;
  created_via: string;
  created_at: string;
}

export type InteractionInsert = {
  contact_id: string;
  channel?: InteractionChannel;
  direction?: InteractionDirection;
  note?: string;
  happened_at?: string;
};

export const INTERACTION_CHANNEL_LABELS: Record<InteractionChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram",
  llamada: "Llamada",
  presencial: "Presencial",
  sms: "SMS",
  otro: "Otro",
};

// ════════════════════════════════════════════════════════════════════
// follow_ups
// ════════════════════════════════════════════════════════════════════
export type FollowUpPriority = "alta" | "normal" | "baja";

export interface FollowUp {
  id: string;
  user_id: string;
  contact_id: string;
  due_at: string;
  note: string;
  priority: FollowUpPriority;
  done: boolean;
  done_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FollowUpInsert = {
  contact_id: string;
  due_at: string;
  note?: string;
  priority?: FollowUpPriority;
};

// ════════════════════════════════════════════════════════════════════
// presskit_events
// ════════════════════════════════════════════════════════════════════
export const PRESSKIT_EVENT_TYPES = [
  "view",
  "click_whatsapp",
  "click_email",
  "click_instagram",
  "click_soundcloud",
  "click_youtube",
  "click_spotify",
  "click_website",
  "click_tech_rider",
  "form_open",
  "form_submit",
] as const;
export type PresskitEventType = (typeof PRESSKIT_EVENT_TYPES)[number];

export interface PresskitEvent {
  id: string;
  user_id: string;
  event: PresskitEventType;
  referrer: string;
  user_agent: string;
  country: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const PRESSKIT_EVENT_LABELS: Record<PresskitEventType, string> = {
  view: "Visita",
  click_whatsapp: "Click WhatsApp",
  click_email: "Click Email",
  click_instagram: "Click Instagram",
  click_soundcloud: "Click SoundCloud",
  click_youtube: "Click YouTube",
  click_spotify: "Click Spotify",
  click_website: "Click Website",
  click_tech_rider: "Click Tech Rider",
  form_open: "Abrió formulario",
  form_submit: "Envió formulario",
};

// ════════════════════════════════════════════════════════════════════
// booking_form_submissions
// ════════════════════════════════════════════════════════════════════
export const BOOKING_STATUS = [
  "pendiente",
  "leido",
  "respondido",
  "convertido",
  "descartado",
] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export interface BookingSubmission {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  event_date: string | null;
  venue: string;
  message: string;
  status: BookingStatus;
  created_contact_id: string | null;
  referrer: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pendiente: "Pendiente",
  leido: "Leído",
  respondido: "Respondido",
  convertido: "Convertido en contacto",
  descartado: "Descartado",
};

// ════════════════════════════════════════════════════════════════════
// templates
// ════════════════════════════════════════════════════════════════════
export const TEMPLATE_CATEGORIES = [
  "primer_contacto",
  "follow_up",
  "envio_press_kit",
  "propuesta",
  "agradecimiento",
  "confirmacion",
  "rider",
  "otro",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_CHANNELS = [
  "whatsapp",
  "email",
  "instagram",
  "otro",
] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export interface Template {
  id: string;
  user_id: string;
  name: string;
  category: TemplateCategory;
  channel_suggested: TemplateChannel;
  subject: string;
  body: string;
  times_used: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TemplateInsert = {
  name: string;
  category?: TemplateCategory;
  channel_suggested?: TemplateChannel;
  subject?: string;
  body: string;
};

export type TemplateUpdate = Partial<
  Omit<Template, "id" | "user_id" | "created_at" | "updated_at" | "times_used">
>;

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  primer_contacto: "Primer contacto",
  follow_up: "Follow-up",
  envio_press_kit: "Envío de press kit",
  propuesta: "Propuesta",
  agradecimiento: "Agradecimiento",
  confirmacion: "Confirmación",
  rider: "Tech rider",
  otro: "Otro",
};

export const TEMPLATE_CHANNEL_LABELS: Record<TemplateChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram",
  otro: "Otro",
};

// ════════════════════════════════════════════════════════════════════
// gmail
// ════════════════════════════════════════════════════════════════════
export interface GmailConnection {
  user_id: string;
  google_email: string;
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_at: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GmailThreadCache {
  id: string;
  user_id: string;
  thread_id: string;
  contact_id: string | null;
  subject: string;
  snippet: string;
  from_email: string;
  from_name: string;
  to_emails: string;
  messages_count: number;
  last_message_at: string | null;
  ai_summary: string;
  created_at: string;
  updated_at: string;
}

// ════════════════════════════════════════════════════════════════════
// Database root
// ════════════════════════════════════════════════════════════════════
export interface Database {
  public: {
    Tables: {
      dj_profile: {
        Row: DjProfile;
        Insert: Partial<DjProfile> & { user_id: string };
        Update: DjProfileUpdate;
      };
      contacts: {
        Row: Contact;
        Insert: ContactInsert & { user_id: string };
        Update: ContactUpdate;
      };
      interactions: {
        Row: Interaction;
        Insert: InteractionInsert & { user_id: string };
        Update: Partial<Interaction>;
      };
      follow_ups: {
        Row: FollowUp;
        Insert: FollowUpInsert & { user_id: string };
        Update: Partial<FollowUp>;
      };
    };
  };
}
