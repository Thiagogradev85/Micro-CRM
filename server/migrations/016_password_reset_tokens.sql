-- Migration 016: tabela de tokens para redefinição de senha via e-mail
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token      ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON password_reset_tokens (expires_at);
