# JAY Manager OS · DROP.

App de gestión de carrera DJ. Repo interno `JAY_Manager_OS` · marca pública **DROP.** (the DJ OS). Empezó como proyecto personal de **JAY PORTU** y está diseñada desde el inicio para escalar a múltiples usuarios DJ.

## Visión

- **Fase 1 (actual)**: beta cerrada por invitación. Acceso vía `/beta` →
  aprobación → email con invite token → `/login?invite=...`. 15 días de
  acceso completo, lockout post-período. Multi-usuario por arquitectura
  (RLS).
- **Fase 2 (post-MVP)**: SaaS para DJs con **membresías de pago**. Modelo
  freemium o por planes. La arquitectura ya contempla esto desde el día 1.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage) — Free
- Vercel Hobby (hosting)
- Ollama local (IA, opcional)
- Resend (emails transaccionales, con anti-spam compliance)

## Estética · DROP. brand

Paleta brutalist Type Beat (ver `drop_brandbook.html` / `drop_brandbook.pdf`):

- Cream `#F4EFE7` (fondo) · Ink `#0A0A0A` (texto) · Orange `#FF5C00` (accent)
- Success `#1F8A5C` · Warning `#C77A00` · Info `#2B5BA8` · Danger `#C53030`
- Tipografías: **Anton** (display) + **Inter** (body) + **Space Mono** (mono/tags)

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
│   ├── beta/            ← formulario de solicitud de invite (público)
│   ├── login/           ← login solo por invite token (beta cerrada)
│   ├── welcome/         ← onboarding wizard post-login
│   ├── dj/              ← directorio público de DJs (sin auth)
│   ├── p/[slug]/        ← press kits públicos (sin auth)
│   └── api/             ← track, booking, export, push, cron, unsubscribe
├── components/          ← layout + ui (shadcn) + brand
├── lib/
│   ├── ai/              ← Ollama client + prompts
│   ├── email/           ← Resend + templates anti-spam
│   ├── queries/         ← server queries por tabla
│   ├── supabase/        ← client + server + middleware + admin
│   └── templates/       ← sistema de variables
└── middleware.ts        ← auth gate global
```

## Multi-usuario y aislamiento

- Cada tabla tiene **RLS habilitado**: un usuario solo lee/escribe SUS filas
- Validado por `auth.uid() = user_id` en las policies de Postgres
- **Signup cerrado**: solo se entra con invite token desde `/beta`
- Para uso público (press kits, directorio, formularios de booking, tracking)
  usamos `service_role` desde server-side routes con validación de identidad

## Roadmap

El roadmap vivo está en **`NEXT_SESSION.md`**. Ese archivo es la source
of truth — lo que está acá en README es solo arquitectura.

Estado general (mayo 2026): Sprints 0-23.5 cerrados y deployados.

## Roadmap post-MVP (SaaS para DJs, monetización)

Una vez que el producto demuestre valor con los beta testers actuales,
evolucionamos hacia SaaS. **Nada de esto se implementa ahora**, queda
registrado para no olvidarlo:

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
   - Selector de tema/branding por workspace
   - Subir logo propio (Supabase Storage)
   - Slug del press kit es per-workspace, no per-user
4. **Branding configurable**
   - Reemplazar `<Logo />` por componente que lea `workspace.logo_url`
   - Paleta también configurable (al menos accent color)
5. **Permisos granulares**
   - Roles: owner, editor, viewer
   - Owner ve billing, others no
6. **Marketing y SEO**
   - Landing page con value proposition (decisión actual: split DJ/Booker)
   - Pricing page
   - Blog/recursos para SEO orgánico

### Por qué la arquitectura actual ya está lista
- ✅ RLS en todas las tablas (cada user su data)
- ✅ Auth con Supabase (escala a miles de usuarios free)
- ✅ Press kits con slugs únicos
- ✅ Directorio público `/dj` con filtros (Sprint 20)
- ✅ Sistema de IA híbrida (Ollama local + opción de sumar OpenAI API)
- ✅ Sitemap dinámico + robots.txt para SEO
- ✅ Emails con anti-spam compliance (List-Unsubscribe headers)
