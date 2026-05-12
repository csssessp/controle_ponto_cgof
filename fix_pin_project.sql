-- ============================================================
-- Corrigir atualização do campo pin_project
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Garantir que a coluna existe
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS pin_project BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Criar função auxiliar para atualizar pin_project
--    (necessária porque o cache de schema do PostgREST pode
--     não reconhecer colunas adicionadas após o boot)
CREATE OR REPLACE FUNCTION set_pin_project(emp_id uuid, pin_val boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE employees SET pin_project = pin_val WHERE id = emp_id;
$$;

-- 3. Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- 4. Verificar
SELECT id, name, pin_project FROM employees ORDER BY name LIMIT 20;
