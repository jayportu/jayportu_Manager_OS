/**
 * Types de las tablas en Supabase Postgres (manualmente sincronizados).
 *
 * Cuando crezca el schema podemos auto-generarlos con:
 *   npx supabase gen types typescript --project-id exryfdnptrhhwlfgqmpv > src/types/database.ts
 */

// ════════════════════════════════════════════════════════════════════
// dj_profile

/** Imagen de la galería del press kit. Migration 0061. La imagen vive en
 *  Storage (bucket avatars, path <user>/gallery/...); acá guardamos URL +
 *  metadata. `folder` agrupa fotos (ej. "Live", "Estudio"); null = sin carpeta. */
export interface GalleryImage {
  url: string;
  folder?: string | null;
  caption?: string | null;
}
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
  /** Catálogo/discografía: links a tiendas de música. Capa 2. */
  beatport_url: string;
  bandcamp_url: string;
  /** Releases de Beatport destacados (URLs) → player oficial embebido. */
  beatport_releases: string[];
  website: string;
  /** Sets/mixes destacados (varios). URLs SoundCloud/Mixcloud/YouTube. Fase 1 · 1B. */
  featured_sets: string[];
  /** Marcas/clubs con los que trabajó (social proof). Fase 1 · 1C. */
  brands_worked: string[];
  /** Otros nombres / proyectos b2b. Fase 1 · 1D. */
  aliases: string[];
  /** Sello / record label. Fase 1 · 1D. */
  record_label: string;
  /** Fee referencial opt-in. Fase 1 · 1E. show_fee gobierna visibilidad; rango en CLP. */
  show_fee: boolean;
  fee_min: number | null;
  fee_max: number | null;
  public_email: string;
  whatsapp: string;
  logo_url: string;
  hero_image_url: string;
  avatar_url: string;
  /** Galería del press kit: fotos con carpetas. Migration 0061. */
  gallery: GalleryImage[];
  tech_rider_ideal: string;
  tech_rider_alt: string;
  hospitality: string;
  public_slug: string;
  onboarding_completed_at: string | null;
  is_admin: boolean;
  /** Verificación manual por admin (Fase 1 · 1A). null = no verificado. */
  verified_at: string | null;
  verified_by: string | null;
  /** Chequeos de confiabilidad granular otorgados por admin: 'identity' | 'socials' | 'sets'. Fase 1 · 1F. */
  verifications: string[];
  /** DROP Picks (RA-2A): destacado curado por admin + prioridad de orden. */
  is_drop_pick: boolean;
  drop_pick_priority: number;
  press_kit_mode: "generated" | "pdf";
  press_kit_pdf_url: string;
  press_kit_pdf_filename: string;
  press_kit_pdf_size_bytes: number;
  /** Sprint 20 — Marketplace */
  hidden_from_directory: boolean;
  available_from: string | null;
  available_until: string | null;
  available_note: string;
  /** Sprint 21 — Webhook genérico (Zapier/Make/n8n) para auto-post */
  auto_post_webhook_url: string | null;
  auto_post_enabled: boolean;
  /** Sprint 23.5 — Estado del usuario en la beta cerrada */
  beta_status: BetaStatus;
  beta_approved_at: string | null;
  beta_request_id: string | null;
  /** Migration 0030 — moderación de cuentas (suspender / banear) */
  account_status: AccountStatus;
  account_status_reason: string | null;
  account_status_changed_at: string | null;
  account_status_changed_by: string | null;
  /** Migration 0031 — aceptación de Términos (click-wrap) */
  tos_accepted_at: string | null;
  tos_version: string | null;
  /** Migration 0062 — correos de activación (dedup one-shot, server-set) */
  welcome_email_sent_at: string | null;
  presskit_live_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Migration 0030 — estado de moderación de la cuenta.
 *  'active'    → acceso normal (default)
 *  'suspended' → bloqueo temporal reversible
 *  'banned'    → cuenta cerrada permanentemente */
