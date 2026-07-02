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
