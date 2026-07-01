# Capturas del producto para la landing (#3 · "Míralo por dentro")

Las usa `src/components/public/landing/product-showcase.tsx`. Son capturas
REALES de la cuenta demo ficticia **NOVA RÍOS** (data limpia, oculta del
directorio) — nunca de una cuenta real, porque la landing es pública.

## Archivos esperados (1600×1000 aprox, 16:10, .png)
- `dashboard.png` — home logueado (`/dashboard`)
- `crm.png` — CRM de contactos (`/contactos` o `/crm`)
- `calendario.png` — calendario con ingresos (`/calendario`)
- `presskit.png` — press kit público (`/p/nova-rios-demo`)
- `inbox.png` — inbox de bookings (`/press-kit/bookings`)
- `perfil.png` — perfil editable (`/perfil`)
- `metricas.png` — métricas del press kit (`/press-kit/stats`)

## Cómo se generan
1. Sembrar la demo (escribe en prod, correr desde el repo):
   `node scripts/seed_demo_account.mjs`
   → crea NOVA RÍOS (login trial-test@dropdj.local / DropTrial2026!, press kit /p/nova-rios-demo).
2. Loguearse como la demo (o magic-link de admin para saltar el CAPTCHA) y
   capturar cada pantalla a 16:10.
3. Guardar los .png acá con los nombres de arriba.

Ojo: la demo NO trae avatar/hero image por defecto → conviene subirle una foto
antes de capturar el press kit/perfil, o quedan con placeholder.
