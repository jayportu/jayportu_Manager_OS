/**
 * Slug para URLs de facetas SEO (género/ciudad). Quita acentos, baja a
 * minúsculas y reemplaza lo no alfanumérico por guiones.
 *   "Tech House" -> "tech-house" · "Viña del Mar" -> "vina-del-mar"
 */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas diacríticas combinantes (acentos)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Primera letra de cada palabra en mayúscula. "tech house" -> "Tech House". */
export function titleCase(s: string): string {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
