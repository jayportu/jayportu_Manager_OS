/**
 * Sprint 23.5 — Helper cliente para trackear eventos in-app.
 *
 * Fire-and-forget POST a /api/usage. No bloquea el render ni espera
 * respuesta. Si falla, no rompe nada.
 */

export function trackEvent(
  event: string,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event,
      page: window.location.pathname,
      metadata: metadata || {},
    });
    // Usar sendBeacon si está disponible (no afecta la performance del page unload)
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/usage", blob);
      return;
    }
    void fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // ignorar — tracking nunca falla la UX
  }
}