export const ACCOUNT_STATUSES = ["active", "suspended", "banned"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Bloque B — Tipos de booker. Fuente única (signup + perfil). */
export const BOOKER_TYPES = [
  { value: "venue", label: "Venue / Club / Bar" },
  { value: "productora", label: "Productora de eventos" },
  { value: "agencia", label: "Agencia de booking" },
  { value: "evento_privado", label: "Evento privado" },
  { value: "casamiento", label: "Casamiento / Matrimonio" },
  { value: "corporativo", label: "Evento corporativo" },
  { value: "festival", label: "Festival" },
  { value: "otro", label: "Otro" },
] as const;
export type BookerType = (typeof BOOKER_TYPES)[number]["value"];

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

/** Sprint 20 — Tipos de contacto que son "venues" (lugares físicos donde
 *  el DJ toca). Solo estos muestran capacity_estimate y accepted_genres. */
export const VENUE_TYPES: ContactType[] = [
  "club",
  "bar",
  "rooftop",
  "festival",
  "productora",
];

export function isVenueType(t: ContactType): boolean {
  return VENUE_TYPES.includes(t);
}

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
  /** Sprint 19 — Tags arbitrarios para segmentación (lowercase, sin espacios) */
  tags: string[];
  /** Sprint 19 — Notas privadas (RLS estricto, solo owner, nunca exportadas) */
  private_notes: string;
  /** Sprint 20 — Para venues: capacidad estimada (personas) */
  capacity_estimate: number | null;
  /** Sprint 20 — Para venues: géneros que aceptan (filtro en /descubrir) */
  accepted_genres: string[];
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

/** Sprint 19 — Unidades de recurrencia de follow-ups */
export const RECURRENCE_UNITS = ["days", "weeks", "months"] as const;
export type RecurrenceUnit = (typeof RECURRENCE_UNITS)[number];

export const RECURRENCE_UNIT_LABELS: Record<RecurrenceUnit, string> = {
  days: "Días",
  weeks: "Semanas",
  months: "Meses",
};

export interface FollowUp {
  id: string;
  user_id: string;
  contact_id: string;
  due_at: string;
  note: string;
  priority: FollowUpPriority;
  done: boolean;
  done_at: string | null;
  /** Sprint 19 — Recurrencia */
  is_recurring: boolean;
  recurrence_value: number | null;
  recurrence_unit: RecurrenceUnit | null;
  recurrence_series_id: string | null;
  recurrence_index: number;
  recurrence_max: number | null;
  created_at: string;
  updated_at: string;
}

export type FollowUpInsert = {
  contact_id: string;
  due_at: string;
  note?: string;
  priority?: FollowUpPriority;
  is_recurring?: boolean;
  recurrence_value?: number | null;
  recurrence_unit?: RecurrenceUnit | null;
  recurrence_max?: number | null;
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
  "click_beatport",
  "click_bandcamp",
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
  click_beatport: "Click Beatport",
  click_bandcamp: "Click Bandcamp",
  click_website: "Click Website",
  click_tech_rider: "Click Tech Rider",
  form_open: "Abrió formulario",
  form_submit: "Envió formulario",
};

// ════════════════════════════════════════════════════════════════════
// Sprint 21 — tech_rider_items
// ════════════════════════════════════════════════════════════════════

export const RIDER_CATEGORIES = [
  "reproduccion",
  "mixer",
  "monitores",
  "power_cables",
  "hospitality",
  "otros",
] as const;
export type RiderCategory = (typeof RIDER_CATEGORIES)[number];

export const RIDER_CATEGORY_LABELS: Record<RiderCategory, string> = {
  reproduccion: "Reproducción",
  mixer: "Mixer",
  monitores: "Monitores",
  power_cables: "Power + Cables",
  hospitality: "Hospitality",
  otros: "Otros",
};

export interface TechRiderItem {
  id: string;
  user_id: string;
  category: RiderCategory;
  name: string;
  quantity: number;
  alt_text: string;
  note: string;
  sort_order: number;
  is_alternative: boolean;
  created_at: string;
  updated_at: string;
}

export type TechRiderItemInsert = {
  category: RiderCategory;
  name: string;
  quantity?: number;
  alt_text?: string;
  note?: string;
  sort_order?: number;
  is_alternative?: boolean;
};

// ════════════════════════════════════════════════════════════════════
// Sprint 21 — tracklists + tracklist_tracks
// ════════════════════════════════════════════════════════════════════

export const TRACK_TAGS = ["intro", "peak", "closer"] as const;
export type TrackTag = (typeof TRACK_TAGS)[number];

export const TRACK_TAG_LABELS: Record<TrackTag, string> = {
  intro: "Intro",
  peak: "Peak",
  closer: "Closer",
};

export interface Tracklist {
  id: string;
  user_id: string;
  calendar_event_id: string | null;
  title: string;
  started_at: string | null;
  ended_at: string | null;
  notes: string;
  total_tracks: number;
  duration_minutes: number | null;
  bpm_avg: number | null;
  created_at: string;
  updated_at: string;
}

export interface TracklistTrack {
  id: string;
  tracklist_id: string;
  user_id: string;
  sort_order: number;
  artist: string;
  title: string;
  label: string;
  bpm: number | null;
  music_key: string;
  tag: TrackTag | null;
  played_at: string | null;
  notes: string;
  created_at: string;
}

export type TracklistTrackInsert = {
  tracklist_id: string;
  sort_order?: number;
  artist?: string;
  title?: string;
  label?: string;
  bpm?: number | null;
  music_key?: string;
  tag?: TrackTag | null;
  played_at?: string | null;
  notes?: string;
};

// ════════════════════════════════════════════════════════════════════
// booking_form_submissions
// ════════════════════════════════════════════════════════════════════
// Sprint 20 — Workflow extendido para inbox de bookings
export const BOOKING_STATUS = [
  "nuevo",
  "leido",
  "respondido",
  "cotizado",
  "contraofertado",
  "agendado",
  "rechazado",
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
  /** Sprint 20 — Workflow */
  quoted_amount_clp: number | null;
  notes_internal: string;
  follow_up_id: string | null;
  calendar_event_id: string | null;
  quoted_at: string | null;
  agendado_at: string | null;
  /** Bloque B — Booker logueado opcional + token público para /b/[token] */
  booker_user_id: string | null;
  view_token: string;
  /** Bloque C — Counteroffer del booker después de cotizado */
  counter_amount_clp: number | null;
  counter_event_date: string | null;
  counter_message: string;
  counter_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  nuevo: "Nuevo",
  leido: "Leído",
  respondido: "Respondido",
  cotizado: "Cotizado",
  contraofertado: "Contraoferta del booker",
  agendado: "Agendado",
  rechazado: "Rechazado",
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
// discovered_leads
// ════════════════════════════════════════════════════════════════════
export const LEAD_SOURCES = [
  "overpass",
  "manual_text",
  "csv",
  "ai_extracted",
  "gmail_thread",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUS = [
  "new",
  "reviewed",
  "added_to_crm",
  "dismissed",
  "ignored",
] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  reviewed: "Revisado",
  added_to_crm: "En CRM",
  dismissed: "Descartado",
  ignored: "Ignorado",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  overpass: "OpenStreetMap",
  manual_text: "Texto pegado",
  csv: "CSV",
  ai_extracted: "Extraído por IA",
  gmail_thread: "Hilo Gmail",
};

export interface DiscoveredLead {
  id: string;
  user_id: string;
  name: string;
  type: ContactType;
  city: string;
  country: string;
  address: string;
  lat: number | null;
  lng: number | null;
  instagram: string;
  whatsapp: string;
  email: string;
  website: string;
  phone: string;
  source: LeadSource;
  source_id: string;
  source_query: string;
  raw_data: Record<string, unknown>;
  ai_summary: string;
  ai_score: number | null;
  ai_score_reason: string;
  music_style_guess: string;
  action_recommended: string;
  status: LeadStatus;
  promoted_contact_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type DiscoveredLeadInsert = {
  name: string;
  type?: ContactType;
  city?: string;
  country?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  instagram?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  phone?: string;
  source?: LeadSource;
  source_id?: string;
  source_query?: string;
  raw_data?: Record<string, unknown>;
  notes?: string;
};

// ════════════════════════════════════════════════════════════════════
// campaigns
// ════════════════════════════════════════════════════════════════════
export const CAMPAIGN_CHANNELS = [
  "whatsapp",
  "email",
  "instagram",
  "mixto",
  "otro",
] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_STATUS = [
  "draft",
  "active",
  "paused",
  "done",
  "archived",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  paused: "Pausada",
  done: "Terminada",
  archived: "Archivada",
};

export const CAMPAIGN_CHANNEL_LABELS: Record<CampaignChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram",
  mixto: "Mixto",
  otro: "Otro",
};

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  goal: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  template_id: string | null;
  message_base: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignInsert = {
  name: string;
  goal?: string;
  channel?: CampaignChannel;
  status?: CampaignStatus;
  template_id?: string | null;
  message_base?: string;
};

export const CAMPAIGN_CONTACT_STATUS = [
  "pendiente",
  "preparado",
  "enviado",
  "respondio",
  "interesado",
  "no_respondio",
  "seguimiento_pendiente",
  "convertido",
  "cerrado",
  "descartado",
] as const;
export type CampaignContactStatus = (typeof CAMPAIGN_CONTACT_STATUS)[number];

export const CAMPAIGN_CONTACT_STATUS_LABELS: Record<
  CampaignContactStatus,
  string
> = {
  pendiente: "Pendiente",
  preparado: "Preparado",
  enviado: "Enviado",
  respondio: "Respondió",
  interesado: "Interesado",
  no_respondio: "No respondió",
  seguimiento_pendiente: "Seguimiento pendiente",
  convertido: "Convertido",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

export interface CampaignContact {
  id: string;
  user_id: string;
  campaign_id: string;
  contact_id: string;
  status: CampaignContactStatus;
  contacted_at: string | null;
  response_at: string | null;
  last_message: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ════════════════════════════════════════════════════════════════════
// Growth: growth_campaigns + content_posts + platform_snapshots
// ════════════════════════════════════════════════════════════════════

export const SOCIAL_PLATFORMS = [
  "instagram",
  "youtube",
  "spotify",
  "soundcloud",
  "tiktok",
  "twitter",
  "facebook",
  "otro",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  tiktok: "TikTok",
  twitter: "Twitter / X",
  facebook: "Facebook",
  otro: "Otro",
};

export const POST_FORMATS = [
  "reel",
  "post",
  "story",
  "carousel",
  "video",
  "short",
  "live",
  "set",
  "track",
  "mix",
  "otro",
] as const;
export type PostFormat = (typeof POST_FORMATS)[number];

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  reel: "Reel",
  post: "Post",
  story: "Story",
  carousel: "Carrusel",
  video: "Video",
  short: "Short",
  live: "Live",
  set: "Set",
  track: "Track",
  mix: "Mix",
  otro: "Otro",
};

export const POST_STATUS = [
  "idea",
  "borrador",
  "planeado",
  "publicado",
  "cancelado",
] as const;
export type PostStatus = (typeof POST_STATUS)[number];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  idea: "Idea",
  borrador: "Borrador",
  planeado: "Programado",
  publicado: "Publicado",
  cancelado: "Cancelado",
};

/** Plataformas de pauta pagada para growth_campaigns.platform_ads */
export const AD_PLATFORMS = [
  "meta_ads",
  "google_ads",
  "tiktok_ads",
  "spotify_ads",
  "youtube_ads",
] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

export const AD_PLATFORM_LABELS: Record<AdPlatform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok_ads: "TikTok Ads",
  spotify_ads: "Spotify Ads",
  youtube_ads: "YouTube Ads",
};

export const GROWTH_CAMPAIGN_STATUS = [
  "draft",
  "active",
  "paused",
  "done",
  "archived",
] as const;
export type GrowthCampaignStatus = (typeof GROWTH_CAMPAIGN_STATUS)[number];

export const GROWTH_CAMPAIGN_STATUS_LABELS: Record<
  GrowthCampaignStatus,
  string
> = {
  draft: "Borrador",
  active: "Activa",
  paused: "Pausada",
  done: "Terminada",
  archived: "Archivada",
};

export interface GrowthCampaign {
  id: string;
  user_id: string;
  name: string;
  goal: string;
  status: GrowthCampaignStatus;
  platforms: SocialPlatform[];
  target_followers: Record<string, number>;
  target_engagement_rate: number | null;
  target_posts_count: number | null;
  target_reach: number | null;
  baseline_followers: Record<string, number>;
  baseline_at: string | null;
  started_at: string | null;
  end_date: string | null;
  ended_at: string | null;
  /** Sprint 18 — Campaña pagada */
  is_paid: boolean;
  platform_ads: AdPlatform[];
  budget_clp: number | null;
  external_url: string | null;
  result_notes: string;
  created_at: string;
  updated_at: string;
}

export type GrowthCampaignInsert = {
  name: string;
  goal?: string;
  status?: GrowthCampaignStatus;
  platforms: SocialPlatform[];
  target_followers?: Record<string, number>;
  target_engagement_rate?: number | null;
  target_posts_count?: number | null;
  target_reach?: number | null;
  baseline_followers?: Record<string, number>;
  end_date?: string | null;
  is_paid?: boolean;
  platform_ads?: AdPlatform[];
  budget_clp?: number | null;
  external_url?: string | null;
  result_notes?: string;
};

export interface ContentPost {
  id: string;
  user_id: string;
  growth_campaign_id: string | null;
  platform: SocialPlatform;
  format: PostFormat;
  title: string;
  description: string;
  url: string;
  status: PostStatus;
  planned_at: string | null;
  published_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  plays: number | null;
  reach: number | null;
  notes: string;
  /** Sprint 18 — hashtags asociados al post */
  hashtags: string[];
  ai_analysis: string;
  performance_score: number | null;
  created_at: string;
  updated_at: string;
}

export type ContentPostInsert = {
  platform: SocialPlatform;
  format?: PostFormat;
  title?: string;
  description?: string;
  url?: string;
  status?: PostStatus;
  planned_at?: string | null;
  published_at?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  plays?: number | null;
  reach?: number | null;
  notes?: string;
  hashtags?: string[];
  growth_campaign_id?: string | null;
};

export interface PlatformSnapshot {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  followers: number | null;
  following: number | null;
  total_posts: number | null;
  total_views_lifetime: number | null;
  total_likes_lifetime: number | null;
  engagement_rate: number | null;
  notes: string;
  source: "manual" | "auto";
  snapshot_at: string;
  created_at: string;
}

export type PlatformSnapshotInsert = {
  platform: SocialPlatform;
  followers?: number | null;
  following?: number | null;
  total_posts?: number | null;
  total_views_lifetime?: number | null;
  total_likes_lifetime?: number | null;
  engagement_rate?: number | null;
  notes?: string;
  source?: "manual" | "auto";
};

// ════════════════════════════════════════════════════════════════════
// platform_accounts (Sprint 11 — auto-sync)
// ════════════════════════════════════════════════════════════════════
export interface PlatformAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform | "mixcloud";
  username: string;
  external_id: string | null;
  auto_sync_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  last_followers: number | null;
  last_track_count: number | null;
  created_at: string;
  updated_at: string;
}

