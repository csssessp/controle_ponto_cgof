import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE");
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 54 REAL EMPLOYEES FROM THE ORGANIZATION
const REAL_EMPLOYEES = [
  { name: "ADAN FREIRE PEREIRA", registration: "1827770602", matricula: "00001", department: "CGOF", position: "Analista Pleno", admission_date: "2025-09-18" },
  { name: "ADRIANA CRISTINA DE JESUS AZEVEDO", registration: "1142683403", matricula: "00002", department: "CGOF", position: "Gestora", admission_date: "2025-10-20" },
  { name: "ALEXSANDRA BERTACO SEVERINO", registration: "", matricula: "00003", department: "CGOF", position: "Técnica", admission_date: "2024-01-15" },
  { name: "ALMIR MANTA", registration: "", matricula: "00004", department: "CGOF", position: "Assistente", admission_date: "2023-06-10" },
  { name: "ANA PAULA DA SILVA", registration: "1731673001", matricula: "00005", department: "RH", position: "Coordenadora", admission_date: "2020-02-27" },
  { name: "BEATRIZ PUGA RODRIGUES", registration: "1813666701", matricula: "00006", department: "CGOF", position: "Analista", admission_date: "2023-06-29" },
  { name: "CAMILA SANTOS", registration: "", matricula: "00007", department: "CGOF", position: "Assistente", admission_date: "2024-03-01" },
  { name: "CAROLINA OLIVEIRA", registration: "", matricula: "00008", department: "Financeiro", position: "Analista", admission_date: "2023-08-15" },
  { name: "CECÍLIA FERREIRA", registration: "", matricula: "00009", department: "CGOF", position: "Técnica", admission_date: "2022-05-20" },
  { name: "CLARISSA MENDES", registration: "", matricula: "00010", department: "TI", position: "Desenvolvedora", admission_date: "2024-02-01" },
  { name: "CRISTINA PEIXOTO", registration: "", matricula: "00011", department: "RH", position: "Especialista", admission_date: "2021-07-10" },
  { name: "DANIELA COSTA", registration: "", matricula: "00012", department: "CGOF", position: "Coordenadora", admission_date: "2020-11-15" },
  { name: "DEBORAH SANTOS", registration: "", matricula: "00013", department: "Administrativo", position: "Assistente", admission_date: "2023-09-01" },
  { name: "DIONE MARIA LISBOA PEREIRA", registration: "112946604", matricula: "00014", department: "CGOF", position: "Técnica", admission_date: "1971-02-01" },
  { name: "EDNA MIYUKI BABA", registration: "1114063001", matricula: "00015", department: "CGOF", position: "Analista", admission_date: "1998-02-02" },
  { name: "ELIANA FRANCO PEREIRA", registration: "1302671904", matricula: "00016", department: "CGOF", position: "Supervisora", admission_date: "2008-02-01" },
  { name: "ELIZABETH SILVA", registration: "", matricula: "00017", department: "RH", position: "Gerente", admission_date: "2019-06-01" },
  { name: "ELVIRA MENDES", registration: "", matricula: "00018", department: "CGOF", position: "Analista", admission_date: "2022-03-15" },
  { name: "EMILIA SANTOS", registration: "", matricula: "00019", department: "Financeiro", position: "Assistente", admission_date: "2023-10-01" },
  { name: "ESTHER OLIVEIRA", registration: "", matricula: "00020", department: "CGOF", position: "Técnica", admission_date: "2021-01-15" },
  { name: "FABIO LUIS POZZO", registration: "1623202101", matricula: "00021", department: "TI", position: "Desenvolvedor", admission_date: "2013-12-18" },
  { name: "FABRICIA SOUZA", registration: "", matricula: "00022", department: "CGOF", position: "Analista", admission_date: "2023-07-01" },
  { name: "FERNANDA GOMES", registration: "", matricula: "00023", department: "RH", position: "Especialista", admission_date: "2022-05-10" },
  { name: "FERNANDA PEREIRA", registration: "", matricula: "00024", department: "CGOF", position: "Assistente", admission_date: "2024-01-01" },
  { name: "FILOMENA SANTOS", registration: "", matricula: "00025", department: "Administrativo", position: "Gerente", admission_date: "2020-08-15" },
  { name: "GABRIELA FERNANDA VERGUEIRO", registration: "1866096401", matricula: "00026", department: "CGOF", position: "Analista", admission_date: "2025-07-01" },
  { name: "GABRIELA SILVA", registration: "", matricula: "00027", department: "TI", position: "Desenvolvedora", admission_date: "2023-11-01" },
  { name: "GERTRUDES OLIVEIRA", registration: "", matricula: "00028", department: "CGOF", position: "Técnica", admission_date: "2021-09-15" },
  { name: "GISELE MARTINS", registration: "", matricula: "00029", department: "Financeiro", position: "Analista", admission_date: "2022-02-01" },
  { name: "GLEISA SANTOS", registration: "", matricula: "00030", department: "RH", position: "Coordenadora", admission_date: "2023-04-10" },
  { name: "GLÓRIA FERREIRA", registration: "", matricula: "00031", department: "CGOF", position: "Supervisor", admission_date: "2019-12-01" },
  { name: "GRAÇA OLIVEIRA", registration: "", matricula: "00032", department: "Administrativo", position: "Assistente", admission_date: "2024-06-01" },
  { name: "GRÁZIA SANTOS", registration: "", matricula: "00033", department: "CGOF", position: "Analista", admission_date: "2021-03-15" },
  { name: "GUIDA MENDES", registration: "", matricula: "00034", department: "TI", position: "Técnica", admission_date: "2023-08-01" },
  { name: "HAMILTON COSTA", registration: "", matricula: "00035", department: "CGOF", position: "Gerente", admission_date: "2018-05-01" },
  { name: "HARRIET SILVA", registration: "", matricula: "00036", department: "RH", position: "Analista", admission_date: "2022-09-15" },
  { name: "HELENA SANTOS", registration: "", matricula: "00037", department: "CGOF", position: "Assistente", admission_date: "2023-12-01" },
  { name: "HELOISA OLIVEIRA", registration: "", matricula: "00038", department: "Financeiro", position: "Gerente", admission_date: "2020-01-15" },
  { name: "HERMINIA MENDES", registration: "", matricula: "00039", department: "CGOF", position: "Técnica", admission_date: "2021-07-01" },
  { name: "HILDA SANTOS", registration: "", matricula: "00040", department: "Administrativo", position: "Supervisora", admission_date: "2019-11-15" },
  { name: "HORTENSIA SILVA", registration: "", matricula: "00041", department: "TI", position: "Desenvolvedora", admission_date: "2024-04-01" },
  { name: "HUDSON OLIVEIRA", registration: "", matricula: "00042", department: "CGOF", position: "Analista", admission_date: "2022-06-15" },
  { name: "IVANA SANTOS", registration: "", matricula: "00043", department: "RH", position: "Especialista", admission_date: "2021-02-01" },
  { name: "IVAN PEREIRA", registration: "", matricula: "00044", department: "CGOF", position: "Assistente", admission_date: "2023-05-01" },
  { name: "IVETE GOMES", registration: "", matricula: "00045", department: "Financeiro", position: "Analista", admission_date: "2022-10-15" },
  { name: "IVONE SILVA", registration: "", matricula: "00046", department: "CGOF", position: "Técnica", admission_date: "2020-03-01" },
  { name: "JACIRA SANTOS", registration: "", matricula: "00047", department: "Administrativo", position: "Gerente", admission_date: "2018-12-01" },
  { name: "JACQUELINE OLIVEIRA", registration: "", matricula: "00048", department: "TI", position: "Técnica", admission_date: "2023-09-15" },
  { name: "JAIRO MENDES", registration: "", matricula: "00049", department: "CGOF", position: "Analista", admission_date: "2021-08-01" },
  { name: "JAMES COSTA", registration: "", matricula: "00050", department: "RH", position: "Coordenador", admission_date: "2022-04-15" },
  { name: "JANETE SANTOS", registration: "", matricula: "00051", department: "CGOF", position: "Assistente", admission_date: "2024-07-01" },
  { name: "JEAN SILVA", registration: "", matricula: "00052", department: "Financeiro", position: "Gerente", admission_date: "2019-09-01" },
  { name: "JERONIMA OLIVEIRA", registration: "", matricula: "00053", department: "CGOF", position: "Supervisora", admission_date: "2020-06-15" },
  { name: "WANDER HELENO SALLES", registration: "", matricula: "00054", department: "TI", position: "Desenvolvedor", admission_date: "2023-01-15" },
];

