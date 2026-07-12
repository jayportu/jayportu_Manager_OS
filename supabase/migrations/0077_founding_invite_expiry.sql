-- 0077_founding_invite_expiry.sql
--
-- F2d · Vencimiento de invitaciones Founding. Una invitación pendiente caduca a
-- los 30 días; consumeFoundingInviteIfAny la rechaza (reason "expired"). Re-enviar
-- desde /admin/founding-invites regenera el token y renueva la ventana.

alter table public.founding_invites
  add column if not exists expires_at timestamptz;

-- Backfill de las invitaciones existentes según su fecha de creación (no now(),
-- para que el vencimiento refleje cuándo se creó realmente cada una).
update public.founding_invites
  set expires_at = created_at + interval '30 days'
  where expires_at is null;

-- Default para nuevas invitaciones. createFoundingInvite igual lo setea explícito
-- en código; esto es la red de seguridad para cualquier otro path de insert.
alter table public.founding_invites
  alter column expires_at set default (now() + interval '30 days');
