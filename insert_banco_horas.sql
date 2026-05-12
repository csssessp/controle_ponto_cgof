-- ============================================================
-- Inserir saldo inicial do Banco de Horas por funcionário
-- Execute no SQL Editor do Supabase
-- Data de referência: saldo acumulado em 08/05/2026
-- ============================================================
-- Convenção:
--   status "negativo" → minutes < 0, type = 'COMPENSATION'
--   status "positivo" → minutes > 0, type = 'OVERTIME'
-- ============================================================

DO $$
DECLARE
  v_emp_id UUID;

  -- Procedimento auxiliar para inserir a entrada no banco de horas
  -- (declarado como variáveis + bloco inline abaixo)
BEGIN

  -- ── NEGATIVOS (débito) ────────────────────────────────────────────

  -- ANA PAULA DA SILVA  →  -8h47  =  -527 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ANA PAULA DA SILVA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -527, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ANA PAULA DA SILVA'; END IF;

  -- ELIANA FRANCO PEREIRA  →  -16h55  =  -1015 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ELIANA FRANCO PEREIRA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -1015, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ELIANA FRANCO PEREIRA'; END IF;

  -- BEATRIZ PUGA RODRIGUES  →  -6h49  =  -409 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%BEATRIZ PUGA RODRIGUES%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -409, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: BEATRIZ PUGA RODRIGUES'; END IF;

  -- MARTA DE ALMEIDA GOMES GUNTHER  →  -0h50  =  -50 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MARTA DE ALMEIDA GOMES%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -50, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MARTA DE ALMEIDA GOMES'; END IF;

  -- JOÃO CARLOS FERREIRA DE SOUZA  →  -23h01  =  -1381 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%JO%O CARLOS FERREIRA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -1381, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: JOÃO CARLOS FERREIRA DE SOUZA'; END IF;

  -- KAREN DE OLIVEIRA DELFINO  →  -23h20  =  -1400 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%KAREN DE OLIVEIRA DELFINO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -1400, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: KAREN DE OLIVEIRA DELFINO'; END IF;

  -- MARILSA DA SILVA E SILVA  →  -8h37  =  -517 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MARILSA DA SILVA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -517, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MARILSA DA SILVA E SILVA'; END IF;

  -- RONALDO HILÁRIO DOS SANTOS  →  -12h23  =  -743 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%RONALDO HIL%RIO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -743, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: RONALDO HILÁRIO DOS SANTOS'; END IF;

  -- THIAGO ALMEIDA DA SILVA  →  -9h58  =  -598 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%THIAGO ALMEIDA DA SILVA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -598, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: THIAGO ALMEIDA DA SILVA'; END IF;

  -- CLAUDENICE DA SILVA  →  -5h45  =  -345 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%CLAUDENICE DA SILVA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, -345, '2026-05-08', 'Saldo inicial banco de horas', 'COMPENSATION', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: CLAUDENICE DA SILVA'; END IF;


  -- ── POSITIVOS (crédito) ───────────────────────────────────────────

  -- ADAN FREIRE PEREIRA  →  +32h07  =  +1927 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ADAN FREIRE PEREIRA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1927, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ADAN FREIRE PEREIRA'; END IF;

  -- ADRIANA CRISTINA DE JESUS AZEVEDO  →  +13h42  =  +822 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ADRIANA CRISTINA%AZEVEDO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 822, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ADRIANA CRISTINA DE JESUS AZEVEDO'; END IF;

  -- GABRIELA FERNANDA VERGUEIRO  →  +20h07  =  +1207 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%GABRIELA FERNANDA VERGUEIRO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1207, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: GABRIELA FERNANDA VERGUEIRO'; END IF;

  -- SUSANA SERAFIM CIRINO  →  +30h45  =  +1845 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%SUSANA SERAFIM CIRINO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1845, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: SUSANA SERAFIM CIRINO'; END IF;

  -- TATIANA DE CARVALHO COSTA LOSCHER  →  sem saldo (campo vazio, ignorar)
  -- RAISE NOTICE 'TATIANA LOSCHER ignorada (sem saldo informado)';

  -- DIONE MARIA LISBOA PEREIRA  →  +0h23  =  +23 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%DIONE MARIA LISBOA PEREIRA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 23, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: DIONE MARIA LISBOA PEREIRA'; END IF;

  -- FÁBIO LUÍS POZZO  →  +171h01  =  +10261 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%F%BIO%POZZO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 10261, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: FÁBIO LUÍS POZZO'; END IF;

  -- GABRIELA PICCARDI GONZALES  →  +6h00  =  +360 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%GABRIELA PICCARDI GONZALES%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 360, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: GABRIELA PICCARDI GONZALES'; END IF;

  -- ROSELI APARECIDA RODRIGUES COLOMBO  →  +39h18  =  +2358 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ROSELI%RODRIGUES COLOMBO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 2358, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ROSELI APARECIDA RODRIGUES COLOMBO'; END IF;

  -- ALMIR MANTA  →  +30h01  =  +1801 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ALMIR MANTA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1801, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ALMIR MANTA'; END IF;

  -- CARLA ROSARIA RODRIGUES VAZ TURIANI  →  +8h30  =  +510 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%CARLA ROSARIA%TURIANI%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 510, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: CARLA ROSARIA TURIANI'; END IF;

  -- MAGDA DE CAMPOS  →  +21h36  =  +1296 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MAGDA DE CAMPOS%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1296, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MAGDA DE CAMPOS'; END IF;

  -- MARILDA APARECIDA DA SILVA VELOSO  →  +21h08  =  +1268 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MARILDA APARECIDA%VELOSO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1268, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MARILDA APARECIDA VELOSO'; END IF;

  -- MARCELO DA SILVA GASPAR  →  +47h13  =  +2833 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MARCELO DA SILVA GASPAR%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 2833, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MARCELO DA SILVA GASPAR'; END IF;

  -- NORMA SUELY FERREIRA SOUZA AMERICO  →  +854h23  =  +51263 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%NORMA SUELY%AMERICO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 51263, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: NORMA SUELY AMERICO'; END IF;

  -- SILVIA MARIA ROCHA  →  +6h44  =  +404 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%SILVIA MARIA ROCHA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 404, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: SILVIA MARIA ROCHA'; END IF;

  -- BRUNO MARCELO LOPES SANTOS  →  +11h38  =  +698 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%BRUNO MARCELO%SANTOS%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 698, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: BRUNO MARCELO LOPES SANTOS'; END IF;

  -- CLEMILSON SANTOS COBRA  →  +78h42  =  +4722 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%CLEMILSON SANTOS COBRA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 4722, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: CLEMILSON SANTOS COBRA'; END IF;

  -- DARIO BESSELER  →  +23h21  =  +1401 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%DARIO BESSELER%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1401, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: DARIO BESSELER'; END IF;

  -- EUNICE BRASILEIRO  →  +5h31  =  +331 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%EUNICE BRASILEIRO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 331, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: EUNICE BRASILEIRO'; END IF;

  -- EDNA MIYUKI BABA  →  +642h35  =  +38555 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%EDNA MIYUKI BABA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 38555, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: EDNA MIYUKI BABA'; END IF;

  -- WANDER HELENO SALLES  →  +27h23  =  +1643 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%WANDER HELENO SALLES%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1643, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: WANDER HELENO SALLES'; END IF;

  -- ARLETE SHIRLEY PEREIRA DE CARVALHO  →  +31h44  =  +1904 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ARLETE SHIRLEY%CARVALHO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1904, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ARLETE SHIRLEY CARVALHO'; END IF;

  -- ELENICE ORPHEU ALVES DE SOUZA  →  +2h43  =  +163 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ELENICE ORPHEU%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 163, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ELENICE ORPHEU'; END IF;

  -- ELZA TATSUO SAMECIMA  →  +168h58  =  +10138 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ELZA TATSUO SAMECIMA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 10138, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ELZA TATSUO SAMECIMA'; END IF;

  -- FERNANDA DA SILVA E SOUZA  →  +3h08  =  +188 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%FERNANDA DA SILVA E SOUZA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 188, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: FERNANDA DA SILVA E SOUZA'; END IF;

  -- GILMAR MARCIANO DOS SANTOS  →  +18h20  =  +1100 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%GILMAR MARCIANO DOS SANTOS%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1100, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: GILMAR MARCIANO DOS SANTOS'; END IF;

  -- JOMARA SIMÕES DOS SANTOS  →  +7h21  =  +441 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%JOMARA SIM%ES%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 441, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: JOMARA SIMÕES DOS SANTOS'; END IF;

  -- MARISTELA APARECIDA RAPHAEL  →  +18h31  =  +1111 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MARISTELA APARECIDA RAPHAEL%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1111, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MARISTELA APARECIDA RAPHAEL'; END IF;

  -- MARTA CONCEIÇÃO DE MOURA  →  +110h08  =  +6608 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MARTA CONCEI%O%MOURA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 6608, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MARTA CONCEIÇÃO DE MOURA'; END IF;

  -- RENATO ESPIRITO SANTO DIAS TATIT  →  +10h32  =  +632 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%RENATO%TATIT%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 632, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: RENATO TATIT'; END IF;

  -- ROBERTO CARLOS SANTANA  →  +9h09  =  +549 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ROBERTO CARLOS SANTANA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 549, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ROBERTO CARLOS SANTANA'; END IF;

  -- TANIA CRISTINA BEGOSSO  →  +73h36  =  +4416 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%TANIA CRISTINA BEGOSSO%'
                                          OR  UPPER(TRIM(name)) LIKE '%T%NIA CRISTINA BEGOSSO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 4416, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: TANIA CRISTINA BEGOSSO'; END IF;

  -- ALEXSANDRA BERTACO SEVERINO  →  +19h11  =  +1151 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%ALEXSANDRA BERTACO SEVERINO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1151, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: ALEXSANDRA BERTACO SEVERINO'; END IF;

  -- CESAR MOREIRA CONSTANTINO  →  +32h53  =  +1973 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%CESAR MOREIRA CONSTANTINO%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1973, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: CESAR MOREIRA CONSTANTINO'; END IF;

  -- CONCEIÇÃO AP. PANISSI MARTINS  →  +95h36  =  +5736 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%CONCEI%O%PANISSI%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 5736, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: CONCEIÇÃO PANISSI'; END IF;

  -- CLEBER FARIAS DOS SANTOS  →  +100h16  =  +6016 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%CLEBER FARIAS DOS SANTOS%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 6016, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: CLEBER FARIAS DOS SANTOS'; END IF;

  -- DIEGO BARBOSA DOS SANTOS  →  +32h46  =  +1966 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%DIEGO BARBOSA DOS SANTOS%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1966, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: DIEGO BARBOSA DOS SANTOS'; END IF;

  -- FERNANDO CESAR BARBOZA  →  +3h01  =  +181 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%FERNANDO CESAR BARBOZA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 181, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: FERNANDO CESAR BARBOZA'; END IF;

  -- JOSÉ LUIZ DOS SANTOS MOREIRA  →  +5h06  =  +306 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%JOS_ LUIZ%MOREIRA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 306, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: JOSÉ LUIZ MOREIRA'; END IF;

  -- JOSE ROMÃO BATISTA  →  +14h58  =  +898 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%JOS_ ROM%O BATISTA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 898, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: JOSE ROMÃO BATISTA'; END IF;

  -- LUIZ CARLOS BAZALIA DOS SANTOS  →  +84h34  =  +5074 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%LUIZ CARLOS BAZALIA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 5074, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: LUIZ CARLOS BAZALIA'; END IF;

  -- MATEUS RIBEIRO DA SILVA  →  +60h28  =  +3628 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%MATEUS RIBEIRO DA SILVA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 3628, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: MATEUS RIBEIRO DA SILVA'; END IF;

  -- THAIS CRISTINA NASCIMENTO BARBOSA  →  +23h31  =  +1411 min
  SELECT id INTO v_emp_id FROM employees WHERE UPPER(TRIM(name)) LIKE '%THAIS CRISTINA NASCIMENTO BARBOSA%' LIMIT 1;
  IF v_emp_id IS NOT NULL THEN
    INSERT INTO time_bank_entries (id, employee_id, minutes, date, description, type, created_at)
    VALUES (gen_random_uuid(), v_emp_id, 1411, '2026-05-08', 'Saldo inicial banco de horas', 'OVERTIME', NOW());
  ELSE RAISE NOTICE 'Funcionário não encontrado: THAIS CRISTINA NASCIMENTO BARBOSA'; END IF;

  RAISE NOTICE '✅ Saldos iniciais do banco de horas inseridos com sucesso!';

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- ── Verificar resultado ────────────────────────────────────────────────────
SELECT
  e.name                                          AS funcionario,
  t.date                                          AS data,
  CASE WHEN t.minutes >= 0 THEN '+' ELSE '' END
    || (ABS(t.minutes) / 60)::text
    || 'h'
    || LPAD((ABS(t.minutes) % 60)::text, 2, '0') AS banco_horas,
  t.type                                          AS tipo,
  t.description
FROM time_bank_entries t
JOIN employees e ON e.id = t.employee_id::uuid
WHERE t.description = 'Saldo inicial banco de horas'
ORDER BY e.name;
