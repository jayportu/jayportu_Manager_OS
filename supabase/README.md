# Supabase — migrations & schema

## Convención de migrations

Cada cambio de schema vive en `supabase/migrations/NNNN_descripcion.sql` (4 dígitos, ascendente).

Por ahora **NO** usamos Supabase CLI. Las migrations se ejecutan a mano:

1. Abrir Supabase Dashboard → tu proyecto → **SQL Editor** (icono `>_` en sidebar)
2. Click **"New query"**
3. **Copiar y pegar** el contenido del archivo `.sql` de la migration
4. Click **"Run"** (Cmd+Enter)
5. Verificar el resultado en el Table Editor

## Orden de migrations (ejecutar en este orden)

| # | Archivo | Crea | Estado |
|---|---|---|---|
| 0001 | `0001_dj_profile.sql` | `dj_profile` + RLS + trigger auto-create on signup | ⏳ pendiente |

## Cómo verificar que una migration corrió bien

Dashboard → Table Editor → debe aparecer la tabla nueva con sus columnas.

O en SQL Editor ejecutar:
```sql
select * from public.dj_profile;
```

Debe devolver 1 fila por cada usuario registrado (el trigger crea el profile automáticamente).

## Cuándo migrar a Supabase CLI

Cuando tengamos `>10` migrations, o queramos branching de schema, instalamos `supabase` CLI:
```bash
brew install supabase/tap/supabase
supabase init
supabase link --project-ref exryfdnptrhhwlfgqmpv
supabase db push
```

Por ahora, manual.
