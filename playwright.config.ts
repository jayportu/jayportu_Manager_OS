import { defineConfig, devices } from "playwright/test";

/**
 * E2E de flujos públicos y protección de rutas. NO usa credenciales ni
 * escribe datos: navegación + asserts de headers/redirects/validación.
 *
 * Corre contra el dev server local (puerto 3010). Si ya hay uno corriendo,
 * lo reutiliza; si no, lo levanta.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3010",
    locale: "es-CL",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Pixel 7 (no iPhone): la emulación corre en Chromium, que es el único
    // browser instalado; WebKit no está bajado en esta máquina.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    port: 3010,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
