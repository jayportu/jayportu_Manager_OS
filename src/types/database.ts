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
