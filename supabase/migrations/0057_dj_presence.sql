-- Presencia de DJs ("LIVE")
-- Marca cuándo el DJ estuvo activo por última vez. Un latido (heartbeat) desde
-- el navegador actualiza esto cada ~60s mientras el DJ tiene la app abierta.
-- El badge "● LIVE" en Buscar DJs se muestra si last_active_at cae dentro de
-- los últimos ~3 minutos.
--
-- No es columna admin-only: el dueño la actualiza vía su propio heartbeat
-- (RLS de dj_profile ya permite UPDATE de la fila propia). No se agrega al
-- allowlist de updateMyProfile ni necesita guard en protect_dj_verification
-- (no es escalable: a lo sumo un DJ falsea su propio estado, bajo impacto).

ALTER TABLE dj_profile ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Índice parcial para la query de presencia (solo filas con actividad).
CREATE INDEX IF NOT EXISTS idx_dj_profile_last_active_at
  ON dj_profile (last_active_at)
  WHERE last_active_at IS NOT NULL;