export type PlatformAccountInsert = {
  platform: SocialPlatform | "mixcloud";
  username: string;
  auto_sync_enabled?: boolean;
};

// ════════════════════════════════════════════════════════════════════
// push_subscriptions
// ════════════════════════════════════════════════════════════════════
export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  created_at: string;
  last_used_at: string | null;
  last_error: string | null;
}

// ════════════════════════════════════════════════════════════════════
// Sprint 23.5 — Beta 15 días
// ════════════════════════════════════════════════════════════════════

export const BETA_STATUSES = ["none", "active", "expired", "paying"] as const;
export type BetaStatus = (typeof BETA_STATUSES)[number];

export const BETA_STATUS_LABELS: Record<BetaStatus, string> = {
  none: "Sin beta",
  active: "Beta activa",
  expired: "Beta expirada",
  paying: "Suscrito",
};

// ── beta_requests ──────────────────────────────────────────
export const BETA_REQUEST_STATUSES = [
  "new",
  "approved",
  "rejected",
  "waitlist",
] as const;
export type BetaRequestStatus = (typeof BETA_REQUEST_STATUSES)[number];

export const BETA_REQUEST_STATUS_LABELS: Record<BetaRequestStatus, string> = {
  new: "Nuevo",
  approved: "Aprobado",
  rejected: "Rechazado",
  waitlist: "En espera",
};

