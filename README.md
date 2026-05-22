# JAY Manager OS

App de gestión de carrera DJ. Empezó como proyecto personal de **JAY PORTU**
y está diseñada desde el inicio para escalar a múltiples usuarios DJ.

## Visión

- **Fase 1 (actual)**: MVP personal de JAY PORTU para gestionar su carrera con
  costo $0. Multi-usuario por arquitectura (RLS), permite agregar usuarios de
  prueba (ej. Fernanda).
- **Fase 2 (post-MVP, cuando el producto esté maduro)**: SaaS para DJs con
  **membresías de pago**. Modelo freemium o por planes. La arquitectura ya
  contempla esto desde el día 1.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (paleta Studio Dark)
- Supabase Free (Postgres + Auth + Storage)
- Vercel Hobby (hosting)
- Ollama local (IA, opcional)

## Estética

- Fondo `#0F0F11`, paneles `#18181B`, bordes `#27272A`
- Texto `#FAFAFA` / `#A1A1AA`
- Acento amarillo `#E8B923` (del press kit JAY PORTU) sólo en CTAs, badges
  y números clave
- Tipografías: Iceland (display) + Inter (body)

> Nota: la paleta y logo actual son de la marca JAY PORTU. Cuando se
> convierta en SaaS multi-DJ, el branding por defecto cambiará a algo neutro
> y cada DJ tendrá su propio branding en su workspace.

## Setup local

1. `npm install`
2. Crea `.env.local` siguiendo `.env.example`
3. `npm run dev` → http://localhost:3010

> Puerto **3010** (no 3000) para evitar conflicto con POSreach en la Mac de Jaime.

## Estructura

```
src/
├── app/
│   ├── (app)/           ← rutas protegidas por auth (por user_id)
│   ├── auth/callback/   ← OAuth/email confirm callback
│   ├── login/           ← login + signup (cualquier DJ se registra)
│   ├── p/[slug]/        ← press kits públicos (sin auth)
│   └── api/             ← track, booking, export
├── components/          ← layout + ui (shadcn) + brand
├── lib/
│   ├── ai/              ← Ollama client + prompts
│   ├── queries/         ← server queries por tabla
│   ├── supabase/        ← client + server + middleware + admin
│   └── templates/       ← sistema de variables
└── middleware.ts        ← auth gate global
```

## Multi-usuario y aislamiento

- Cada tabla tiene **RLS habilitado**: un usuario solo lee/escribe SUS filas
- Validado por `auth.uid() = user_id` en las policies de Postgres
- Signup abierto en `/login` — cualquiera con email puede crear cuenta
- Para uso público (press kits, formularios de booking, tracking) usamos
  `service_role` desde server-side routes con validación de identidad

## Roadmap actual (MVP, costo $0)

- ✅ Sprint 0 — Setup base + auth + deploy
- ✅ Sprint 1 — Perfil DJ + Export JSON
- ✅ Sprint 2 — CRM (contacts + interactions + follow-ups)
- ✅ Sprint 3 — Press kit público + tracking + bookings
- ✅ Sprint 4 — IA local (Ollama) + ChatGPT Strategy Mode
- ✅ Sprint 5 — Plantillas con variables
- ⏳ Sprint 6 — Gmail API
- ⏳ Sprint 7 — Calendar API
- ⏳ Sprint 8 — Descubrir oportunidades (Overpass + CSV + manual)
- ⏳ Sprint 9 — Campañas
- ⏳ Sprint 10 — Crecimiento (registro manual de métricas + recomendaciones)
- ⏳ Sprint 11 — PWA + push notifications
- ⏳ Sprint 12 — Pulido + onboarding mejorado

## Roadmap post-MVP (SaaS para DJs, monetización)

Una vez que el producto demuestre valor para JAY (y para Fernanda como
beta tester), evolucionamos hacia SaaS. **Nada de esto se implementa
ahora**, queda registrado para no olvidarlo:

### Modelo de monetización
- Free tier: hasta X contactos, sin IA local, press kit con marca
- Plan Pro mensual: ilimitado, integración Gmail/Calendar, Ollama, sin marca
- Plan Team: workspaces compartidos para manager + DJ

### Cambios técnicos necesarios
1. **Workspaces / Teams**
   - Tabla `workspaces` (1 DJ o agencia)
   - Tabla `workspace_members` (user_id, workspace_id, role)
   - RLS cambia de `user_id = auth.uid()` a `workspace_id IN (mis workspaces)`
   - Migration que mueve toda la data actual de `user_id` a un workspace por user
2. **Plans + billing** (cuando podamos pagar Stripe)
   - Stripe Subscriptions + webhooks
   - Tabla `subscriptions` (workspace_id, plan, status, current_period_end)
   - Gates por plan en queries (limit de contacts, features bloqueadas)
3. **Onboarding multi-DJ**
   - Landing pública neutra `/` (no redirige a /dashboard)
   - Selector de tema/branding por workspace (no solo JAY PORTU)
   - Subir logo propio (Supabase Storage)
   - Slug del press kit es per-workspace, no per-user
4. **Branding configurable**
   - Reemplazar `<Logo />` que apunta a `/brand/logo-mark-light.png` por
     un componente que lea `workspace.logo_url`
   - Paleta también configurable (al menos accent color)
5. **Permisos granulares**
   - Roles: owner, editor, viewer
   - Owner ve billing, others no
6. **Marketing y SEO**
   - Landing page con value proposition
   - Pricing page
   - Blog/recursos para SEO orgánico (DJs buscando "cómo conseguir gigs")

### Por qué la arquitectura actual ya está lista
- ✅ RLS en todas las tablas (cada user su data)
- ✅ Auth con Supabase (escala a miles de usuarios free)
- ✅ Press kits con slugs únicos (1 user = 1 slug; en futuro 1 workspace = 1+ slugs)
- ✅ Sistema de IA híbrida (Ollama local = no cuesta nada por usuario;
  en plan pago podemos sumar OpenAI API si Jaime decide)

## Para Fernanda (beta tester actual)

Fernanda se registra normalmente en `/login` → "Crear cuenta". Va a tener
**su propia instancia** completamente separada de la de Jaime. Puede
cargar sus propios contactos, perfil, plantillas, etc.

Si Jaime y Fernanda quieren ver/editar la MISMA data (workspace
compartido), eso es Sprint 14+ (post-MVP) cuando movamos a workspaces.
