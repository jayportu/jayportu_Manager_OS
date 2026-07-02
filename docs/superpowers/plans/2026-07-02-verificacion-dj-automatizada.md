# Verificación automatizada de DJs con n8n — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verificar automáticamente a un DJ (badge `✓ Verificado` + chips `socials`/`sets`) en el momento en que su perfil cumple 4 chequeos de datos, sin revisión manual constante.

**Architecture:** Toda la lógica de negocio (los 4 chequeos + writeback) vive en DROP, en una función compartida `evaluateAndVerify(userId)`. Se expone por dos endpoints protegidos por secret: `POST /api/admin/dj-verify/evaluate` (event-driven, un DJ) y `GET /api/admin/dj-verify/sweep` (barrido inicial / red de seguridad). Un trigger de Postgres con guardia detecta cuando un DJ no verificado cambia una columna relevante (nunca `last_active_at`) y avisa a n8n vía `pg_net`; n8n llama a `/evaluate`. El `service_role` nunca sale a n8n.

**Tech Stack:** Next.js 15 App Router (route handlers), Supabase Postgres (`createAdminClient` service_role), `pg_net` para el HTTP saliente del trigger, n8n (webhook + HTTP Request nodes), Resend para el aviso opcional.

## Global Constraints

- **Sin framework de tests en el repo:** no hay vitest/jest ni `*.test.ts`. La verificación de cada tarea es `npm run build` + checks con `curl`/script `_*.mjs` + inspección de filas en la DB. NO instalar un framework de tests.
- **Verificar antes de pushear:** correr `npm run build` (no solo `tsc`); ESLint estricto de Vercel rompe builds que tsc no atrapa.
- **Migraciones:** correr con `node scripts/run_migration.mjs supabase/migrations/<archivo>.sql` (usa `DATABASE_URL` de `.env.local`). Correr la migración ANTES de mergear el código que la usa.
- **`verified_by = null` = verificado por bot** (distingue del manual que guarda `adminId`).
- **Merge de chips:** al setear `verifications`, hacer union con lo existente (preservar un `identity` manual).
- **Umbrales exactos:** `bio_short` ≥ 80 caracteres; `genres.length` ≥ 1.
- **Press kit vivo:** `press_kit_mode='pdf'` → `press_kit_pdf_url` no vacío; `press_kit_mode='generated'` → `public_slug` presente **y** `onboarding_completed_at` no null. (Único knob tuneable; en un solo lugar.)
- **Tuteo chileno** en copy, commits y mensajes de UI. NUNCA voseo.
- **NO tocar prod sin OK explícito de Jaime.** Todo se prueba local (`.env.local` + `DATABASE_URL`) primero.
- **Rama de trabajo:** `feat/verificacion-dj-auto` (ya creada, con el spec commiteado).

---

### Task 1: Lógica de evaluación compartida

**Files:**
- Create: `src/lib/queries/dj-verify.ts`

**Interfaces:**
- Consumes: `createAdminClient` de `@/lib/supabase/admin`; tipo `DjProfile` de `@/types/database`.
- Produces:
  - `type VerifyDecision = "verified" | "needs_review" | "not_eligible"`
  - `type VerifyCheckKey = "profile" | "presskit" | "socials" | "sets"`
  - `evaluateDjVerification(p): { score: number; checks: Record<VerifyCheckKey, boolean>; missing: VerifyCheckKey[] }` — función pura.
  - `MISSING_LABELS: Record<VerifyCheckKey, string>` — etiquetas en español para el aviso.
  - `evaluateAndVerify(userId: string): Promise<{ decision: VerifyDecision; score: number; missing: VerifyCheckKey[]; artist_name: string | null }>` — lee perfil, evalúa, y si 4/4 escribe.

- [ ] **Step 1: Crear la función pura + el writeback**

