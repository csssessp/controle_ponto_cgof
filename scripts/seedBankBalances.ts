process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://yhwiertvbkeirvlieuag.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlod2llcnR2YmtlaXJ2bGlldWFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzNzMzMCwiZXhwIjoyMDkzNzEzMzMwfQ.EQ1ouVv076Rj_QcepmsXrhVtXuauEjQT2fidDBsiWDM";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
function parseMinutes(t: string): number {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  return (p[0]??0)*60 + (p[1]??0);
}
const TODAY = "2026-05-08";
const ROWS: {id:string;name:string;time:string;sign:1|-1}[] = [
  {id:"f340a6b1-7798-4b2e-9192-ba8976d19127",name:"ALEXSANDRA BERTACO SEVERINO",time:"19:11",sign:-1},
  {id:"f21651c5-d87e-478b-adba-64f696c5302e",name:"ALMIR MANTA",time:"30:01",sign:-1},
  {id:"fa3fc046-5c0d-4999-a97a-1507c0d5f4f7",name:"BRUNO MARCELO LOPES SANTOS",time:"11:38",sign:-1},
  {id:"28b04ae2-d8dd-4324-b664-f46197d87f70",name:"CLEMILSON SANTOS COBRAS",time:"78:42",sign:-1},
  {id:"16ae9ceb-2e6c-4d01-9fc9-c2949381b87d",name:"CONCEICAO APARECIDA PANISSI",time:"95:36",sign:-1},
  {id:"ae91fc86-0ac1-4603-9246-d02bea9dac3c",name:"Dario Besseler",time:"23:21",sign:-1},
  {id:"57c01842-459d-4e78-9691-3c0190be8342",name:"DIEGO BARBOSA DOS SANTOS",time:"32:46",sign:-1},
  {id:"98b53364-7d33-4096-b841-1ad1d3788f9f",name:"Eunice Brasileiro",time:"5:31",sign:-1},
  {id:"573beac7-fe71-45ac-b538-1b8982d02eba",name:"GABRIELA PICCARDI GONZALES",time:"6:00",sign:-1},
  {id:"d83840f9-8462-48fe-97eb-28ca414b3d2f",name:"KAREN DE OLIVEIRA DELFINO",time:"23:20",sign:1},
  {id:"382d7057-161c-422d-be0a-1bb2cfd217ac",name:"Magda de Campos",time:"21:36",sign:1},
  {id:"a6bdef3e-05b4-4305-8ef4-d68b9e71ff0d",name:"MARCELO DA SILVA GASPAR",time:"47:13",sign:1},
  {id:"3aa176b2-0d8b-4bbc-9384-da2182c0e5b0",name:"Marilda Aparecida da Silva Veloso",time:"21:08",sign:1},
  {id:"222ea051-ee9e-4ed3-aaaf-2f6fe812eb98",name:"MARISTELA APARECIDA RAPHAEL",time:"18:31",sign:1},
  {id:"709bc706-76bb-4c71-b349-12bb135f70b2",name:"Marta de Almeida Gomes",time:"0:50",sign:1},
  {id:"2580b42d-4eb5-446b-98bf-1e35b43a66d9",name:"RONALDO HILARIO DOS SANTOS",time:"12:23",sign:1},
  {id:"b32c6fda-8308-4cc2-850d-9c9f9271fbc5",name:"ROSELI APARECIDA RODRIGUES COLOMBO",time:"39:18",sign:1},
  {id:"67d21358-265e-4ec3-93f9-234fbcab9ea9",name:"ADAN FREIRE PEREIRA",time:"32:07",sign:1},
  {id:"8b683f7c-efda-4540-8309-d6fc4c774bfb",name:"ADRIANA CRISTINA DE JESUS AZEVEDO",time:"13:42",sign:1},
  {id:"8e8c4c9a-1dd4-48a6-b1d8-8f4532e340a8",name:"ANA PAULA DA SILVA",time:"8:47",sign:1},
  {id:"ef07e0d1-99b5-455a-9554-f5806dc7da07",name:"ARLETE SHIRLEY PEREIRA DE CARVALHO",time:"31:44",sign:1},
  {id:"7797faf5-cd8d-4113-9733-e0c0a6eef44b",name:"BEATRIZ PUGA RODRIGUES",time:"6:49",sign:1},
  {id:"9cd7871c-5b86-45bc-9c8d-27264eac7076",name:"CESAR MOREIRA CONSTANTINO",time:"32:53",sign:1},
  {id:"93a44897-a0ed-4186-8b31-0be34a163674",name:"CLAUDENICE DA SILVA",time:"5:45",sign:1},
  {id:"720d4c90-3124-4b1a-b3d9-4fc2727e6225",name:"CLEBER FARIAS DOS SANTOS",time:"100:16",sign:1},
  {id:"1e6665c8-b20d-4d9c-958f-23f4874fac2e",name:"DIONE MARIA LISBOA PEREIRA",time:"0:23",sign:1},
  {id:"e1f9546b-925d-4109-964a-e8bb090dc849",name:"EDNA MIYUKI BABA",time:"642:35",sign:1},
  {id:"5655ab3d-4f9e-4f7b-8d25-0e1d812134e9",name:"ELENICE ORPHEU ALVES DE SOUZA",time:"2:43",sign:1},
  {id:"fd405e27-dac4-499a-9961-1954c9939420",name:"ELIANA FRANCO PEREIRA",time:"16:55",sign:1},
  {id:"6023955b-0ca9-4482-bf2c-e0a6e313bca5",name:"ELZA TATSUO SAMECIMA",time:"168:58",sign:1},
  {id:"1734fa53-0bad-48a2-ba9b-86ced598f177",name:"FABIO LUIS POZZO",time:"171:01",sign:1},
  {id:"34e92c1e-baa3-4e4a-bb2b-62b39a375a0f",name:"FERNANDA DA SILVA E SOUZA",time:"3:08",sign:1},
  {id:"5aab657e-dc59-49ab-b45c-a69805ac466d",name:"FERNANDO CESAR BARBOZA",time:"3:01",sign:1},
  {id:"dd7b8592-6e7b-4554-8d77-1641ebd65098",name:"GABRIELA FERNANDA VERGUEIRO",time:"20:07",sign:1},
  {id:"a028ae7c-c769-4c72-aa5a-b670d4b29a75",name:"GILMAR MARCIANO DOS SANTOS",time:"18:20",sign:1},
  {id:"0c54a3c7-dad7-4395-8454-150d1b62c0dd",name:"JOAO CARLOS FERREIRA DE SOUZA",time:"23:01",sign:1},
  {id:"e3c1570b-99aa-438e-a4f6-0bb91dc446e9",name:"JOMARA SIMOES DOS SANTOS",time:"7:21",sign:1},
  {id:"4d52cb8b-0ab7-44b0-bce9-037089da1c26",name:"JOSE LUIZ DOS SANTOS MOREIRA",time:"5:06",sign:1},
  {id:"e9c12bcd-7cc2-46f8-8183-b55b9fe91dcc",name:"JOSE ROMAO BATISTA",time:"14:58",sign:1},
  {id:"19a420f5-f6b5-4ee0-8147-18d6d57b0446",name:"LUIZ CARLOS BAZALIA DOS SANTOS",time:"84:34",sign:1},
  {id:"15aff5f0-133a-4cc1-b7db-68bb45a74d23",name:"MARILSA DA SILVA E SILVA",time:"8:37",sign:1},
  {id:"77796ed7-49eb-4fc6-9477-6ef6263e5931",name:"MARTA CONCEICAO DE MOURA",time:"110:08",sign:1},
  {id:"dba76c85-7ec9-4c80-9c37-10af62dafdc3",name:"MATEUS RIBERO DA SILVA",time:"60:28",sign:1},
  {id:"98d56b40-90c2-41ab-8e49-e4c6d85e95f5",name:"Norma Suely Ferreira Souza Ameico",time:"854:23",sign:1},
  {id:"f9655586-b7a4-44f0-90ec-bfa68e04f090",name:"RENATO ESPIRITO SANTO D TATIT",time:"10:32",sign:1},
  {id:"20c5acd9-c3c1-406e-806d-4c0d04c19641",name:"ROBERTO CARLOS SANTANA",time:"9:09",sign:1},
  {id:"aa1870dc-d053-448f-b903-f17631974c2e",name:"SILVIA MARIA ROCHA",time:"6:44",sign:1},
  {id:"b01cd4bd-7a5d-4474-9b16-503f601aabd2",name:"SUSANA SERAFIM CIRINO",time:"30:45",sign:1},
  {id:"8f3a2a9c-b39d-4d7d-8896-fd7e7f02614e",name:"TANIA CRISTINA BEGOSSO",time:"73:36",sign:1},
  {id:"684d59f5-9901-4f38-a228-711aa7ac6b7d",name:"TATIANA DE CARVALHO DA COSTA LOSCHER",time:"0:00",sign:1},
  {id:"4768eb9c-de44-493d-a886-a7eafbbee98c",name:"THAIS CRISTINA NASCIMENTO BARBOSA",time:"23:31",sign:1},
  {id:"28fabce1-c77c-4fd5-a9b8-8ca397ab80b7",name:"Thiago Almeida da Silva",time:"9:58",sign:1},
  {id:"5eaba6ec-08e6-4248-86a1-0ab80247f4c0",name:"WANDER HELENO SALLES",time:"27:23",sign:1},
];
async function main() {
  let ok=0, fail=0;
  for (const row of ROWS) {
    const minutes = parseMinutes(row.time) * row.sign;
    const { error: de } = await supabase.from("time_bank_entries").delete().eq("employee_id", row.id);
    if (de) { console.error(`✗ DEL [${row.name}]: ${de.message}`); fail++; continue; }
    if (minutes === 0) { console.log(`○  ${row.name.padEnd(45)} (zero — cleared)`); ok++; continue; }
    const { error: ie } = await supabase.from("time_bank_entries").insert({
      employee_id: row.id, minutes, date: TODAY,
      description: "Saldo inicial banco de horas",
      type: minutes >= 0 ? "credit" : "debit",
    });
    if (ie) { console.error(`✗ INS [${row.name}]: ${ie.message}`); fail++; continue; }
    const a=Math.abs(minutes), h=Math.floor(a/60), m=a%60;
    console.log(`✓  ${row.name.padEnd(45)} ${minutes<0?"-":"+"}${String(h).padStart(3,"0")}:${String(m).padStart(2,"0")}`);
    ok++;
  }
  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
  if (fail>0) process.exit(1);
}
main();
