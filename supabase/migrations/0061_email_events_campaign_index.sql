-- 0061_email_events_campaign_index.sql
--
-- Perf: los KPIs de cada campaña (src/lib/queries/email-campaigns.ts) consultan
-- email_events con `.eq("campaign_id", …).order("occurred_at desc")`, pero el
-- único índice existente (idx_email_events_resend) parte por resend_id. Sin un
-- índice que empiece por campaign_id, Postgres escanea TODA la tabla y ordena en
-- memoria cada vez que se abre el detalle de una campaña en /admin. La tabla solo
-- crece (campaña de 861 envíos × varias aperturas c/u → miles de filas).
--
-- Este índice sirve la query completa (filtro + orden) y además indexa la FK
-- campaign_id → email_campaigns (Postgres no indexa FKs automáticamente), lo que
-- acelera el ON DELETE SET NULL al borrar una campaña.
--
-- Backward-compatible: no cambia ningún resultado, solo acelera queries
-- existentes. Orden de aplicación indiferente respecto al deploy de código.

create index if not exists idx_email_events_campaign_occurred
  on public.email_events(campaign_id, occurred_at desc);
