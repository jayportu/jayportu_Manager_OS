/**
 * E2E públicos — sin credenciales, sin escrituras.
 *
 * Los flujos AUTENTICADOS (DJ/booker/admin, permisos entre cuentas) están
 * especificados pero saltados: Supabase Auth exige CAPTCHA y la site key de
 * Turnstile no permite localhost (ver docs/drop-audit/02-role-flows.md §
 * "Restricción de entorno"). Al whitelistear localhost, quitar los .skip.
 */
import { test, expect } from "playwright/test";

const PUBLIC_PAGES = ["/", "/dj", "/eventos", "/login", "/beta", "/terms", "/privacy"];

// ── Páginas públicas ──────────────────────────────────────────────
for (const path of PUBLIC_PAGES) {
  test(`pública ${path} responde 200 y renderiza`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  });
}

test("página pública no tiene overflow horizontal", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "solo aplica a mobile");
  for (const path of ["/", "/dj", "/eventos"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    expect(overflow, `overflow en ${path}`).toBe(false);
  }
});

// ── Protección de rutas: sin sesión → login ───────────────────────
const PROTECTED = ["/dashboard", "/crm", "/perfil", "/admin", "/admin/beta-requests", "/booker/requests", "/configuracion"];

for (const path of PROTECTED) {
  test(`protegida ${path} redirige a /login sin sesión`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  });
}

// ── Headers de seguridad ──────────────────────────────────────────
test("headers de seguridad presentes", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

// ── APIs: crons y endpoints protegidos rechazan sin credenciales ──
test("cron sin CRON_SECRET es rechazado", async ({ request }) => {
  for (const path of ["/api/beta/expire-cron", "/api/push/send-cron"]) {
    const res = await request.get(path, { failOnStatusCode: false });
    expect([401, 403, 500]).toContain(res.status());
  }
});

test("/api/export sin sesión no entrega datos", async ({ request }) => {
  const res = await request.get("/api/export", { failOnStatusCode: false });
  // middleware redirige a /login (200 de la página) o el handler devuelve 401:
  // en ningún caso JSON con datos.
  const type = res.headers()["content-type"] || "";
  if (type.includes("application/json")) {
    expect([401, 403]).toContain(res.status());
  } else {
    expect(res.url()).toContain("/login");
  }
});

test("/api/booking rechaza payload sin campos obligatorios", async ({ request }) => {
  const res = await request.post("/api/booking", {
    data: { user_id: "00000000-0000-0000-0000-000000000000" },
    failOnStatusCode: false,
  });
  expect([400, 404, 422]).toContain(res.status());
});

test("/api/track rechaza evento desconocido", async ({ request }) => {
  const res = await request.post("/api/track", {
    data: { user_id: "00000000-0000-0000-0000-000000000000", event: "hack_event" },
    failOnStatusCode: false,
  });
  expect([400, 404, 422]).toContain(res.status());
});

// ── Formularios públicos: validación client-side ─────────────────
test("form /beta no envía vacío", async ({ page }) => {
  let posted = false;
  page.on("request", (r) => {
    if (r.url().includes("/api/beta") && r.method() === "POST") posted = true;
  });
  await page.goto("/beta");
  const submit = page.locator("form button[type=submit]").first();
  if ((await submit.count()) > 0) {
    await submit.click();
    await page.waitForTimeout(800);
  }
  expect(posted).toBe(false);
});

// ── Anti-enumeración en recuperación de contraseña ────────────────
test("forgot-password muestra el mismo mensaje exista o no la cuenta", async ({ page }) => {
  await page.goto("/auth/forgot-password");
  await page.fill('input[type="email"]', "no-existe-xyz@example.com");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  // El mensaje es condicional ("Si existe una cuenta...") — no confirma existencia.
  expect(text).toMatch(/si existe|te enviamos|revisa tu/i);
  expect(text).not.toMatch(/no existe ninguna cuenta|usuario no encontrado/i);
});

// ── Flujos autenticados: especificados, pendientes de CAPTCHA ─────
test.describe("autenticado (SKIP hasta whitelistear localhost en Turnstile)", () => {
  test.skip(true, "Supabase Auth CAPTCHA bloquea login local — ver 02-role-flows.md");

  test("DJ demo entra y ve su dashboard", async () => {
    // login con trial-test@dropdj.local → /dashboard visible
  });
  test("DJ no puede ver /admin", async () => {
    // login DJ demo → goto /admin → redirect fuera
  });
  test("DJ no ve datos de otro usuario (IDOR)", async () => {
    // login DJ demo → fetch /crm con id ajeno → 404/vacío
  });
});