export interface BetaRequest {
  id: string;
  artist_name: string;
  email: string;
  instagram: string;
  city: string;
  genres: string[];
  motivation: string;
  status: BetaRequestStatus;
  invite_token: string | null;
  invite_sent_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  reject_reason: string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
  updated_at: string;
}

export type BetaRequestInsert = {
  artist_name: string;
  email: string;
  instagram?: string;
  city?: string;
  genres?: string[];
  motivation?: string;
  ip_address?: string;
  user_agent?: string;
};

// ── feedback_reports ──────────────────────────────────────
export const FEEDBACK_KINDS = ["bug", "idea", "copy", "otro"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Bug",
  idea: "Idea",
  copy: "Copy",
  otro: "Otro",
};

export const FEEDBACK_STATUSES = [
  "new",
  "read",
  "in_progress",
  "resolved",
  "dismissed",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "Nuevo",
  read: "Leído",
  in_progress: "En curso",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

export interface FeedbackReport {
  id: string;
  user_id: string;
  kind: FeedbackKind;
  description: string;
  page_url: string;
  user_agent: string;
  screenshot_url: string;
  status: FeedbackStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * Variante enriquecida con info del DJ que reportó (artist_name + email).
 * Se construye en backend uniendo `feedback_reports` ⨝ `dj_profile` ⨝
 * `auth.users`. Útil para el admin: mostrar "Belixza (mrbelixza@gmail.com)"
 * en lugar de un UUID anónimo, y para el envío automático de email al
 * marcar el reporte como resuelto.
 */
export interface FeedbackReportWithUser extends FeedbackReport {
  artist_name: string | null;
  email: string | null;
}

export type FeedbackReportInsert = {
  kind: FeedbackKind;
  description: string;
  page_url?: string;
  user_agent?: string;
  screenshot_url?: string;
};

// ── nps_responses ─────────────────────────────────────────
export const NPS_MILESTONES = ["day_7", "day_15"] as const;
export type NpsMilestone = (typeof NPS_MILESTONES)[number];

export interface NpsResponse {
  id: string;
  user_id: string;
  milestone: NpsMilestone;
  score: number;
  comment: string;
  created_at: string;
}

export type NpsResponseInsert = {
  milestone: NpsMilestone;
  score: number;
  comment?: string;
};

// ── usage_events ──────────────────────────────────────────
export interface UsageEvent {
  id: string;
  user_id: string;
  event: string;
  page: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type UsageEventInsert = {
  event: string;
  page?: string;
  metadata?: Record<string, unknown>;
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

// ════════════════════════════════════════════════════════════════════
// Sprint S19 — Subscriptions (MercadoPago)
// ════════════════════════════════════════════════════════════════════

export const SUBSCRIPTION_STATUSES = [
  "trial",
  "pending",
  "active",
  "past_due",
  "cancelled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_MODES = ["auto", "manual"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  payment_mode: PaymentMode;

  // Trial
  trial_started_at: string | null;
  trial_ends_at: string | null;

  // MP
  mp_preapproval_id: string | null;
  mp_payer_id: string | null;
  card_last_4: string | null;
  card_brand: string | null;

  // Período actual
  current_period_start: string | null;
  current_period_end: string | null;

  // Cancelación
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;

  // Metadata
  amount_clp: number;
  created_at: string;
  updated_at: string;
}

export const SUBSCRIPTION_PAYMENT_STATUSES = [
  "approved",
  "rejected",
  "pending",
  "refunded",
  "cancelled",
] as const;
export type SubscriptionPaymentStatus =
  (typeof SUBSCRIPTION_PAYMENT_STATUSES)[number];

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  user_id: string;
  mp_payment_id: string | null;
  amount_clp: number;
  status: SubscriptionPaymentStatus;
  payment_method: string | null;
  period_start: string | null;
  period_end: string | null;
  raw_metadata: Record<string, unknown>;
  created_at: string;
}
