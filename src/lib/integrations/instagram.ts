/**
 * Instagram Business Discovery (Meta Graph API) — lectura de stats
 * públicas de una cuenta Business/Creator.
 *
 * NO usa OAuth del usuario final. Usamos la cuenta IG Business de DROP
 * (linkeada a una FB Page) + un token de app de larga duración para
 * consultar el endpoint `business_discovery`, que devuelve stats públicas
 * de CUALQUIER cuenta profesional pública (followers_count, media_count).
 *
 * ⚠️ Limitaciones de Business Discovery:
 *   - Solo funciona contra cuentas Instagram Business o Creator PÚBLICAS.
 *     Cuentas personales o privadas → no devuelve nada (InstagramNotEligibleError).
 *   - Requiere APP REVIEW de Meta (instagram_basic + pages_read_engagement)
 *     + verificación de negocio. Sin review, solo anda en modo dev con
 *     cuentas de rol asignado.
 *
 * Requiere META_GRAPH_TOKEN + IG_BUSINESS_ACCOUNT_ID en env.
 */

const GRAPH_VERSION = "v21.0";

export interface InstagramProfile {
  username: string;
  followers_count: number;
  media_count: number;
  external_id: string | null;
  name?: string;
  profile_picture_url?: string | null;
}

/**
 * Se lanza cuando el target NO es apto para Business Discovery: cuenta
 * personal/privada, cuenta que no existe, o cuenta que no es Business/
 * Creator pública. Es el modo de falla ESPERADO (no un error de config).
 */
export class InstagramNotEligibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramNotEligibleError";
  }
}

interface MetaBusinessDiscovery {
  followers_count?: number;
  media_count?: number;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  id?: string;
}

interface MetaGraphResponse {
  business_discovery?: MetaBusinessDiscovery;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/** ¿Están las 2 vars de Meta configuradas? */
export function isMetaConfigured(): boolean {
  return (
    !!process.env.META_GRAPH_TOKEN && !!process.env.IG_BUSINESS_ACCOUNT_ID
  );
}

/**
 * Normaliza distintos inputs al handle pelado (sin @, sin URL):
 *   "@jay_portu"                          → "jay_portu"
 *   "jay_portu"                           → "jay_portu"
 *   "https://instagram.com/jay_portu/"    → "jay_portu"
 *   "instagram.com/jay_portu?hl=es"       → "jay_portu"
 */
export function normalizeInstagramHandle(input: string): string {
  let s = input.trim();

  // Si viene como URL, quedarse con el primer segmento después de instagram.com/
  const urlMatch = s.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) {
    s = urlMatch[1];
  }

  // Quitar @ inicial, query/hash y slash sobrante
  s = s.replace(/^@+/, "");
  s = s.split(/[?#]/)[0];
  s = s.replace(/\/+$/, "");

  return s.trim();
}

// Substrings (en minúscula) que indican un target NO elegible.
const NOT_ELIGIBLE_SUBSTRINGS = [
  "does not exist",
  "not a business",
  "not a business account",
  "not eligible",
  "cannot be loaded",
  "not accessible",
  "media posted by",
  "does not support this operation",
];

// Códigos que indican un problema de CONFIG/INFRA (token, rate limit,
// permisos) — NO del target → error genérico.
const GENERIC_ERROR_CODES = new Set<number>([
  190, // token inválido/expirado
  102, // sesión inválida / usuario no logueado
  4, // application request limit reached (rate limit)
  17, // user request limit reached (rate limit)
  32, // page request limit reached (rate limit)
  613, // rate limit custom
  10, // permission denied
  200, // permission error
  803, // objeto no visible por permisos
]);

/**
 * Fetch + parse de las stats de una cuenta IG Business/Creator pública vía
 * Business Discovery.
 *
 * Lanza:
 *   - Error genérico si faltan credenciales o si Meta devuelve un problema
 *     de config/infra (token malo, rate limit, permisos).
 *   - InstagramNotEligibleError si el target no existe / es privado / no es
 *     una cuenta profesional pública (modo de falla esperado).
 */
export async function fetchInstagramBusinessProfile(
  handle: string
): Promise<InstagramProfile> {
  if (!isMetaConfigured()) {
    throw new Error(
      "Instagram no está configurado. Requiere una app de Meta con cuenta IG Business linkeada a una FB Page, y las env vars META_GRAPH_TOKEN + IG_BUSINESS_ACCOUNT_ID."
    );
  }

  const normalized = normalizeInstagramHandle(handle);
  if (!normalized) {
    throw new InstagramNotEligibleError(
      `Handle de Instagram inválido: "${handle}".`
    );
  }

  const token = process.env.META_GRAPH_TOKEN as string;
  const igBusinessId = process.env.IG_BUSINESS_ACCOUNT_ID as string;

  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igBusinessId}`
  );
  url.searchParams.set(
    "fields",
    `business_discovery.username(${normalized}){followers_count,media_count,username,name,profile_picture_url,id}`
  );
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  let body: MetaGraphResponse = {};
  try {
    body = (await res.json()) as MetaGraphResponse;
  } catch {
    // respuesta no-JSON
  }

  if (!res.ok || body.error) {
    const err = body.error;
    const code = err?.code;
    const msg = (err?.message || "").toLowerCase();

    // 1. Substrings + códigos que apuntan a un target no elegible (prioridad).
    const looksNotEligible =
      NOT_ELIGIBLE_SUBSTRINGS.some((sub) => msg.includes(sub)) ||
      code === 110 || // invalid user id (no existe / no es business)
      code === 100; // (#100) does not exist / cannot be loaded / no soporta la op

    if (looksNotEligible) {
      throw new InstagramNotEligibleError(
        `@${normalized} no es una cuenta de Instagram Business/Creator pública (o no existe). Business Discovery solo funciona con cuentas profesionales públicas.`
      );
    }

    // 2. Problemas conocidos de config/infra → error genérico.
    if (code && GENERIC_ERROR_CODES.has(code)) {
      throw new Error(
        `Meta Graph API error (código ${code}): ${
          err?.message || `HTTP ${res.status}`
        }`
      );
    }

    // 3. Default amplio: el modo de falla principal de Business Discovery ES
    //    un target no elegible, así que ante la duda tratamos así.
    throw new InstagramNotEligibleError(
      `No pudimos leer @${normalized} en Instagram. Probablemente no sea una cuenta Business/Creator pública.${
        err?.message ? ` (${err.message})` : ""
      }`
    );
  }

  const bd = body.business_discovery;
  if (!bd) {
    throw new InstagramNotEligibleError(
      `No pudimos leer @${normalized} en Instagram. Verifica que sea una cuenta Business/Creator pública.`
    );
  }

  return {
    username: bd.username || normalized,
    followers_count: bd.followers_count ?? 0,
    media_count: bd.media_count ?? 0,
    external_id: bd.id ?? null,
    name: bd.name,
    profile_picture_url: bd.profile_picture_url ?? null,
  };
}
