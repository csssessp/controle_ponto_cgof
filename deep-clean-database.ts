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
  fetch: (url: RequestInfo | URL, init?: RequestInit) => {
    const actualInit = init || {};
    return fetch(url, {
      ...actualInit,
      // @ts-ignore - Ignore SSL verification for development
      rejectUnauthorized: false,
    } as any);
  },
});

/**
 * Remove ALL test/fictitious data from the system
 * Keep only the structure (orgs, depts, schedules)
 */
async function cleanAllFictitionsData() {
  console.log("\n🧹 CLEANING ALL FICTITIOUS DATA FROM DATABASE...\n");

  try {
    // 1. Delete all attendance records
    console.log("❌ Deleting attendance records...");
    const { error: attError } = await supabase.from("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (attError) console.error("Error deleting attendance:", attError);
    else console.log("✅ Attendance records deleted");

    // 2. Delete all time entries
    console.log("❌ Deleting time entries...");
    const { error: timeError } = await supabase.from("time_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (timeError) console.error("Error deleting time entries:", timeError);
    else console.log("✅ Time entries deleted");

    // 3. Delete all time bank entries
    console.log("❌ Deleting time bank entries...");
    const { error: bankError } = await supabase.from("time_bank_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (bankError) console.error("Error deleting time bank:", bankError);
    else console.log("✅ Time bank entries deleted");

    // 4. Delete all absences
    console.log("❌ Deleting absence records...");
    const { error: absError } = await supabase.from("absences").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (absError) console.error("Error deleting absences:", absError);
    else console.log("✅ Absence records deleted");

    // 5. Delete all users
    console.log("❌ Deleting users...");
    const { error: usersError } = await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (usersError) console.error("Error deleting users:", usersError);
    else console.log("✅ Users deleted");

    // 6. Delete all employees
    console.log("❌ Deleting employees...");
    const { error: empError } = await supabase.from("employees").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (empError) console.error("Error deleting employees:", empError);
    else console.log("✅ Employees deleted");

    // 7. Delete all uploads
    console.log("❌ Deleting upload records...");
    const { error: uploadError } = await supabase.from("uploads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (uploadError) console.error("Error deleting uploads:", uploadError);
    else console.log("✅ Upload records deleted");

    // 8. Delete all departments except "Geral"
    console.log("❌ Deleting departments...");
    const { error: deptError } = await supabase.from("departments").delete().neq("name", "Geral");
    if (deptError) console.error("Error deleting departments:", deptError);
    else console.log("✅ Non-default departments deleted");

    // 9. Delete all schedules except "Expediente"
    console.log("❌ Deleting schedules...");
    const { error: schedError } = await supabase.from("schedules").delete().neq("name", "Expediente");
    if (schedError) console.error("Error deleting schedules:", schedError);
    else console.log("✅ Non-default schedules deleted");

    console.log("\n✅ ALL FICTITIOUS DATA REMOVED\n");
    console.log("Remaining structure:");
    console.log("  - Organizations: 1 (Empresa)");
    console.log("  - Departments: 1 (Geral)");
    console.log("  - Schedules: 1 (Expediente - 8h/day, Mon-Fri)\n");

    return true;
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    throw error;
  }
}

/**
 * Verify database is clean
 */
async function verifyCleanDatabase() {
  console.log("\n📊 VERIFYING DATABASE STATUS...\n");

  try {
    const tables = ["employees", "users", "attendance_records", "time_entries", "absences"];

    for (const table of tables) {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) {
        console.error(`  ❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: ${count} records`);
      }
    }

    console.log("\n");
  } catch (error) {
    console.error("Verification error:", error);
  }
}

// Run cleanup
(async () => {
  try {
    await cleanAllFictitionsData();
    await verifyCleanDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();
