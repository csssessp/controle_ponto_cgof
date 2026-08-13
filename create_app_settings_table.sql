-- Execute este script no Supabase SQL Editor:
-- Dashboard → Project → SQL Editor → New query → cole e execute
--
-- Sem esta tabela, loadPinGoalsFromDb() (server.ts) falha silenciosamente em
-- todo restart e PUT /api/pin-project/goals nunca persiste as metas mensais
-- do Projeto PIN além da memória do processo atual.

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
