-- Migration 005: NOT NULL constraints on essential client columns
-- Run on: Neon (production)
-- Safe to run multiple times (constraints are idempotent via the UPDATE step)

-- ── Step 1: Sanitize any existing nulls before adding constraints ────────────

-- Replace NULL names with a placeholder (shouldn't exist, but just in case)
UPDATE clients SET nome = 'Sem nome' WHERE nome IS NULL OR TRIM(nome) = '';

-- Replace NULL ufs with 'XX' (unknown state marker)
UPDATE clients SET uf = 'XX' WHERE uf IS NULL OR TRIM(uf) = '';

-- Ensure ativo is never null (default is true)
UPDATE clients SET ativo = true WHERE ativo IS NULL;

-- ── Step 2: Add NOT NULL constraints ────────────────────────────────────────

ALTER TABLE clients
  ALTER COLUMN nome  SET NOT NULL,
  ALTER COLUMN uf    SET NOT NULL,
  ALTER COLUMN ativo SET NOT NULL;

-- ── Step 3: Verify ──────────────────────────────────────────────────────────

SELECT
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('nome', 'uf', 'ativo')
ORDER BY column_name;
