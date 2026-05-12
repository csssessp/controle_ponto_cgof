-- ============================================================
-- Adicionar coluna pin_project na tabela employees
-- Execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS pin_project BOOLEAN NOT NULL DEFAULT FALSE;

-- Recarregar schema do PostgREST (obrigatório após ALTER TABLE via SQL direto)
NOTIFY pgrst, 'reload schema';

-- Verificar resultado
SELECT id, name, pin_project
FROM employees
ORDER BY name
LIMIT 20;
