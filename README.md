# JAY Manager OS

App personal de gestión de carrera DJ — **JAY PORTU**.

> Proyecto personal. Sin dependencias pagadas. Stack costo $0.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (paleta Studio Dark)
- Supabase Free (Postgres + Auth + Storage)
- Vercel Hobby (hosting)
- Ollama local (IA, en sprints siguientes)

## Estética

- Fondo `#0F0F11`, paneles `#18181B`, bordes `#27272A`
- Texto `#FAFAFA` / `#A1A1AA`
- Acento amarillo `#E8B923` (del press kit) sólo en CTAs, badges y números clave
- Tipografías: Iceland (display) + Inter (body)

## Setup local

1. `npm install`
2. Crea `.env.local` siguiendo `.env.example`
3. `npm run dev` → http://localhost:3000

## Estructura

```
src/
├── app/
│   ├── (app)/           ← rutas protegidas por auth
│   │   ├── layout.tsx   ← sidebar + topbar
│   │   └── dashboard/
│   ├── auth/callback/   ← OAuth/email confirm callback
│   ├── login/           ← login + signup
│   └── layout.tsx       ← root layout, fonts
├── components/
│   ├── layout/          ← Sidebar, Topbar, BottomNav
│   └── ui/              ← shadcn primitives
├── lib/
│   ├── supabase/        ← client.ts, server.ts, middleware.ts
│   └── utils.ts
└── middleware.ts        ← gate de auth global
```

## Roadmap

- ✅ Sprint 0 — Setup base + auth + deploy
- ⏳ Sprint 1 — Dashboard real con data Supabase
- ⏳ Sprint 2 — CRM + pipeline
- ⏳ Sprint 3 — Press kit público + GA4
- ⏳ Sprint 4 — IA local (Ollama)
- ⏳ Sprint 5 — Plantillas + registro de interacciones
- ⏳ Sprint 6 — Gmail API
- ⏳ Sprint 7 — Calendar API
- ⏳ Sprint 8 — Descubrir oportunidades
- ⏳ Sprint 9 — Campañas
- ⏳ Sprint 10 — Crecimiento
- ⏳ Sprint 11 — PWA + push
- ⏳ Sprint 12 — Pulido