```typescript
// src/lib/queries/dj-verify.ts
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DjProfile } from "@/types/database";

export type VerifyDecision = "verified" | "needs_review" | "not_eligible";
export type VerifyCheckKey = "profile" | "presskit" | "socials" | "sets";

export const MISSING_LABELS: Record<VerifyCheckKey, string> = {
  profile: "Perfil completo (avatar, bio ≥ 80, ≥ 1 género)",
  presskit: "Press kit vivo",
  socials: "Instagram",
  sets: "Al menos un set (SoundCloud o mix destacado)",
};

/** Subconjunto de dj_profile que la evaluación necesita. */
type EvaluableProfile = Pick<
  DjProfile,
  | "avatar_url"
  | "bio_short"
  | "genres"
  | "press_kit_mode"
  | "press_kit_pdf_url"
  | "public_slug"
  | "onboarding_completed_at"
  | "instagram_url"
  | "soundcloud_url"
  | "featured_sets"
>;

/** Los 4 chequeos. Función pura → fácil de razonar y de verificar a mano. */
export function evaluateDjVerification(p: EvaluableProfile): {
  score: number;
  checks: Record<VerifyCheckKey, boolean>;
  missing: VerifyCheckKey[];
} {
  const profile =
    !!p.avatar_url?.trim() &&
    (p.bio_short?.trim().length ?? 0) >= 80 &&
    (p.genres?.length ?? 0) >= 1;

  const presskit =
    p.press_kit_mode === "pdf"
      ? !!p.press_kit_pdf_url?.trim()
      : !!p.public_slug?.trim() && !!p.onboarding_completed_at;

  const socials = !!p.instagram_url?.trim();

  const sets =
    !!p.soundcloud_url?.trim() || (p.featured_sets?.length ?? 0) >= 1;

  const checks = { profile, presskit, socials, sets };
  const missing = (Object.keys(checks) as VerifyCheckKey[]).filter(
    (k) => !checks[k]
  );
  const score = 4 - missing.length;
  return { score, checks, missing };
}

/**
 * Lee el perfil por service_role, evalúa y —si 4/4— verifica.
 * Idempotente: si ya está verificado (verified_at != null) no reevalúa.
 * verified_by = null marca la verificación automática (vs manual).
 */
export async function evaluateAndVerify(userId: string): Promise<{
  decision: VerifyDecision;
  score: number;
  missing: VerifyCheckKey[];
  artist_name: string | null;
}> {
  const admin = createAdminClient();
  const { data: prof, error } = await admin
    .from("dj_profile")
    .select(
      "artist_name, verified_at, verifications, avatar_url, bio_short, genres, press_kit_mode, press_kit_pdf_url, public_slug, onboarding_completed_at, instagram_url, soundcloud_url, featured_sets"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!prof) return { decision: "not_eligible", score: 0, missing: [], artist_name: null };

  const artist_name = (prof.artist_name as string) ?? null;

  // Ya verificado → no-op.
  if (prof.verified_at) {
    return { decision: "verified", score: 4, missing: [], artist_name };
  }

  const { score, missing } = evaluateDjVerification(prof as EvaluableProfile);

  if (score < 3) return { decision: "not_eligible", score, missing, artist_name };
  if (score === 3) return { decision: "needs_review", score, missing, artist_name };

  // score === 4 → verificar. Union con chips existentes (preserva 'identity').
  const current: string[] = (prof.verifications as string[] | null) ?? [];
  const nextVerifications = Array.from(new Set([...current, "socials", "sets"]));

  const { error: updErr } = await admin
    .from("dj_profile")
    .update({
      verifications: nextVerifications,
      verified_at: new Date().toISOString(),
      verified_by: null,
    })
    .eq("user_id", userId);

  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin");
  revalidatePath("/dj");
  revalidatePath("/p/[slug]", "page");
  revalidateTag("public-djs");

  return { decision: "verified", score: 4, missing: [], artist_name };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build OK, sin errores de tipos ni ESLint. (Si `featured_sets`/`public_slug`/`onboarding_completed_at` no existieran en `DjProfile`, fallaría acá — ya se confirmó que existen en `src/types/database.ts`.)

- [ ] **Step 3: Verificar la función pura con un check rápido**

Crear `scripts/_verify_eval.mjs` temporal NO — en vez de eso, verificación inline con node y un import dinámico no aplica (TS). Verificación manual: revisar a ojo la tabla de verdad contra los umbrales del spec. La verificación end-to-end real ocurre en Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries/dj-verify.ts
git commit -m "feat · verify: lógica compartida evaluateDjVerification + evaluateAndVerify

4 chequeos leídos de dj_profile; 4/4 setea chips socials/sets + verified_at
(verified_by=null = bot). Idempotente. Union preserva chip identity manual.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Endpoint `POST /evaluate` + PUBLIC_PATHS

**Files:**
- Create: `src/app/api/admin/dj-verify/evaluate/route.ts`
- Modify: `src/lib/supabase/middleware.ts` (agregar prefijo a `PUBLIC_PATHS`, alrededor de la línea 40)

**Interfaces:**
- Consumes: `evaluateAndVerify` de `@/lib/queries/dj-verify`; `cronAuthMatches` de `@/lib/cron-auth`.
- Produces: endpoint `POST /api/admin/dj-verify/evaluate` con body `{ user_id: string }`.

- [ ] **Step 1: Agregar el prefijo a PUBLIC_PATHS**

En `src/lib/supabase/middleware.ts`, dentro del array `PUBLIC_PATHS` (junto a los otros crons, ~línea 40), agregar:

```typescript
  "/api/admin/dj-verify", // verificación automática de DJs (protegido con DJ_VERIFY_SECRET en header)
