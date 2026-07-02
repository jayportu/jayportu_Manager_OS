# Verificación automatizada de DJs con n8n — Diseño

**Fecha:** 2026-07-02
**Autor:** Jaime (jayportu) + Claude
**Estado:** propuesta para revisión

---

## 1. Objetivo

Automatizar la **verificación de confiabilidad** de un DJ (el badge `✓ Verificado`
y los chips granulares), que hoy Jaime hace 100% a mano en `/admin`. Un DJ que
cumple un mínimo de datos queda verificado **solo, en el momento en que completa
el mínimo** — sin que Jaime tenga que revisar perfiles constantemente.

**No** cubre la aprobación de beta (`beta_requests → approved`), que ya es
automática (PR#176).

## 2. Regla de negocio

Se evalúan **4 chequeos**. Según cuántos cumpla el DJ:

- **4/4** → se verifica automáticamente: se setean los chips `socials` + `sets`,
  se marca `verified_at = now` y el DJ obtiene el badge `✓ Verificado`.
- **3/4** → no se verifica. (En el modelo event-driven, ver §4, esto se
  resuelve solo: cuando el DJ complete el 4º requisito, la reevaluación lo
  verifica. El aviso a Jaime queda **opcional**.)
- **≤2/4** → no hace nada.

El chip `identity` **no** lo toca la automatización: queda para revisión manual
opcional de Jaime. El badge `✓ Verificado` (dado por `verified_at`) depende de
cumplir los 4 chequeos, no del chip `identity`.

## 3. Los 4 chequeos

Bajo la decisión de "confiar en lo que el DJ declara" (sin scraping), **los 4
son lectura directa de `dj_profile`**:

| # | Chequeo | Regla | Fuente |
|---|---------|-------|--------|
| 1 | Perfil completo | `avatar_url` presente **y** `bio_short` ≥ 80 caracteres **y** `genres.length ≥ 1` | DB |
| 2 | Press kit vivo | `press_kit_mode='pdf'` con `press_kit_pdf_url` **o** `press_kit_mode='generated'` completo | DB |
| 3 | Redes | `instagram_url` presente y bien formado | DB |
| 4 | Sets | `soundcloud_url` presente **o** ≥ 1 mix/set destacado cargado | DB |

Como los 4 chequeos salen de la base, **toda la lógica de negocio vive en DROP**.
n8n no calcula nada de negocio; orquesta y notifica.

## 4. Arquitectura (event-driven + barrido inicial)

Dos caminos que usan la misma lógica de evaluación en DROP:

**A) Ongoing — event-driven (el mecanismo permanente):**

```
DJ edita/completa su perfil (día 1 o semana 8, por cualquier pantalla)
      → cambia una columna relevante de dj_profile
      → TRIGGER de base de datos con guardia dispara pg_net POST
      → n8n (webhook)
      → n8n llama POST /api/admin/dj-verify/evaluate { user_id }
      → DROP recomputa los 4 chequeos de ese DJ
         - 4/4 → verifica al instante (chips + verified_at)
         - <4/4 → no hace nada (esperará al próximo cambio)
      → (opcional) n8n notifica a Jaime los casos 3/4
```

Clave: el disparador es **completar/editar el perfil**, no crear la cuenta. Da
igual cuándo lo complete o por qué pantalla — cualquier cambio relevante
reevalúa.

**B) One-shot — barrido inicial:**

```
GET /api/admin/dj-verify/sweep  (una vez, manual o desde n8n)
      → itera todos los dj_profile con verified_at IS NULL
      → corre la misma evaluación para cada uno
      → verifica a los que ya tienen 4/4 hoy
```

Engancha a los DJs que **ya** cumplen el mínimo antes de existir el trigger.
El mismo endpoint sirve como **red de seguridad** si se corre esporádicamente
(ej. semanal), por si el trigger dejara pasar algún caso.

**Por qué así:**
- Umbrales y writeback sensible viven en el repo (versionado, testeable, usa los
  tipos de `dj_profile`).
- El `service_role` **nunca** sale a n8n; n8n solo conoce un secret de endpoint.
- n8n queda de motor/orquestador real (lo pedido): recibe el evento, notifica,
  y se le pueden agregar canales/lógica sin re-deployar DROP.

## 5. Trigger de base de datos (migration)

Necesario porque un webhook crudo a `dj_profile` se dispararía en cada heartbeat
de presencia (`last_active_at` se actualiza ~cada 60s por DJ activo —
`/api/dj/heartbeat`). Un trigger con guardia evita esa tormenta.

- **Tabla:** `dj_profile`, `AFTER UPDATE`.
- **Condición (`WHEN`):** dispara **solo si**
  - `OLD.verified_at IS NULL` (aún no verificado), **y**
  - cambió al menos una columna relevante:
    `avatar_url`, `bio_short`, `genres`, `instagram_url`, `soundcloud_url`,
    los mixes/sets destacados, `press_kit_mode` / `press_kit_pdf_url`.
  - **Excluye explícitamente** `last_active_at` (y cualquier columna no
    relevante) → cero disparos por heartbeat.
- **Acción:** `pg_net` (o `supabase_functions.http_request`) hace un POST
  **asíncrono** al webhook de n8n con `{ user_id }`. Asíncrono = no bloquea ni
  ralentiza el guardado del perfil del DJ.
- **URL/secret de n8n:** guardado como setting de DB / Vault secret, **no
  hardcodeado** en la migración.

