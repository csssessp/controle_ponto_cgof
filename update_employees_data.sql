-- ============================================================
-- Atualizar setor, cargo, email e ramal dos funcionários
-- Execute no SQL Editor do Supabase
-- ============================================================

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Busca o ID da organização existente
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma organização encontrada. Crie a organização primeiro.';
  END IF;

  -- ── Criar setores (ignora se já existir) ──────────────────────────
  INSERT INTO departments (id, name, organization_id, created_at, updated_at)
  SELECT gen_random_uuid(), s.name, v_org_id, NOW(), NOW()
  FROM (VALUES
    ('COORDENADORA'),
    ('ASSESSORIA'),
    ('CATC'),
    ('GCF'),
    ('GCO'),
    ('GCSS-PROCESS'),
    ('GGCON'),
    ('GPC - GGCON')
  ) AS s(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM departments d WHERE d.name = s.name AND d.organization_id = v_org_id
  );

  RAISE NOTICE 'Setores criados/verificados.';

  -- ── Atualizar funcionários ─────────────────────────────────────────
  -- Helper: department_id é obtido pelo nome do setor

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'COORDENADORA' LIMIT 1),
    role_title = 'Coordenador',
    email = 'tloscher@saude.sp.gov.br',
    phone = '8946'
  WHERE UPPER(TRIM(name)) LIKE '%TATIANA%LOSCHER%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'ASSESSORIA' LIMIT 1),
    role_title = NULL,
    email = NULL,
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ADAN FREIRE PEREIRA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'ASSESSORIA' LIMIT 1),
    role_title = 'Assessor Técnico em Saúde Pública I',
    email = 'acjazevedo@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ADRIANA CRISTINA%AZEVEDO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'ASSESSORIA' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'apsilva@saude.sp.gov.br',
    phone = '8747'
  WHERE UPPER(TRIM(name)) LIKE '%ANA PAULA DA SILVA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'ASSESSORIA' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'efpereira@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ELIANA FRANCO PEREIRA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'ASSESSORIA' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'gabriela.vergueiro@saude.sp.gov.br',
    phone = '8283'
  WHERE UPPER(TRIM(name)) LIKE '%GABRIELA FERNANDA VERGUEIRO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'ASSESSORIA' LIMIT 1),
    role_title = 'Diretor Técnico III',
    email = 'scirino@saude.sp.gov.br',
    phone = '8391'
  WHERE UPPER(TRIM(name)) LIKE '%SUSANA SERAFIM CIRINO%';

  -- CATC
  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'CATC' LIMIT 1),
    role_title = 'Assessor Técnico III',
    email = 'bprodrigues@saude.sp.gov.br',
    phone = '8321'
  WHERE UPPER(TRIM(name)) LIKE '%BEATRIZ PUGA RODRIGUES%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'CATC' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'dmlpereira@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%DIONE MARIA LISBOA PEREIRA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'CATC' LIMIT 1),
    role_title = 'Diretor Técnico III',
    email = 'fpozzo@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%FÁBIO%POZZO%' OR UPPER(TRIM(name)) LIKE '%FABIO%POZZO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'CATC' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'gpgonzales@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%GABRIELA PICCARDI GONZALES%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'CATC' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'rcolombo@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ROSELI%RODRIGUES COLOMBO%';

  -- GCF
  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Diretor II',
    email = 'abertaco@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ALEXSANDRA BERTACO SEVERINO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'cmconstantino@saude.sp.gov.br',
    phone = '8380'
  WHERE UPPER(TRIM(name)) LIKE '%CESAR MOREIRA CONSTANTINO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'cdasilva@saude.sp.gov.br',
    phone = '8839'
  WHERE UPPER(TRIM(name)) LIKE '%CLAUDENICE DA SILVA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Diretor Técnico III',
    email = 'cfsantos@saude.sp.gov.br',
    phone = '8980'
  WHERE UPPER(TRIM(name)) LIKE '%CLEBER FARIAS DOS SANTOS%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = NULL,
    email = NULL,
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%CONCEIÇÃO%PANISSI%' OR UPPER(TRIM(name)) LIKE '%CONCEICAO%PANISSI%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'dbsantos@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%DIEGO BARBOSA DOS SANTOS%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Assessor Técnico III',
    email = 'fcbarboza@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%FERNANDO CESAR BARBOZA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'jsmoreira@saude.sp.gov.br',
    phone = '8116'
  WHERE UPPER(TRIM(name)) LIKE '%JOSÉ LUIZ%MOREIRA%' OR UPPER(TRIM(name)) LIKE '%JOSE LUIZ%MOREIRA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = NULL,
    email = NULL,
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%JOSÉ ROMÃO BATISTA%' OR UPPER(TRIM(name)) LIKE '%JOSE ROMAO BATISTA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Oficial Administrativo',
    email = 'lbazalia@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%LUIZ CARLOS BAZALIA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'mrsilva@saude.sp.gov.br',
    phone = '8351'
  WHERE UPPER(TRIM(name)) LIKE '%MATEUS RIBEIRO DA SILVA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCF' LIMIT 1),
    role_title = 'Assessor Técnico em Saúde Pública I',
    email = 'tcnbarbosa@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%THAIS CRISTINA NASCIMENTO BARBOSA%';

  -- GCO
  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCO' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'ccobra@saude.sp.gov.br',
    phone = '8254'
  WHERE UPPER(TRIM(name)) LIKE '%CLEMILSON SANTOS COBRA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCO' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'dbesseler@saude.sp.gov.br',
    phone = '8121'
  WHERE UPPER(TRIM(name)) LIKE '%DARIO BESSELER%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCO' LIMIT 1),
    role_title = 'Diretor Técnico III',
    email = 'ebaba@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%EDNA MIYUKI BABA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCO' LIMIT 1),
    role_title = 'Analista Administrativo',
    email = 'ebrasile@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%EUNICE BRASILEIRO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCO' LIMIT 1),
    role_title = 'Assessor Técnico III',
    email = 'whsalles@saude.sp.gov.br',
    phone = '8939'
  WHERE UPPER(TRIM(name)) LIKE '%WANDER HELENO SALLES%';

  -- GCSS-PROCESS
  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = 'Executivo Público',
    email = 'amanta@saude.sp.gov.br',
    phone = '8620'
  WHERE UPPER(TRIM(name)) LIKE '%ALMIR MANTA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = 'Digitador',
    email = 'cturiani@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%CARLA ROSARIA%TURIANI%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = 'Assessor Técnico em Saúde Pública II',
    email = 'mdcampos@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%MAGDA DE CAMPOS%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = 'Diretor I',
    email = 'mgaspar@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%MARCELO DA SILVA GASPAR%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = 'Assessor Técnico em Saúde Pública I',
    email = 'mvizoni@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%MARILDA APARECIDA%VELOSO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = NULL,
    email = NULL,
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%MARTA DE ALMEIDA GOMES%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = 'Assessor Técnico em Saúde Pública III',
    email = 'namerico@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%NORMA SUELY%AMERICO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GCSS-PROCESS' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'srocha@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%SILVIA MARIA ROCHA%';

  -- GGCON
  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'aspcarvalho@saude.sp.gov.br',
    phone = '8384'
  WHERE UPPER(TRIM(name)) LIKE '%ARLETE SHIRLEY%CARVALHO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'esamecima@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ELZA TATSUO SAMECIMA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'fesouza@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%FERNANDA DA SILVA E SOUZA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'jcsouza@saude.sp.gov.br',
    phone = '8043'
  WHERE UPPER(TRIM(name)) LIKE '%JOÃO CARLOS FERREIRA%' OR UPPER(TRIM(name)) LIKE '%JOAO CARLOS FERREIRA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Assessor Técnico III',
    email = 'jsimoes@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%JOMARA SIMÕES%' OR UPPER(TRIM(name)) LIKE '%JOMARA SIMOES%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'kdelfino@saude.sp.gov.br',
    phone = '8219'
  WHERE UPPER(TRIM(name)) LIKE '%KAREN DE OLIVEIRA DELFINO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico III',
    email = 'msilva@saude.sp.gov.br',
    phone = '8621'
  WHERE UPPER(TRIM(name)) LIKE '%MARILSA DA SILVA E SILVA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Executivo Público',
    email = 'mraphael@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%MARISTELA APARECIDA RAPHAEL%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor I',
    email = 'mcmoura@saude.sp.gov.br',
    phone = '8411'
  WHERE UPPER(TRIM(name)) LIKE '%MARTA CONCEIÇÃO%MOURA%' OR UPPER(TRIM(name)) LIKE '%MARTA CONCEICAO%MOURA%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'rtatit@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%RENATO%TATIT%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor I',
    email = 'rhsantos@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%RONALDO HILÁRIO%' OR UPPER(TRIM(name)) LIKE '%RONALDO HILARIO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'tcbegosso@saude.sp.gov.br',
    phone = '8533'
  WHERE UPPER(TRIM(name)) LIKE '%TÂNIA CRISTINA BEGOSSO%' OR UPPER(TRIM(name)) LIKE '%TANIA CRISTINA BEGOSSO%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GGCON' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'tasilva@saude.sp.gov.br',
    phone = '8370'
  WHERE UPPER(TRIM(name)) LIKE '%THIAGO ALMEIDA DA SILVA%';

  -- GPC - GGCON
  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GPC - GGCON' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'eorpheu@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ELENICE ORPHEU%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GPC - GGCON' LIMIT 1),
    role_title = 'Diretor Técnico I',
    email = 'gmsantos@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%GILMAR MARCIANO DOS SANTOS%';

  UPDATE employees SET
    department_id = (SELECT id FROM departments WHERE name = 'GPC - GGCON' LIMIT 1),
    role_title = 'Diretor Técnico II',
    email = 'rsantana@saude.sp.gov.br',
    phone = NULL
  WHERE UPPER(TRIM(name)) LIKE '%ROBERTO CARLOS SANTANA%';

  RAISE NOTICE 'Atualização concluída com sucesso!';

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Verificar resultado
SELECT
  e.name,
  d.name AS setor,
  e.role_title AS cargo,
  e.email,
  e.phone AS ramal
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
WHERE e.department_id IS NOT NULL
ORDER BY d.name, e.name;
