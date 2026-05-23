/**
 * Service Worker para JAY Manager OS.
 *
 * Responsabilidad ÚNICA: Web Push notifications.
 *
 * No cachea recursos (no es offline-first). Next.js maneja la cache
 * de assets por su cuenta — la PWA es instalable pero requiere
 * conexión para usar la app.
 */

self.addEventListener("install", () => {
  // Activar el nuevo SW inmediatamente sin esperar a que se cierren las pestañas
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Tomar control de todas las pestañas abiertas de la app
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Manager OS", body: "Tienes una notificación nueva", url: "/dashboard" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "manager-os-default",
    data: { url: payload.url || "/dashboard" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Si hay una pestaña abierta de la app, enfocarla y navegar
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if ("navigate" in client) return client.navigate(url);
            return;
          }
        }
        // Si no hay ninguna pestaña abierta, abrir una nueva
        return self.clients.openWindow(url);
      })
  );
});
