/**
 * Script para importar funcionários reais do DPM Light
 * Cria um novo banco com os funcionários listados
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Lista de funcionários reais fornecida
const FUNCIONARIOS_REAIS = [
  "ADAN FREIRE PEREIRA",
  "ADRIANA CRISTINA DE JESUS AZEVEDO",
  "ALEXSANDRA BERTACO SEVERINO",
  "ALMIR MANTA",
  "ANA PAULA DA SILVA",
  "ARLETE SHIRLEY PEREIRA DE CARVALHO",
  "BEATRIZ PUGA RODRIGUES",
  "BRUNO MARCELO LOPES SANTOS",
  "CARLA ROSARIA RODRIGUES VAZ TURIANI",
  "CESAR MOREIRA CONSTANTINO",
  "CLAUDENICE DA SILVA",
  "CLEBER FARIAS DOS SANTOS",
  "CLEMILSON SANTOS COBRA",
  "CONCEIÇÃO APARECIDA PANISSI MARTINS",
  "DARIO BESSELER",
  "DIEGO BARBOSA DOS SANTOS",
  "DIONE MARIA LISBOA PEREIRA",
  "EDNA MIYUKI BABA",
  "ELENICE ORPHEU ALVES DE SOUZA",
  "ELIANA FRANCO PEREIRA",
  "ELZA TATSUO SAMECIMA",
  "EUNICE BRASILEIRO",
  "FÁBIO LUÍS POZZO",
  "FERNANDA DA SILVA E SOUZA",
  "FERNANDO CESAR BARBOZA",
  "GABRIELA FERNANDA VERGUEIRO",
  "GABRIELA PICCARDI GONZALES",
  "GILMAR MARCIANO DOS SANTOS",
  "JOÃO CARLOS FERREIRA DE SOUZA",
  "JOMARA SIMÕES DOS SANTOS",
  "JOSÉ LUIZ DOS SANTOS MOREIRA",
  "JOSE ROMÃO BATISTA",
  "KAREN DE OLIVEIRA DELFINO",
  "LUIZ CARLOS BAZALIA DOS SANTOS",
  "MAGDA DE CAMPOS",
  "MARCELO DA SILVA GASPAR",
  "MARILDA APARECIDA DA SILVA VELOSO",
  "MARILSA DA SILVA E SILVA",
  "MARISTELA APARECIDA RAPHAEL",
  "MARTA CONCEIÇÃO DE MOURA",
  "MARTA DE ALMEIDA GOMES GUNTHER",
  "MATEUS RIBEIRO DA SILVA",
  "NORMA SUELY FERREIRA SOUZA AMERICO",
  "RENATO ESPIRITO SANTO DIAS TATIT",
  "ROBERTO CARLOS SANTANA",
  "RONALDO HILÁRIO DOS SANTOS",
  "ROSELI APARECIDA RODRIGUES COLOMBO",
  "SILVIA MARIA ROCHA",
  "SUSANA SERAFIM CIRINO",
  "TÂNIA CRISTINA BEGOSSO",
  "TATIANA DE CARVALHO COSTA LOSCHER",
  "THAIS CRISTINA NASCIMENTO BARBOSA",
  "THIAGO ALMEIDA DA SILVA",
  "WANDER HELENO SALLES",
];

async function importEmployees() {
  try {
    console.log(`📥 Importando ${FUNCIONARIOS_REAIS.length} funcionários reais...\n`);

    // 1. Garantir que existe uma organização padrão
    console.log("🏢 Verificando organização...");
    let { data: orgs } = await supabase
      .from("organizations")
      .select("*")
      .limit(1);

    let orgId: string;
    if (!orgs || orgs.length === 0) {
      const { data: newOrg, error } = await supabase
        .from("organizations")
        .insert([
          {
            name: "Empresa",
            cnpj: "00.000.000/0000-00",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();
      if (error) throw error;
      orgId = newOrg![0].id;
      console.log("✅ Organização criada:", orgId);
    } else {
      orgId = orgs[0].id;
      console.log("✅ Organização encontrada:", orgId);
    }

    // 2. Criar schedule padrão
    console.log("\n⏰ Verificando jornada padrão...");
    let { data: schedules } = await supabase
      .from("schedules")
      .select("*")
      .eq("name", "Expediente")
      .limit(1);

    let scheduleId: string;
    if (!schedules || schedules.length === 0) {
      const { data: newSchedule, error } = await supabase
        .from("schedules")
        .insert([
          {
            name: "Expediente",
            description: "Jornada padrão 8 horas",
            expected_work: 480,
            start_time: "08:00:00",
            end_time: "17:00:00",
            interval_start: "12:00:00",
            interval_end: "13:00:00",
            work_days: [1, 2, 3, 4, 5],
            tolerance: 600,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();
      if (error) throw error;
      scheduleId = newSchedule![0].id;
      console.log("✅ Jornada criada:", scheduleId);
    } else {
      scheduleId = schedules[0].id;
      console.log("✅ Jornada encontrada:", scheduleId);
    }

    // 3. Criar department padrão
    console.log("\n👥 Verificando departamento...");
    let { data: departments } = await supabase
      .from("departments")
      .select("*")
      .eq("name", "Geral")
      .limit(1);

    let departmentId: string;
    if (!departments || departments.length === 0) {
      const { data: newDept, error } = await supabase
        .from("departments")
        .insert([
          {
            name: "Geral",
            organization_id: orgId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();
      if (error) throw error;
      departmentId = newDept![0].id;
      console.log("✅ Departamento criado:", departmentId);
    } else {
      departmentId = departments[0].id;
      console.log("✅ Departamento encontrado:", departmentId);
    }

    // 4. Importar funcionários
    console.log(`\n👤 Importando ${FUNCIONARIOS_REAIS.length} funcionários...\n`);

    const results = {
      imported: 0,
      duplicated: 0,
      errors: 0,
    };

    for (let i = 0; i < FUNCIONARIOS_REAIS.length; i++) {
      const nome = FUNCIONARIOS_REAIS[i];
      const registration = String(i + 1).padStart(5, "0");

      // Verificar duplicata
      const { data: existing } = await supabase
        .from("employees")
        .select("id")
        .eq("name", nome)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️  ${i + 1}/${FUNCIONARIOS_REAIS.length} ${nome} (já existe)`);
        results.duplicated++;
        continue;
      }

      // Criar funcionário
      const { error: insertError } = await supabase
        .from("employees")
        .insert([
          {
            name: nome,
            registration,
            cpf: null,
            email: null,
            phone: null,
            role_title: "Colaborador",
            admission_date: new Date().toISOString().split("T")[0],
            organization_id: orgId,
            department_id: departmentId,
            schedule_id: scheduleId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.log(`❌ ${i + 1}/${FUNCIONARIOS_REAIS.length} ${nome} - Erro`);
        results.errors++;
      } else {
        console.log(`✅ ${i + 1}/${FUNCIONARIOS_REAIS.length} ${nome}`);
        results.imported++;
      }
    }

    console.log(`\n📊 Resumo da importação:`);
    console.log(`   ✅ Importados: ${results.imported}`);
    console.log(`   ⏭️  Duplicados: ${results.duplicated}`);
    console.log(`   ❌ Erros: ${results.errors}`);
    console.log(`\n🎉 Importação concluída!`);
  } catch (error) {
    console.error("❌ Erro durante importação:", error);
    process.exit(1);
  }
}

importEmployees().then(() => process.exit(0));
