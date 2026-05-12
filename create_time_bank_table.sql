-- Execute este script no Supabase SQL Editor:
-- Dashboard → Project → SQL Editor → New query → cole e execute

-- Drop and recreate time_bank_entries with TEXT employee_id (no FK constraint)
-- This works whether employees.id is UUID or TEXT
DROP TABLE IF EXISTS time_bank_entries;

CREATE TABLE time_bank_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT        NOT NULL,
  minutes     INTEGER     NOT NULL,
  date        DATE        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL DEFAULT 'OVERTIME',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tbe_employee_id ON time_bank_entries(employee_id);
CREATE INDEX idx_tbe_date        ON time_bank_entries(date DESC);

-- Disable RLS so service role can always insert
ALTER TABLE time_bank_entries DISABLE ROW LEVEL SECURITY;
