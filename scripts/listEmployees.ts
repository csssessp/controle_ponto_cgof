process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://yhwiertvbkeirvlieuag.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlod2llcnR2YmtlaXJ2bGlldWFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzNzMzMCwiZXhwIjoyMDkzNzEzMzMwfQ.EQ1ouVv076Rj_QcepmsXrhVtXuauEjQT2fidDBsiWDM"
);

const { data, error } = await sb.from("employees").select("id, name").order("name");
if (error) { console.error("Error:", error); process.exit(1); }
console.log(`Found ${data?.length} employees:`);
for (const e of data ?? []) console.log(` ${e.id}  |  ${e.name}`);
