-- Migration 006: Índice em ultimo_contato para performance da query de clientes em atraso
CREATE INDEX IF NOT EXISTS idx_clients_ultimo_contato
  ON clients (ultimo_contato)
  WHERE ativo = true;