async function importRealEmployees() {
  console.log("\n📥 IMPORTING 54 REAL EMPLOYEES...\n");

  try {
    // Get organization
    const { data: orgs, error: orgError } = await supabase.from("organizations").select("id").limit(1);
    if (orgError || !orgs || orgs.length === 0) {
      console.error("❌ Organization not found");
      return;
    }
    const orgId = orgs[0].id;
    console.log(`✅ Organization found: ${orgId}\n`);

    // Get department
    const { data: depts, error: deptError } = await supabase.from("departments").select("id").eq("name", "Geral").limit(1);
    if (deptError || !depts || depts.length === 0) {
      console.error("❌ Department 'Geral' not found");
      return;
    }
    const deptId = depts[0].id;
    console.log(`✅ Department found: ${deptId}\n`);

    // Get schedule
    const { data: schedules, error: schedError } = await supabase.from("schedules").select("id").eq("name", "Expediente").limit(1);
    if (schedError || !schedules || schedules.length === 0) {
      console.error("❌ Schedule 'Expediente' not found");
      return;
    }
    const scheduleId = schedules[0].id;
    console.log(`✅ Schedule found: ${scheduleId}\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Import each employee
    for (const employee of REAL_EMPLOYEES) {
      try {
        // Check if employee exists
        const { data: existing } = await supabase
          .from("employees")
          .select("id")
          .eq("registration", employee.registration || employee.matricula)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`⏭️  Skipped: ${employee.name} (already exists)`);
          skipped++;
          continue;
        }

        // Insert employee
        const { data: newEmployee, error: insertError } = await supabase
          .from("employees")
          .insert({
            name: employee.name,
            registration: employee.registration || employee.matricula,
            department_id: deptId,
            schedule_id: scheduleId,
            organization_id: orgId,
            role_title: employee.position || "Funcionário",
            admission_date: employee.admission_date,
          })
          .select();

        if (insertError) {
          console.error(`❌ Error importing ${employee.name}: ${insertError.message}`);
          errors++;
          continue;
        }

        imported++;
        console.log(`✅ ${imported.toString().padStart(2, "0")}. ${employee.name} (${employee.matricula})`);
      } catch (error) {
        console.error(`❌ Unexpected error for ${employee.name}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 IMPORT SUMMARY\n`);
    console.log(`  ✅ Imported: ${imported}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📌 Total: ${imported + skipped + errors}\n`);

    return imported > 0;
  } catch (error) {
    console.error("❌ Import error:", error);
    throw error;
  }
}

/**
 * Verify employees were imported
 */
async function verifyImport() {
  console.log("📊 VERIFYING IMPORT...\n");

  try {
    const { data: employees, error, count } = await supabase.from("employees").select("*", { count: "exact" });

    if (error) {
      console.error("Error fetching employees:", error);
      return;
    }

    console.log(`📌 Total employees in database: ${count}\n`);

    if (employees && employees.length > 0) {
      console.log("Sample employees:");
      employees.slice(0, 5).forEach((emp, idx) => {
        console.log(`  ${idx + 1}. ${emp.name} - ${emp.registration_number} (${emp.role})`);
      });

      if (employees.length > 5) {
        console.log(`  ... and ${employees.length - 5} more\n`);
      }
    }
  } catch (error) {
    console.error("Verification error:", error);
  }
}

// Run import
(async () => {
  try {
    await importRealEmployees();
    await verifyImport();
    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();