**Mantención:** si a futuro se agrega un 5º dato al criterio, hay que sumar esa
columna al `WHEN` del trigger. La red de seguridad (§4B, barrido esporádico)
mitiga el riesgo de olvidarlo.

## 6. Endpoints DROP

Ambos comparten una función interna `evaluateAndVerify(userId)` (los 4 chequeos
+ writeback si 4/4). Ambos protegidos con `Authorization: Bearer <secret>`
(`safeEqual`, `@/lib/cron-auth`), marcados en `PUBLIC_PATHS`, y usan
`createAdminClient()` (service_role, exento del trigger `protect_dj_verification`).

### `POST /api/admin/dj-verify/evaluate`  — camino event-driven

- **Body:** `{ user_id }`.
- Corre `evaluateAndVerify(user_id)`. Si 4/4:
  - `verifications = union(actuales, ['socials','sets'])`
  - `verified_at = now`, `verified_by = null` (**null = verificado por bot**,
    lo distingue del manual que guarda el `adminId`).
  - revalida caches (`/admin`, `/dj`, `/p/[slug]`, tag `public-djs`).
- **Respuesta:** `{ ok, decision: "verified"|"needs_review"|"not_eligible",
  score, missing: [...] }`.

### `GET /api/admin/dj-verify/sweep`  — barrido inicial / red de seguridad

- Itera todos los `dj_profile` con `verified_at IS NULL` y corre
  `evaluateAndVerify` en cada uno.
- **Respuesta:** `{ ok, verified: [...], needs_review: [...], not_eligible_count }`.

**Idempotencia:** un DJ ya verificado tiene `verified_at != null` → deja de ser
candidato. Correr evaluate/sweep de más es inofensivo.

## 7. Workflow n8n

Nodos:

1. **Webhook Trigger** — recibe el POST del trigger de DB (`{ user_id }`).
   (URL protegida con el secret que el trigger envía.)
2. **HTTP Request** — `POST .../api/admin/dj-verify/evaluate` con `{ user_id }`
   y header `Authorization: Bearer <secret>` (credential en n8n).
3. **IF** — `{{ $json.decision === "needs_review" }}` (opcional).
4. **(rama true, opcional) Send Email / Slack** — avisa a Jaime que ese DJ
   quedó 3/4 con el chequeo faltante.

Para el **barrido inicial**: un workflow aparte (o manual) que llame
`GET /sweep` una vez; opcionalmente un Schedule Trigger semanal como red de
seguridad.

## 8. Notificación

En el modelo event-driven el aviso 3/4 es **opcional**: un DJ al que le falta 1
se auto-verifica cuando lo complete, sin intervención. Si Jaime igual quiere
visibilidad:
- **Canal por defecto:** email a `hola@dropgigs.com` (patrón Resend del repo).
- **Alternativa:** Slack. Cambiar de canal = editar el último nodo de n8n, sin
  tocar DROP.

## 9. Seguridad

- El writeback de `verified_at` / `verifications` solo lo puede hacer
  service_role (trigger `protect_dj_verification`, migration 0038). El endpoint
  usa `createAdminClient()`; n8n nunca ve esa key.
- Endpoints protegidos con secret de header (`safeEqual`) + en `PUBLIC_PATHS`.
- `verified_by = null` marca las verificaciones automáticas vs. las manuales.
- El DJ no puede auto-verificarse editando su perfil: el trigger
  `protect_dj_verification` lo sigue bloqueando (el trigger nuevo de §5 solo
  **detecta el cambio y avisa**, no escribe la verificación).

## 10. Riesgos y decisiones tomadas

- **Tormenta de heartbeat:** resuelta con la guardia del trigger (§5) — solo
  dispara en cambios relevantes, nunca por `last_active_at`.
- **Auto-verify "blando":** se confía en lo que el DJ declara (no se valida que
  IG/SoundCloud existan de verdad). Decisión consciente de Jaime, igual que la
  app en vivo hoy. Endurecer = validar resolución de links (fuera de alcance).
- **Lista de columnas del trigger:** hay que mantenerla si cambia el criterio;
  el barrido de respaldo la cubre.
- **`bio_short ≥ 80`:** umbral ajustable en un solo lugar (la función de
  evaluación).

## 11. Fuera de alcance (v1)

- Scraping / validación de existencia real de la cuenta de Instagram.
- Validación de que los links de sets resuelvan (SoundCloud/YouTube 200 vs 404).
- Revocación automática (des-verificar si un DJ ya verificado borra un dato).

## 12. Criterios de aceptación

- [ ] Un DJ que completa el 4º requisito **semanas después** de crear su cuenta
  queda verificado ese día (el trigger reevalúa al guardar).
- [ ] El heartbeat de presencia (`last_active_at`) **no** dispara el trigger.
- [ ] Un DJ que cumple 4/4 queda con `✓ Verificado` + chips `socials`+`sets` y
  `verified_by = null`.
- [ ] Un DJ con 3/4 no se verifica; si el aviso está activo, llega con el
  chequeo faltante correcto.
- [ ] El barrido inicial verifica a los DJs que ya cumplen el mínimo hoy.
- [ ] Los endpoints rechazan requests sin el `Bearer` correcto (401).
- [ ] Correr evaluate/sweep dos veces no re-verifica ni duplica nada.
- [ ] El DJ no puede auto-verificarse editando su propio perfil.
