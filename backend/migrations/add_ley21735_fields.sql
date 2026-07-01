-- Ley 21.735 employer contribution fields + Mutual ISL
ALTER TABLE payroll_entries
  ADD COLUMN IF NOT EXISTS aporte_empleador_afp_reforma NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aporte_seguro_social NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aporte_mutual_isl NUMERIC(12,2) DEFAULT 0;
