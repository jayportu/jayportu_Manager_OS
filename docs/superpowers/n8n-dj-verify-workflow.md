# Activación de la verificación automática de DJs

Hay dos formas de conectar el trigger de la DB con el endpoint `/evaluate`.
**La vía por defecto es SIN n8n** (Postgres llama directo a la app). n8n queda
como opción si algún día quieres orquestar/notificar desde ahí.

---

## ✅ Vía por defecto — SIN n8n (migración 0065)

El trigger `dj_verify_notify_trigger` (migración **0065**) llama directo a
`https://dropgigs.com/api/admin/dj-verify/evaluate` vía `pg_net`. No hay
intermediario.

**Pasos de activación:**

1. **Vercel** — setear `DJ_VERIFY_SECRET` (Production) y redeploy. *(Hecho.)*
2. **Migración** — correr 0065:
   ```bash
   node scripts/run_migration.mjs supabase/migrations/0065_dj_verify_direct_call.sql
   ```
   (Si falla en `create extension pg_net`: Supabase → Database → Extensions → habilitar `pg_net`, y reintentar.)
3. **Secret en la DB** — registrar el MISMO valor que pusiste en Vercel:
   ```sql
   insert into private.integration_config (key, value)
     values ('dj_verify_secret', '<mismo valor que DJ_VERIFY_SECRET en Vercel>')
   on conflict (key) do update set value = excluded.value;
   ```
   Sin esta fila el trigger es no-op (seguro correr la migración antes).
4. **Barrido inicial** — verificar a los DJs que ya cumplen hoy:
   ```bash
   curl -s https://dropgigs.com/api/admin/dj-verify/sweep \
     -H "Authorization: Bearer <DJ_VERIFY_SECRET>" | jq
   ```
   Revisar `verified` y `needs_review` antes de dar por buena la verificación masiva.

De ahí en adelante: cuando un DJ complete/edite su perfil, el trigger llama a
`/evaluate` y —si cumple 4/4— queda verificado al instante.

---

## Opción — CON n8n (si quieres orquestar/notificar desde n8n)

Requiere volver a la función de la migración 0064 (que apunta a n8n vía
`n8n_dj_verify_url`) en vez de la 0065. Solo tiene sentido si quieres editar
avisos/canales sin tocar la DB. Requisito: la URL del webhook de n8n debe ser
alcanzable desde internet (Supabase pg_net la llama de afuera).

### Secretos
- `DJ_VERIFY_SECRET`: compartido n8n ↔ DROP (n8n lo manda a DROP en Authorization).
- `n8n_dj_verify_secret`: secret inbound que el trigger de DB manda a n8n (header `x-webhook-secret`).

### Workflow "dj-verify" (event-driven)
1. **Webhook** (POST, path `/dj-verify`): recibe `{ user_id }` del trigger de DB.
   - Validar header `x-webhook-secret` == `n8n_dj_verify_secret` (IF node; si no, cortar).
2. **HTTP Request** → `POST https://dropgigs.com/api/admin/dj-verify/evaluate`
   - Header `Authorization: Bearer <DJ_VERIFY_SECRET>` (credential Header Auth).
   - Body JSON: `{ "user_id": "{{ $json.body.user_id }}" }`.
3. **IF** `{{ $json.decision === "needs_review" }}` (opcional) → Email/Slack.

### Workflow "dj-verify-backfill" (una vez / red de seguridad)
1. **Manual/Schedule Trigger**.
2. **HTTP Request** → `GET https://dropgigs.com/api/admin/dj-verify/sweep` con `Authorization: Bearer <DJ_VERIFY_SECRET>`.

### Registrar la URL del webhook en la DB
```sql
insert into private.integration_config (key, value) values
  ('n8n_dj_verify_url', 'https://<tu-n8n>/webhook/dj-verify'),
  ('n8n_dj_verify_secret', '<secreto-inbound-n8n>')
on conflict (key) do update set value = excluded.value;
```
