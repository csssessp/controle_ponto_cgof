/**
 * Script para importar funcionários de arquivo CSV do DPM Light
 * Uso: npx tsx import-dpm-light.ts <path-to-csv>
 * 
 * Formato esperado:
 * Registro,Nome,CPF,Email,Telefone,Data Admissão,Cargo
 * 001,ADAN FREIRE PEREIRA,123.456.789-00,adan@email.com,11-99999999,2020-01-15,Colaborador
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DPMLightEmployee {
  Registro: string;
  Nome: string;
  CPF?: string;
  Email?: string;
  Telefone?: string;
  "Data Admissão"?: string;
  Cargo?: string;
}

async function importFromDPMLight(filePath: string) {
  try {
    console.log(`📂 Lendo arquivo: ${filePath}\n`);

    // Validar arquivo
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    // Ler e fazer parse do CSV
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records: DPMLightEmployee[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`📊 ${records.length} funcionários encontrados no arquivo\n`);

    if (records.length === 0) {
      console.log("⚠️  Nenhum funcionário para importar");
      process.exit(0);
    }

    // 1. Garantir organização
    console.log("🏢 Verificando organização...");
    let { data: orgs } = await supabase
      .from("organizations")
      .select("*")
      .limit(1);

    let orgId: string;
    if (!orgs || orgs.length === 0) {
      const { data: newOrg } = await supabase
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
      orgId = newOrg![0].id;
      console.log("✅ Organização criada");
    } else {
      orgId = orgs[0].id;
      console.log("✅ Organização encontrada");
    }

    // 2. Garantir schedule
    console.log("⏰ Verificando jornada...");
    let { data: schedules } = await supabase
      .from("schedules")
      .select("*")
      .eq("name", "Expediente")
      .limit(1);

    let scheduleId: string;
    if (!schedules || schedules.length === 0) {
      const { data: newSchedule } = await supabase
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
      scheduleId = newSchedule![0].id;
      console.log("✅ Jornada criada");
    } else {
      scheduleId = schedules[0].id;
      console.log("✅ Jornada encontrada");
    }

    // 3. Garantir departamento
    console.log("👥 Verificando departamento...");
    let { data: departments } = await supabase
      .from("departments")
      .select("*")
      .eq("name", "Geral")
      .limit(1);

    let departmentId: string;
    if (!departments || departments.length === 0) {
      const { data: newDept } = await supabase
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
      departmentId = newDept![0].id;
      console.log("✅ Departamento criado");
    } else {
      departmentId = departments[0].id;
      console.log("✅ Departamento encontrado");
    }

    // 4. Importar funcionários
    console.log(`\n👤 Importando funcionários...\n`);

    const results = {
      imported: 0,
      duplicated: 0,
      errors: 0,
      errorDetails: [] as string[],
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const nome = record.Nome?.trim() || "SEM NOME";
      const registration = record.Registro?.trim() || String(i + 1).padStart(5, "0");
      const cpf = record.CPF?.trim() || null;
      const email = record.Email?.trim() || null;
      const phone = record.Telefone?.trim() || null;
      const roleTitle = record.Cargo?.trim() || "Colaborador";
      let admissionDate = record["Data Admissão"]?.trim();

      // Validar e converter data de admissão
      if (admissionDate) {
        // Tentar diferentes formatos
        const formats = [
          /^(\d{2})\/(\d{2})\/(\d{4})$/, // dd/mm/yyyy
          /^(\d{4})-(\d{2})-(\d{2})$/, // yyyy-mm-dd
          /^(\d{2})-(\d{2})-(\d{4})$/, // dd-mm-yyyy
        ];

        let isValid = false;
        for (const format of formats) {
          const match = admissionDate.match(format);
          if (match) {
            if (format === formats[0]) {
              // dd/mm/yyyy
              admissionDate = `${match[3]}-${match[2]}-${match[1]}`;
            } else if (format === formats[2]) {
              // dd-mm-yyyy
              admissionDate = `${match[3]}-${match[2]}-${match[1]}`;
            }
            // yyyy-mm-dd já está no formato correto
            isValid = true;
            break;
          }
        }
        if (!isValid) {
          admissionDate = new Date().toISOString().split("T")[0];
        }
      } else {
        admissionDate = new Date().toISOString().split("T")[0];
      }

      // Verificar duplicata
      const { data: existing } = await supabase
        .from("employees")
        .select("id")
        .eq("registration", registration)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️  ${i + 1}/${records.length} ${nome} (registro ${registration} já existe)`);
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
            cpf,
            email,
            phone,
            role_title: roleTitle,
            admission_date: admissionDate,
            organization_id: orgId,
            department_id: departmentId,
            schedule_id: scheduleId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.log(`❌ ${i + 1}/${records.length} ${nome} - ${insertError.message}`);
        results.errors++;
        results.errorDetails.push(`${nome}: ${insertError.message}`);
      } else {
        console.log(`✅ ${i + 1}/${records.length} ${nome}`);
        results.imported++;
      }
    }

    console.log(`\n📊 Resumo da importação:`);
    console.log(`   ✅ Importados: ${results.imported}`);
    console.log(`   ⏭️  Duplicados: ${results.duplicated}`);
    console.log(`   ❌ Erros: ${results.errors}`);

    if (results.errorDetails.length > 0) {
      console.log(`\n⚠️  Erros encontrados:`);
      results.errorDetails.forEach((error) => console.log(`   - ${error}`));
    }

    console.log(`\n🎉 Importação concluída!`);
  } catch (error) {
    console.error("❌ Erro durante importação:", error);
    process.exit(1);
  }
}

// Obter caminho do arquivo do argumento de linha de comando
const filePath = process.argv[2];
if (!filePath) {
  console.error("❌ Uso: npx tsx import-dpm-light.ts <path-to-csv>");
  console.error("\nExemplo:");
  console.error("   npx tsx import-dpm-light.ts funcionarios.csv");
  console.error("\nFormato CSV esperado:");
  console.error("   Registro,Nome,CPF,Email,Telefone,Data Admissão,Cargo");
  process.exit(1);
}

importFromDPMLight(filePath).then(() => process.exit(0));