```

Nota: `isPublic` usa `pathname.startsWith(p)`, así que este prefijo cubre `/evaluate` y `/sweep`.

- [ ] **Step 2: Crear el route handler**

```typescript
// src/app/api/admin/dj-verify/evaluate/route.ts
import { NextResponse } from "next/server";
import { cronAuthMatches } from "@/lib/cron-auth";
import { evaluateAndVerify } from "@/lib/queries/dj-verify";

/**
 * POST /api/admin/dj-verify/evaluate  { user_id }
 *
 * Camino event-driven: lo llama n8n cuando el trigger de dj_profile detecta un
 * cambio relevante. Reevalúa a ese DJ y —si 4/4— lo verifica.
 * Protegido con DJ_VERIFY_SECRET en header Authorization: Bearer <secret>.
 * Marcado público en middleware (PUBLIC_PATHS).
 */
export async function POST(req: Request) {
  const expected = process.env.DJ_VERIFY_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "DJ_VERIFY_SECRET no configurado" },
      { status: 500 }
    );
  }
  if (!cronAuthMatches(req, expected)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const userId = body.user_id?.trim();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Falta user_id" }, { status: 400 });
  }

  try {
    const res = await evaluateAndVerify(userId);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Setear el secret local y compilar**

Agregar a `.env.local` (NO commitear): `DJ_VERIFY_SECRET=<un valor random largo, ej. openssl rand -hex 32>`.

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Verificar auth y flujo con curl (dev server)**

Levantar dev: `npm run dev` (puerto 3010). En otra terminal:

```bash
# Sin secret → 401
curl -s -X POST http://localhost:3010/api/admin/dj-verify/evaluate \
  -H "Content-Type: application/json" -d '{"user_id":"x"}' -w "\n%{http_code}\n"
# Espera: 401

# Con secret + un user_id real de dj_profile → decision
curl -s -X POST http://localhost:3010/api/admin/dj-verify/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DJ_VERIFY_SECRET" \
  -d '{"user_id":"<UUID_DE_UN_DJ>"}' -w "\n%{http_code}\n"
# Espera: 200 con { ok:true, decision:"verified"|"needs_review"|"not_eligible", score, missing }
```

Elegir un `user_id` que sepas 3/4 vs 4/4 para confirmar la decisión. Verificar en la DB que un 4/4 quedó con `verified_at` seteado y `verified_by` NULL.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/dj-verify/evaluate/route.ts src/lib/supabase/middleware.ts
git commit -m "feat · verify: endpoint POST /api/admin/dj-verify/evaluate (event-driven)

Protegido con DJ_VERIFY_SECRET (safeEqual). Agrega el prefijo a PUBLIC_PATHS.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Endpoint `GET /sweep` (barrido inicial / red de seguridad)

**Files:**
- Create: `src/app/api/admin/dj-verify/sweep/route.ts`

**Interfaces:**
- Consumes: `evaluateAndVerify`, `MISSING_LABELS` de `@/lib/queries/dj-verify`; `cronAuthMatches`; `createAdminClient`.
- Produces: endpoint `GET /api/admin/dj-verify/sweep`.

- [ ] **Step 1: Crear el route handler**

```typescript
// src/app/api/admin/dj-verify/sweep/route.ts
import { NextResponse } from "next/server";
import { cronAuthMatches } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAndVerify, MISSING_LABELS } from "@/lib/queries/dj-verify";

/**
 * GET /api/admin/dj-verify/sweep
 *
 * Barrido: itera todos los DJs no verificados y corre evaluateAndVerify en cada
 * uno. Uso: barrido inicial (una vez) y red de seguridad (esporádico) por si el
 * trigger dejó pasar un caso. Idempotente. Protegido con DJ_VERIFY_SECRET.
 */
export async function GET(req: Request) {
  const expected = process.env.DJ_VERIFY_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "DJ_VERIFY_SECRET no configurado" },
      { status: 500 }
    );
  }
  if (!cronAuthMatches(req, expected)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("dj_profile")
    .select("user_id")
    .is("verified_at", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const verified: Array<{ user_id: string; artist_name: string | null }> = [];
  const needs_review: Array<{ user_id: string; artist_name: string | null; missing: string[] }> = [];
  let not_eligible_count = 0;

  for (const r of rows ?? []) {
    const userId = r.user_id as string;
    try {
      const res = await evaluateAndVerify(userId);
      if (res.decision === "verified") {
        verified.push({ user_id: userId, artist_name: res.artist_name });
      } else if (res.decision === "needs_review") {
        needs_review.push({
          user_id: userId,
          artist_name: res.artist_name,
          missing: res.missing.map((k) => MISSING_LABELS[k]),
        });
      } else {
        not_eligible_count++;
      }
    } catch {
      // un perfil que falla no debe cortar el barrido completo
      not_eligible_count++;
    }
  }

  return NextResponse.json({
    ok: true,
    verified,
    needs_review,
    not_eligible_count,
    total: rows?.length ?? 0,
  });
}
```

- [ ] **Step 2: Compilar**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Verificar con curl (dev server)**

```bash
curl -s http://localhost:3010/api/admin/dj-verify/sweep \
  -H "Authorization: Bearer $DJ_VERIFY_SECRET" | jq
# Espera: { ok:true, verified:[...], needs_review:[...], not_eligible_count:N, total:M }
```

Confirmar en la DB que los DJs listados en `verified` quedaron con `verified_at` no null. Correr el sweep dos veces seguidas → la 2ª no debe re-verificar (los ya verificados salen del set de candidatos).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/dj-verify/sweep/route.ts
git commit -m "feat · verify: endpoint GET /api/admin/dj-verify/sweep (barrido + red de seguridad)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Migración — trigger de DB con guardia → n8n

**Files:**
- Create: `supabase/migrations/0064_dj_verify_auto_trigger.sql`

**Interfaces:**
- Produces: extensión `pg_net`, tabla `private.integration_config`, función `public.notify_dj_verify_candidate()`, trigger `dj_verify_notify_trigger` en `dj_profile`.
- Consumes (runtime): la URL + secret del webhook de n8n (Task 6), seteados a mano en `private.integration_config` (NO en el .sql).

- [ ] **Step 1: Escribir la migración**

```sql
-- ════════════════════════════════════════════════════════════════════
-- Migration 0064 — trigger event-driven de verificación de DJs → n8n
-- ────────────────────────────────────────────────────────────────────
-- Cuando un DJ NO verificado cambia una columna relevante de su perfil,
-- avisa a n8n (POST async vía pg_net) para que llame a /api/admin/dj-verify/
-- evaluate y lo verifique si cumple 4/4.
--
-- Guardia CRÍTICA: dispara SOLO si verified_at IS NULL y cambió una columna
-- de contenido. NUNCA por last_active_at (heartbeat de presencia, ~cada 60s)
-- ni por los propios campos de verificación → sin tormenta ni loops.
--
-- La URL y el secret del webhook viven en private.integration_config
-- (seteados a mano, no en este archivo) para no commitear secretos.
--
-- Ejecutar en: node scripts/run_migration.mjs supabase/migrations/0064_dj_verify_auto_trigger.sql
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;

create schema if not exists private;

create table if not exists private.integration_config (
  key   text primary key,
  value text not null
);
-- Seed (correr a mano, NO en git):
--   insert into private.integration_config (key, value) values
--     ('n8n_dj_verify_url', 'https://<tu-n8n>/webhook/dj-verify'),
--     ('n8n_dj_verify_secret', '<secreto-inbound-n8n>')
--   on conflict (key) do update set value = excluded.value;

create or replace function public.notify_dj_verify_candidate()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  select value into webhook_url   from private.integration_config where key = 'n8n_dj_verify_url';
  select value into webhook_secret from private.integration_config where key = 'n8n_dj_verify_secret';

  -- Sin config → no-op (permite montar el trigger antes de tener n8n listo).
  if webhook_url is null then
    return new;
  end if;

  perform net.http_post(
    url     := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(webhook_secret, '')
    ),
    body    := jsonb_build_object('user_id', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists dj_verify_notify_trigger on public.dj_profile;

create trigger dj_verify_notify_trigger
  after update on public.dj_profile
  for each row
  when (
    old.verified_at is null
    and (
      new.avatar_url             is distinct from old.avatar_url
      or new.bio_short           is distinct from old.bio_short
      or new.genres              is distinct from old.genres
      or new.instagram_url       is distinct from old.instagram_url
      or new.soundcloud_url      is distinct from old.soundcloud_url
      or new.featured_sets       is distinct from old.featured_sets
      or new.press_kit_mode      is distinct from old.press_kit_mode
      or new.press_kit_pdf_url   is distinct from old.press_kit_pdf_url
      or new.public_slug         is distinct from old.public_slug
      or new.onboarding_completed_at is distinct from old.onboarding_completed_at
    )
  )
  execute function public.notify_dj_verify_candidate();

comment on function public.notify_dj_verify_candidate is
  'Migration 0064 — avisa a n8n (pg_net) cuando un DJ no verificado cambia una columna relevante de su perfil, para reevaluar la verificación automática. No dispara por last_active_at.';
```

- [ ] **Step 2: Correr la migración contra la DB local/dev**

Run: `node scripts/run_migration.mjs supabase/migrations/0064_dj_verify_auto_trigger.sql`
Expected: `COMMIT` OK, sin errores. (Si `pg_net` no está disponible en el proyecto Supabase, el `create extension` falla acá → resolver habilitando pg_net en el dashboard de Supabase antes de continuar.)

- [ ] **Step 3: Verificar que la guardia ignora el heartbeat**

Con `psql`/DATABASE_URL, sobre un DJ NO verificado, simular el heartbeat y confirmar que NO se encola un request en `net`:

```sql
-- baseline
select count(*) from net.http_request_queue;
-- heartbeat (no debe disparar)
update public.dj_profile set last_active_at = now() where verified_at is null limit 1;
select count(*) from net.http_request_queue;   -- mismo count → OK, no disparó
-- cambio relevante (debe intentar disparar; si no hay config, es no-op silencioso)
update public.dj_profile set bio_short = bio_short where verified_at is null limit 1; -- no cambia valor → no dispara
```

Nota: `is distinct from` no dispara si el valor no cambió realmente; para probar el disparo real usar un cambio efectivo de `bio_short` en un DJ de prueba (y luego revertirlo). Sin config en `integration_config`, la función es no-op → seguro de montar antes de tener n8n.

- [ ] **Step 4: Commit (solo el .sql; el seed de config va a mano)**

```bash
git add supabase/migrations/0064_dj_verify_auto_trigger.sql
git commit -m "feat · verify: migración 0064 trigger dj_profile → n8n (guardia anti-heartbeat)

pg_net + private.integration_config + notify_dj_verify_candidate(). Dispara solo
si verified_at IS NULL y cambió una columna de contenido; nunca por last_active_at.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Script de verificación end-to-end

**Files:**
- Create: `scripts/_verify_dj_verify.mjs`

**Interfaces:**
- Consumes: `DATABASE_URL` y `DJ_VERIFY_SECRET` de `.env.local`; el dev server corriendo en `:3010`.

- [ ] **Step 1: Escribir el script**

```javascript
// scripts/_verify_dj_verify.mjs
// Verificación end-to-end del flujo de verificación automática.
// Uso: npm run dev (en otra terminal) y luego: node scripts/_verify_dj_verify.mjs
import pg from "pg";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { DATABASE_URL, DJ_VERIFY_SECRET } = process.env;
const BASE = "http://localhost:3010";

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// 1) Un DJ no verificado cualquiera para inspección
const { rows } = await client.query(
  "select user_id, artist_name from public.dj_profile where verified_at is null limit 1"
);
if (!rows.length) {
  console.log("No hay DJs sin verificar para probar.");
  await client.end();
  process.exit(0);
}
const dj = rows[0];
console.log("DJ de prueba:", dj.artist_name, dj.user_id);

// 2) 401 sin secret
const r401 = await fetch(`${BASE}/api/admin/dj-verify/evaluate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user_id: dj.user_id }),
});
console.log("Sin secret →", r401.status, r401.status === 401 ? "OK" : "FALLA");

// 3) evaluate con secret
const rOk = await fetch(`${BASE}/api/admin/dj-verify/evaluate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DJ_VERIFY_SECRET}`,
  },
  body: JSON.stringify({ user_id: dj.user_id }),
});
console.log("Con secret →", rOk.status, await rOk.json());

// 4) sweep
const rSweep = await fetch(`${BASE}/api/admin/dj-verify/sweep`, {
  headers: { Authorization: `Bearer ${DJ_VERIFY_SECRET}` },
});
const sweep = await rSweep.json();
console.log(
  `Sweep → verified:${sweep.verified?.length} needs_review:${sweep.needs_review?.length} not_eligible:${sweep.not_eligible_count} total:${sweep.total}`
);

await client.end();
```

- [ ] **Step 2: Correr el script**

Run (con `npm run dev` en otra terminal): `node scripts/_verify_dj_verify.mjs`
Expected: "Sin secret → 401 OK"; la respuesta de `evaluate` con `decision`; el resumen del sweep. Ningún error.

- [ ] **Step 3: Commit**

```bash
git add scripts/_verify_dj_verify.mjs
git commit -m "chore · verify: script de verificación end-to-end del flujo de verificación

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Workflow de n8n (configuración documentada)

**Files:**
- Create: `docs/superpowers/n8n-dj-verify-workflow.md`

**Interfaces:**
- Consumes: endpoints `/evaluate` (público, Bearer `DJ_VERIFY_SECRET`) y `/sweep`; el secret inbound `n8n_dj_verify_secret`.
- Produces: un workflow n8n activo con un Webhook Trigger + HTTP Request (+ notificación opcional), y el registro de `n8n_dj_verify_url` / `n8n_dj_verify_secret` en `private.integration_config`.

- [ ] **Step 1: Documentar el workflow (nodos + setup)**

Escribir en `docs/superpowers/n8n-dj-verify-workflow.md`:

```markdown
# n8n — Verificación automática de DJs

## Secretos
- `DJ_VERIFY_SECRET`: compartido n8n ↔ DROP (n8n lo manda a DROP en Authorization). Mismo valor que la env var de Vercel/.env.local.
- `n8n_dj_verify_secret`: secret inbound que el trigger de DB manda a n8n (header `x-webhook-secret`). n8n lo valida.

## Workflow "dj-verify" (event-driven)
1. **Webhook** (POST, path `/dj-verify`): recibe `{ user_id }` del trigger de DB.
   - En el nodo, validar header `x-webhook-secret` == `n8n_dj_verify_secret` (IF node; si no coincide, responder 401 y cortar).
2. **HTTP Request** → `POST https://dropgigs.com/api/admin/dj-verify/evaluate`
   - Header `Authorization: Bearer <DJ_VERIFY_SECRET>` (credential Header Auth).
   - Body JSON: `{ "user_id": "{{ $json.body.user_id }}" }`.
3. **IF** `{{ $json.decision === "needs_review" }}` (opcional).
4. **(rama true, opcional) Email/Slack** a Jaime: "DJ {{artist_name}} quedó 3/4, falta {{missing}}".

## Workflow "dj-verify-backfill" (una vez / red de seguridad)
1. **Manual/Schedule Trigger** (para el barrido inicial: Manual; para red de seguridad: Schedule semanal).
2. **HTTP Request** → `GET https://dropgigs.com/api/admin/dj-verify/sweep` con `Authorization: Bearer <DJ_VERIFY_SECRET>`.
3. **(opcional) Email/Slack** con el resumen `needs_review`.

## Registrar la URL del webhook en la DB
Una vez activo el Webhook en n8n, copiar su Production URL y correr en la DB:
```sql
insert into private.integration_config (key, value) values
  ('n8n_dj_verify_url', 'https://<tu-n8n>/webhook/dj-verify'),
  ('n8n_dj_verify_secret', '<secreto-inbound-n8n>')
on conflict (key) do update set value = excluded.value;
```
```

- [ ] **Step 2: Montar el workflow en n8n (manual, por Jaime)**

Seguir el doc: crear ambos workflows, setear las credentials, activar el webhook, copiar su URL y registrar `n8n_dj_verify_url` + `n8n_dj_verify_secret` en `private.integration_config`.

- [ ] **Step 3: Commit del doc**

```bash
git add docs/superpowers/n8n-dj-verify-workflow.md
git commit -m "docs · verify: setup del workflow de n8n para verificación de DJs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Deploy, env vars y barrido inicial

**Files:** (ninguno de código — configuración y ejecución)

- [ ] **Step 1: PR + merge de la rama**

Abrir PR de `feat/verificacion-dj-auto` → `main` (cuenta `jayportu`), revisar el diff, mergear. **Correr la migración 0064 en la DB de prod ANTES de que el deploy con el código quede sirviendo** (el código no depende de la fila de config, pero el trigger sí debe existir).

- [ ] **Step 2: Setear env var en Vercel**

Setear `DJ_VERIFY_SECRET` en Vercel (Production) con el mismo valor que usa n8n. Forzar recompilación si hace falta (lección NEXT_PUBLIC no aplica acá porque es server-only, pero confirmar que el endpoint responde 500 "no configurado" si falta).

- [ ] **Step 3: Registrar config de n8n en prod y activar workflows**

Con la URL de prod del webhook n8n, correr el `insert ... into private.integration_config` (Task 6, Step 1) contra la DB de **prod**. Activar los workflows.

- [ ] **Step 4: Correr el barrido inicial (una vez)**

Disparar el workflow "dj-verify-backfill" (o `curl` directo a `/sweep` con el secret) contra prod. Revisar el resumen: cuántos quedaron verificados, cuántos `needs_review`. Spot-check en `/admin` que los verificados muestran el badge `✓ Verificado`.

- [ ] **Step 5: Prueba event-driven real**

Con una cuenta de DJ de prueba a 3/4, completar el 4º requisito desde la app y confirmar que en segundos queda verificado (el trigger → n8n → /evaluate). Revisar `net.http_request_queue`/logs de n8n si no ocurre.

---

## Self-Review

**Spec coverage:**
- §2 regla 4/4 / 3/4 / ≤2 → Task 1 (`evaluateAndVerify`), Task 3 (agregación sweep). ✅
- §3 los 4 chequeos con umbrales → Task 1 `evaluateDjVerification`. ✅
- §4 event-driven + backfill → Task 4 (trigger), Task 2 (evaluate), Task 3 (sweep), Task 6 (n8n). ✅
- §5 trigger con guardia anti-heartbeat → Task 4 (WHEN clause). ✅
- §6 endpoints (evaluate/sweep, secret, PUBLIC_PATHS, service_role, verified_by=null) → Tasks 1-3. ✅
- §7 workflow n8n → Task 6. ✅
- §8 notificación opcional → Task 6 (nodo IF+Email/Slack opcional). ✅
- §9 seguridad (service_role no sale a n8n; secret; protect_dj_verification intacto) → Tasks 1-4. ✅
- §12 criterios de aceptación → cubiertos por verificaciones de Tasks 2-5 y Task 7 Step 5 (completar semanas después / heartbeat no dispara / 4/4 badge / idempotencia). ✅

**Placeholder scan:** sin TBD/TODO; todo el código y los comandos están completos. La única "config a mano" (seed de `integration_config`) es intencional (secreto fuera de git) y está documentada con el SQL exacto.

**Type consistency:** `evaluateDjVerification` / `evaluateAndVerify` / `MISSING_LABELS` / `VerifyDecision` / `VerifyCheckKey` se definen en Task 1 y se consumen con esos mismos nombres en Tasks 2, 3 y 5. `DJ_VERIFY_SECRET` consistente en Tasks 2, 3, 5, 6, 7. `private.integration_config` claves `n8n_dj_verify_url`/`n8n_dj_verify_secret` consistentes entre Task 4 y Task 6. ✅
