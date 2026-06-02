/**
 * Versión vigente de los documentos legales (Términos + Privacidad).
 *
 * Fuente única de verdad: la usan el signup (login-form), el onboarding
 * (/welcome) para registrar qué versión aceptó el user, y las páginas
 * /terms y /privacy para mostrar la fecha de "última actualización".
 *
 * Al cambiar materialmente los Términos: bumpear TOS_VERSION + el label.
 * Eso permite, a futuro, detectar usuarios con una versión vieja
 * (tos_version < TOS_VERSION) y pedirles re-aceptación.
 */
export const TOS_VERSION = "2026-06-02";
export const TOS_VERSION_LABEL = "2 de junio de 2026";
