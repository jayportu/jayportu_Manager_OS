/**
 * Traducción de errores de Supabase Auth a mensajes en chileno (tuteo).
 *
 * Fuente única: la usan el login (/login), la solicitud de reset
 * (/auth/forgot-password), el fijado de nueva contraseña
 * (/auth/reset-password) y el cambio de contraseña en Configuración.
 *
 * Si no matchea ningún caso conocido, devuelve el mensaje original con
 * un sufijo de contexto para que el user sepa a quién escribir.
 */
export function translateSupabaseError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("rate limit") || m.includes("too many requests")) {
    return "Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo, o avísale al admin.";
  }
  // updateUser rechaza una clave igual a la anterior.
  if (m.includes("different from the old password") || m.includes("same password")) {
    return "La contraseña nueva tiene que ser distinta a la actual.";
  }
  if (m.includes("at least 6") || m.includes("password should")) {
    return "La contraseña debe tener mínimo 6 caracteres.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return "Email o contraseña incorrectos. Si ya tienes cuenta, recupera tu contraseña abajo.";
  }
  if (m.includes("email not confirmed")) {
    return "Aún no confirmas tu email. Revisa tu bandeja de entrada (también spam).";
  }
  if (m.includes("user already registered") || m.includes("already registered")) {
    return "Este email ya tiene cuenta. Usa 'Iniciar sesión' arriba.";
  }
  if (m.includes("invalid email") || m.includes("email address")) {
    return "El email no tiene formato válido.";
  }
  // Sesión de recovery expirada o ausente al intentar fijar la nueva clave.
  if (m.includes("session") && (m.includes("missing") || m.includes("expired"))) {
    return "El link para restablecer tu contraseña expiró o ya se usó. Pide uno nuevo.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Problema de conexión. Revisa tu internet e intenta de nuevo.";
  }
  // Supabase con CAPTCHA activo: token ausente, inválido o expirado
  // (p.ej. "captcha protection: request disallowed (no captcha_token found)").
  if (m.includes("captcha")) {
    return "No pudimos completar la verificación anti-bot. Recarga la página e intenta de nuevo.";
  }
  // Fallback: devolvemos el mensaje pero con contexto
  return `${message}. Si persiste, escríbele al admin.`;
}
