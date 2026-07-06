import "server-only";

/**
 * Barrel de plantillas de email. El código real vive en ./templates/*.
 * Refactor T-3 (2026-07): split de un archivo de 2597 líneas en módulos
 * temáticos. La API pública (nombres importados por actions/crons/queries)
 * es IDÉNTICA — verificado con net de regresión (hashes byte a byte).
 */

export { wrapEmail, ctaButton, safeUrl, escapeHtml } from "./templates/_shared";
export * from "./templates/beta";
export * from "./templates/booking";
export * from "./templates/booker";
export * from "./templates/admin";
export * from "./templates/lifecycle";
