-- ================================================================
-- Migration 013 — Status "Não Tem Interesse" + flag histórica
-- ================================================================

-- 1. Coluna de data agendada para reset automático de volta à Prospecção
ALTER TABLE clients ADD COLUMN IF NOT EXISTS interesse_reset_at TIMESTAMPTZ;

-- 2. Flag histórica: permanece true mesmo após o reset automático
--    Pode ser desmarcada manualmente pelo usuário
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nao_tem_interesse BOOLEAN NOT NULL DEFAULT false;

-- 3. Insere o status "Não Tem Interesse" para todos os usuários existentes
INSERT INTO status (nome, cor, ordem, user_id)
SELECT 'Não Tem Interesse', '#78716c', 12, u.id
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM status WHERE nome = 'Não Tem Interesse' AND user_id = u.id
);
