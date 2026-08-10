/* ═══════════════════════════════════════════════════════════════════════════
   Dados históricos oficiais do Projeto PIN — planilha "PIN - Horas Area 2026.xlsx"
   Fonte única de verdade para Jan–Jul/2026 (meses "congelados").
   Consumido por PinProject.tsx, TimeCard.tsx e Reports.tsx.

   NOTA: a planilha só guarda o VALOR ABSOLUTO de "Saldo do Mês"/"Saldo Acumulado"
   (o Excel não formata durações negativas). O sinal real de cada saldo acumulado
   foi reconstruído comparando a magnitude armazenada em cada mês com a magnitude
   do mês anterior ± o delta relatado, e faz sentido com o padrão de cores/sinais
   já validado manualmente para Jan–Mai em uma sessão anterior. `saldoMes` abaixo
   é o delta assinado já recalculado (saldoAcum[n] − saldoAcum[n−1]).
   ═══════════════════════════════════════════════════════════════════════════ */

export type PinMonthAbbr = "JAN" | "FEV" | "MAR" | "ABR" | "MAI" | "JUN" | "JUL";

export type PinMonthData = {
  worked: number | null;    // minutos trabalhados extra no mês (coluna da planilha)
  saldoMes: number | null;  // delta assinado aplicado ao saldo acumulado
  saldoAcum: number | null; // saldo acumulado (com sinal correto)
};

export type PinHistoricalEntry = {
  nome: string;
  pin: boolean;
  saldoDez: number | null;
  months: Record<PinMonthAbbr, PinMonthData>;
};

export const PIN_HISTORICAL: PinHistoricalEntry[] = [
  { nome: "ADAN FREIRE PEREIRA", pin: true, saldoDez: 867, months: { JAN:{worked:2949,saldoMes:549,saldoAcum:1416}, FEV:{worked:2508,saldoMes:108,saldoAcum:1524}, MAR:{worked:3085,saldoMes:685,saldoAcum:2209}, ABR:{worked:2598,saldoMes:-282,saldoAcum:1927}, MAI:{worked:2831,saldoMes:431,saldoAcum:2358}, JUN:{worked:2876,saldoMes:-4,saldoAcum:2354}, JUL:{worked:1561,saldoMes:-1319,saldoAcum:1035} } },
  { nome: "ADRIANA CRISTINA DE JESUS AZEVEDO", pin: true, saldoDez: 427, months: { JAN:{worked:2455,saldoMes:55,saldoAcum:482}, FEV:{worked:2445,saldoMes:45,saldoAcum:527}, MAR:{worked:2980,saldoMes:580,saldoAcum:1107}, ABR:{worked:2595,saldoMes:-165,saldoAcum:942}, MAI:{worked:2599,saldoMes:199,saldoAcum:1141}, JUN:{worked:2939,saldoMes:44,saldoAcum:1185}, JUL:{worked:2923,saldoMes:163,saldoAcum:1348} } },
  { nome: "ANA PAULA DA SILVA", pin: true, saldoDez: 277, months: { JAN:{worked:2537,saldoMes:137,saldoAcum:414}, FEV:{worked:2432,saldoMes:32,saldoAcum:446}, MAR:{worked:2885,saldoMes:485,saldoAcum:931}, ABR:{worked:1422,saldoMes:-1458,saldoAcum:-527}, MAI:{worked:2768,saldoMes:368,saldoAcum:-159}, JUN:{worked:2824,saldoMes:-56,saldoAcum:-215}, JUL:{worked:2966,saldoMes:86,saldoAcum:-129} } },
  { nome: "ELIANA FRANCO PEREIRA", pin: true, saldoDez: 123, months: { JAN:{worked:1448,saldoMes:-952,saldoAcum:-829}, FEV:{worked:2480,saldoMes:80,saldoAcum:-749}, MAR:{worked:3037,saldoMes:637,saldoAcum:-112}, ABR:{worked:1977,saldoMes:-903,saldoAcum:-1015}, MAI:{worked:3132,saldoMes:732,saldoAcum:-283}, JUN:{worked:2800,saldoMes:-80,saldoAcum:-363}, JUL:{worked:2634,saldoMes:-246,saldoAcum:-609} } },
  { nome: "GABRIELA FERNANDA VERGUEIRO", pin: true, saldoDez: 1438, months: { JAN:{worked:2125,saldoMes:-275,saldoAcum:1163}, FEV:{worked:2486,saldoMes:86,saldoAcum:1249}, MAR:{worked:2920,saldoMes:520,saldoAcum:1769}, ABR:{worked:2318,saldoMes:-562,saldoAcum:1207}, MAI:{worked:2633,saldoMes:233,saldoAcum:1440}, JUN:{worked:2650,saldoMes:-230,saldoAcum:1210}, JUL:{worked:2692,saldoMes:-188,saldoAcum:1022} } },
  { nome: "SUSANA SERAFIM CIRINO", pin: true, saldoDez: 874, months: { JAN:{worked:2506,saldoMes:106,saldoAcum:980}, FEV:{worked:2984,saldoMes:584,saldoAcum:1564}, MAR:{worked:3047,saldoMes:647,saldoAcum:2211}, ABR:{worked:2514,saldoMes:-366,saldoAcum:1845}, MAI:{worked:2072,saldoMes:-328,saldoAcum:1517}, JUN:{worked:2740,saldoMes:-140,saldoAcum:1377}, JUL:{worked:3445,saldoMes:565,saldoAcum:1942} } },
  { nome: "TATIANA DE CARVALHO COSTA LOSCHER", pin: true, saldoDez: null, months: { JAN:{worked:2058,saldoMes:342,saldoAcum:342}, FEV:{worked:2396,saldoMes:4,saldoAcum:346}, MAR:{worked:2552,saldoMes:-152,saldoAcum:194}, ABR:{worked:1057,saldoMes:1343,saldoAcum:1537}, MAI:{worked:1739,saldoMes:661,saldoAcum:2198}, JUN:{worked:3780,saldoMes:-900,saldoAcum:1298}, JUL:{worked:2615,saldoMes:265,saldoAcum:1563} } },
  { nome: "BEATRIZ PUGA RODRIGUES", pin: true, saldoDez: 165, months: { JAN:{worked:2369,saldoMes:-31,saldoAcum:134}, FEV:{worked:2436,saldoMes:36,saldoAcum:170}, MAR:{worked:2145,saldoMes:-255,saldoAcum:-85}, ABR:{worked:2556,saldoMes:-324,saldoAcum:-409}, MAI:{worked:2405,saldoMes:5,saldoAcum:-404}, JUN:{worked:2796,saldoMes:-84,saldoAcum:-488}, JUL:{worked:2962,saldoMes:82,saldoAcum:-406} } },
  { nome: "DIONE MARIA LISBOA PEREIRA", pin: true, saldoDez: 1972, months: { JAN:{worked:2174,saldoMes:-226,saldoAcum:1746}, FEV:{worked:2085,saldoMes:-315,saldoAcum:1431}, MAR:{worked:2500,saldoMes:100,saldoAcum:1531}, ABR:{worked:1372,saldoMes:-1508,saldoAcum:23}, MAI:{worked:2158,saldoMes:-242,saldoAcum:-219}, JUN:{worked:5968,saldoMes:3088,saldoAcum:2869}, JUL:{worked:4051,saldoMes:1171,saldoAcum:4040} } },
  { nome: "FÁBIO LUÍS POZZO", pin: true, saldoDez: 11169, months: { JAN:{worked:1232,saldoMes:-1168,saldoAcum:10001}, FEV:{worked:2775,saldoMes:375,saldoAcum:10376}, MAR:{worked:3285,saldoMes:885,saldoAcum:11261}, ABR:{worked:1930,saldoMes:-950,saldoAcum:10311}, MAI:{worked:3162,saldoMes:762,saldoAcum:11073}, JUN:{worked:3364,saldoMes:484,saldoAcum:11557}, JUL:{worked:1853,saldoMes:-1027,saldoAcum:10530} } },
  { nome: "GABRIELA PICCARDI GONZALES", pin: false, saldoDez: 900, months: { JAN:{worked:18,saldoMes:-18,saldoAcum:882}, FEV:{worked:81,saldoMes:-81,saldoAcum:801}, MAR:{worked:24,saldoMes:-24,saldoAcum:777}, ABR:{worked:63,saldoMes:-417,saldoAcum:360}, MAI:{worked:228,saldoMes:-228,saldoAcum:132}, JUN:{worked:134,saldoMes:-346,saldoAcum:-214}, JUL:{worked:408,saldoMes:408,saldoAcum:194} } },
  { nome: "ROSELI APARECIDA RODRIGUES COLOMBO", pin: false, saldoDez: 619, months: { JAN:{worked:454,saldoMes:454,saldoAcum:1073}, FEV:{worked:764,saldoMes:764,saldoAcum:1837}, MAR:{worked:564,saldoMes:564,saldoAcum:2401}, ABR:{worked:437,saldoMes:-43,saldoAcum:2358}, MAI:{worked:688,saldoMes:688,saldoAcum:3046}, JUN:{worked:573,saldoMes:93,saldoAcum:3139}, JUL:{worked:328,saldoMes:-152,saldoAcum:2987} } },
  { nome: "ALMIR MANTA", pin: false, saldoDez: null, months: { JAN:{worked:948,saldoMes:948,saldoAcum:948}, FEV:{worked:562,saldoMes:562,saldoAcum:1510}, MAR:{worked:195,saldoMes:195,saldoAcum:1705}, ABR:{worked:576,saldoMes:96,saldoAcum:1801}, MAI:{worked:218,saldoMes:218,saldoAcum:2019}, JUN:{worked:287,saldoMes:-193,saldoAcum:1826}, JUL:{worked:469,saldoMes:-11,saldoAcum:1815} } },
  { nome: "CARLA ROSARIA RODRIGUES VAZ TURIANI", pin: false, saldoDez: null, months: { JAN:{worked:0,saldoMes:0,saldoAcum:0}, FEV:{worked:396,saldoMes:396,saldoAcum:396}, MAR:{worked:452,saldoMes:452,saldoAcum:848}, ABR:{worked:142,saldoMes:-338,saldoAcum:510}, MAI:{worked:146,saldoMes:146,saldoAcum:656}, JUN:{worked:177,saldoMes:-303,saldoAcum:353}, JUL:{worked:125,saldoMes:-351,saldoAcum:2} } },
  { nome: "MAGDA DE CAMPOS", pin: false, saldoDez: null, months: { JAN:{worked:1921,saldoMes:1921,saldoAcum:1921}, FEV:{worked:1179,saldoMes:1179,saldoAcum:3100}, MAR:{worked:1395,saldoMes:1395,saldoAcum:4495}, ABR:{worked:888,saldoMes:-3079,saldoAcum:1416}, MAI:{worked:1311,saldoMes:1311,saldoAcum:2727}, JUN:{worked:1491,saldoMes:1131,saldoAcum:3858}, JUL:{worked:1607,saldoMes:1247,saldoAcum:5105} } },
  { nome: "MARILDA APARECIDA DA SILVA VELOSO", pin: false, saldoDez: null, months: { JAN:{worked:1255,saldoMes:1255,saldoAcum:1255}, FEV:{worked:819,saldoMes:819,saldoAcum:2074}, MAR:{worked:728,saldoMes:728,saldoAcum:2802}, ABR:{worked:874,saldoMes:-1414,saldoAcum:1388}, MAI:{worked:914,saldoMes:914,saldoAcum:2302}, JUN:{worked:103,saldoMes:-257,saldoAcum:2045}, JUL:{worked:730,saldoMes:370,saldoAcum:2415} } },
  { nome: "MARTA DE ALMEIDA GOMES GUNTHER", pin: false, saldoDez: null, months: { JAN:{worked:46,saldoMes:46,saldoAcum:46}, FEV:{worked:193,saldoMes:193,saldoAcum:239}, MAR:{worked:186,saldoMes:186,saldoAcum:425}, ABR:{worked:5,saldoMes:-355,saldoAcum:70}, MAI:{worked:552,saldoMes:552,saldoAcum:622}, JUN:{worked:413,saldoMes:53,saldoAcum:675}, JUL:{worked:264,saldoMes:-96,saldoAcum:579} } },
  { nome: "MARCELO DA SILVA GASPAR", pin: false, saldoDez: 561, months: { JAN:{worked:833,saldoMes:833,saldoAcum:1394}, FEV:{worked:576,saldoMes:576,saldoAcum:1970}, MAR:{worked:599,saldoMes:930,saldoAcum:2900}, ABR:{worked:413,saldoMes:-67,saldoAcum:2833}, MAI:{worked:134,saldoMes:134,saldoAcum:2967}, JUN:{worked:348,saldoMes:-132,saldoAcum:2835}, JUL:{worked:483,saldoMes:3,saldoAcum:2838} } },
  { nome: "NORMA SUELY FERREIRA SOUZA AMERICO", pin: true, saldoDez: 43720, months: { JAN:{worked:4610,saldoMes:2210,saldoAcum:45930}, FEV:{worked:4106,saldoMes:1706,saldoAcum:47636}, MAR:{worked:4663,saldoMes:2263,saldoAcum:49899}, ABR:{worked:4244,saldoMes:1484,saldoAcum:51383}, MAI:{worked:4369,saldoMes:1969,saldoAcum:53352}, JUN:{worked:4586,saldoMes:1826,saldoAcum:55178}, JUL:{worked:4443,saldoMes:1683,saldoAcum:56861} } },
  { nome: "SILVIA MARIA ROCHA", pin: true, saldoDez: 1704, months: { JAN:{worked:2442,saldoMes:42,saldoAcum:1746}, FEV:{worked:2275,saldoMes:-125,saldoAcum:1621}, MAR:{worked:1689,saldoMes:-711,saldoAcum:910}, ABR:{worked:2374,saldoMes:-506,saldoAcum:404}, MAI:{worked:2559,saldoMes:159,saldoAcum:563}, JUN:{worked:2628,saldoMes:-252,saldoAcum:311}, JUL:{worked:2787,saldoMes:-93,saldoAcum:218} } },
  { nome: "BRUNO MARCELO LOPES SANTOS", pin: false, saldoDez: null, months: { JAN:{worked:null,saldoMes:null,saldoAcum:null}, FEV:{worked:null,saldoMes:null,saldoAcum:null}, MAR:{worked:null,saldoMes:null,saldoAcum:null}, ABR:{worked:1178,saldoMes:698,saldoAcum:698}, MAI:{worked:1720,saldoMes:1720,saldoAcum:2418}, JUN:{worked:362,saldoMes:-118,saldoAcum:2300}, JUL:{worked:976,saldoMes:496,saldoAcum:2796} } },
  { nome: "CLEMILSON SANTOS COBRA", pin: true, saldoDez: null, months: { JAN:{worked:1192,saldoMes:1192,saldoAcum:1192}, FEV:{worked:1318,saldoMes:1318,saldoAcum:2510}, MAR:{worked:656,saldoMes:656,saldoAcum:3166}, ABR:{worked:2036,saldoMes:1556,saldoAcum:4722}, MAI:{worked:1021,saldoMes:1021,saldoAcum:5743}, JUN:{worked:4668,saldoMes:1788,saldoAcum:7531}, JUL:{worked:1341,saldoMes:861,saldoAcum:8392} } },
  { nome: "DARIO BESSELER", pin: false, saldoDez: null, months: { JAN:{worked:507,saldoMes:507,saldoAcum:507}, FEV:{worked:181,saldoMes:181,saldoAcum:688}, MAR:{worked:493,saldoMes:493,saldoAcum:1181}, ABR:{worked:700,saldoMes:220,saldoAcum:1401}, MAI:{worked:697,saldoMes:697,saldoAcum:2098}, JUN:{worked:763,saldoMes:283,saldoAcum:2381}, JUL:{worked:910,saldoMes:430,saldoAcum:2811} } },
  { nome: "EDNA MIYUKI BABA", pin: true, saldoDez: 34891, months: { JAN:{worked:3656,saldoMes:1256,saldoAcum:36147}, FEV:{worked:3015,saldoMes:615,saldoAcum:36762}, MAR:{worked:3417,saldoMes:1017,saldoAcum:37779}, ABR:{worked:3656,saldoMes:776,saldoAcum:38555}, MAI:{worked:3286,saldoMes:886,saldoAcum:39441}, JUN:{worked:2066,saldoMes:-814,saldoAcum:38627}, JUL:{worked:4346,saldoMes:1466,saldoAcum:40093} } },
  { nome: "WANDER HELENO SALLES", pin: true, saldoDez: 3601, months: { JAN:{worked:1508,saldoMes:-892,saldoAcum:2709}, FEV:{worked:2469,saldoMes:69,saldoAcum:2778}, MAR:{worked:1803,saldoMes:-597,saldoAcum:2181}, ABR:{worked:2342,saldoMes:-538,saldoAcum:1643}, MAI:{worked:3017,saldoMes:617,saldoAcum:2260}, JUN:{worked:7867,saldoMes:4987,saldoAcum:7247}, JUL:{worked:2237,saldoMes:-643,saldoAcum:6604} } },
  { nome: "ARLETE SHIRLEY PEREIRA DE CARVALHO", pin: true, saldoDez: 1869, months: { JAN:{worked:2259,saldoMes:-141,saldoAcum:1728}, FEV:{worked:2978,saldoMes:578,saldoAcum:2306}, MAR:{worked:2168,saldoMes:-232,saldoAcum:2074}, ABR:{worked:2710,saldoMes:-170,saldoAcum:1904}, MAI:{worked:2593,saldoMes:193,saldoAcum:2097}, JUN:{worked:4250,saldoMes:1370,saldoAcum:3467}, JUL:{worked:1745,saldoMes:-1135,saldoAcum:2332} } },
  { nome: "ELENICE ORPHEU ALVES DE SOUZA", pin: true, saldoDez: 868, months: { JAN:{worked:3384,saldoMes:-752,saldoAcum:116}, FEV:{worked:2467,saldoMes:67,saldoAcum:183}, MAR:{worked:2786,saldoMes:386,saldoAcum:569}, ABR:{worked:2474,saldoMes:-406,saldoAcum:163}, MAI:{worked:1631,saldoMes:-769,saldoAcum:-606}, JUN:{worked:3528,saldoMes:648,saldoAcum:42}, JUL:{worked:4225,saldoMes:1345,saldoAcum:1387} } },
  { nome: "ELZA TATSUO SAMECIMA", pin: true, saldoDez: 3084, months: { JAN:{worked:4497,saldoMes:2097,saldoAcum:5181}, FEV:{worked:4153,saldoMes:1753,saldoAcum:6934}, MAR:{worked:4752,saldoMes:2352,saldoAcum:9286}, ABR:{worked:3732,saldoMes:852,saldoAcum:10138}, MAI:{worked:4358,saldoMes:1958,saldoAcum:12096}, JUN:{worked:4280,saldoMes:1400,saldoAcum:13496}, JUL:{worked:4517,saldoMes:1637,saldoAcum:15133} } },
  { nome: "FERNANDA DA SILVA E SOUZA", pin: true, saldoDez: 381, months: { JAN:{worked:1833,saldoMes:-195,saldoAcum:186}, FEV:{worked:1449,saldoMes:-1449,saldoAcum:-1263}, MAR:{worked:1735,saldoMes:665,saldoAcum:-598}, ABR:{worked:2414,saldoMes:466,saldoAcum:-132}, MAI:{worked:2567,saldoMes:911,saldoAcum:779}, JUN:{worked:2623,saldoMes:-257,saldoAcum:522}, JUL:{worked:2166,saldoMes:-714,saldoAcum:-192} } },
  { nome: "GILMAR MARCIANO DOS SANTOS", pin: true, saldoDez: 1273, months: { JAN:{worked:2943,saldoMes:543,saldoAcum:1816}, FEV:{worked:2499,saldoMes:99,saldoAcum:1915}, MAR:{worked:2792,saldoMes:392,saldoAcum:2307}, ABR:{worked:1193,saldoMes:-1207,saldoAcum:1100}, MAI:{worked:2698,saldoMes:298,saldoAcum:1398}, JUN:{worked:2774,saldoMes:-106,saldoAcum:1292}, JUL:{worked:2807,saldoMes:-73,saldoAcum:1219} } },
  { nome: "JOÃO CARLOS FERREIRA DE SOUZA", pin: true, saldoDez: 587, months: { JAN:{worked:1910,saldoMes:-490,saldoAcum:97}, FEV:{worked:1919,saldoMes:-481,saldoAcum:-384}, MAR:{worked:2511,saldoMes:111,saldoAcum:-273}, ABR:{worked:1772,saldoMes:-1108,saldoAcum:-1381}, MAI:{worked:2801,saldoMes:401,saldoAcum:-980}, JUN:{worked:2186,saldoMes:-694,saldoAcum:-1674}, JUL:{worked:5258,saldoMes:2858,saldoAcum:1184} } },
  { nome: "JOMARA SIMÕES DOS SANTOS", pin: true, saldoDez: 1040, months: { JAN:{worked:1482,saldoMes:-918,saldoAcum:122}, FEV:{worked:3219,saldoMes:819,saldoAcum:941}, MAR:{worked:2435,saldoMes:35,saldoAcum:976}, ABR:{worked:1865,saldoMes:-535,saldoAcum:441}, MAI:{worked:2986,saldoMes:586,saldoAcum:1027}, JUN:{worked:2165,saldoMes:-715,saldoAcum:312}, JUL:{worked:3183,saldoMes:303,saldoAcum:615} } },
  { nome: "KAREN DE OLIVEIRA DELFINO", pin: true, saldoDez: 1623, months: { JAN:{worked:435,saldoMes:-435,saldoAcum:1188}, FEV:{worked:62,saldoMes:-62,saldoAcum:1126}, MAR:{worked:10,saldoMes:10,saldoAcum:1136}, ABR:{worked:216,saldoMes:264,saldoAcum:1400}, MAI:{worked:33,saldoMes:-1807,saldoAcum:-407}, JUN:{worked:6610,saldoMes:3730,saldoAcum:3323}, JUL:{worked:1156,saldoMes:-1724,saldoAcum:1599} } },
  { nome: "LUIZ ANDRADE", pin: true, saldoDez: null, months: { JAN:{worked:null,saldoMes:null,saldoAcum:null}, FEV:{worked:null,saldoMes:null,saldoAcum:null}, MAR:{worked:null,saldoMes:null,saldoAcum:null}, ABR:{worked:null,saldoMes:null,saldoAcum:null}, MAI:{worked:292,saldoMes:292,saldoAcum:292}, JUN:{worked:3207,saldoMes:807,saldoAcum:1099}, JUL:{worked:2875,saldoMes:475,saldoAcum:1574} } },
  { nome: "MARILSA DA SILVA E SILVA", pin: true, saldoDez: null, months: { JAN:{worked:2471,saldoMes:71,saldoAcum:71}, FEV:{worked:2256,saldoMes:-144,saldoAcum:-73}, MAR:{worked:2430,saldoMes:30,saldoAcum:-43}, ABR:{worked:2406,saldoMes:560,saldoAcum:517}, MAI:{worked:2447,saldoMes:-27,saldoAcum:490}, JUN:{worked:7965,saldoMes:5085,saldoAcum:5575}, JUL:{worked:1807,saldoMes:-1073,saldoAcum:4502} } },
  { nome: "MARISTELA APARECIDA RAPHAEL", pin: false, saldoDez: 807, months: { JAN:{worked:1486,saldoMes:-914,saldoAcum:-107}, FEV:{worked:1602,saldoMes:1602,saldoAcum:1495}, MAR:{worked:1220,saldoMes:-1180,saldoAcum:315}, ABR:{worked:1276,saldoMes:796,saldoAcum:1111}, MAI:{worked:1313,saldoMes:1313,saldoAcum:2424}, JUN:{worked:1672,saldoMes:1672,saldoAcum:4096}, JUL:{worked:2098,saldoMes:2098,saldoAcum:6194} } },
  { nome: "MARTA CONCEIÇÃO DE MOURA", pin: true, saldoDez: 344, months: { JAN:{worked:1873,saldoMes:-161,saldoAcum:183}, FEV:{worked:1436,saldoMes:-1436,saldoAcum:-1253}, MAR:{worked:8251,saldoMes:8357,saldoAcum:7104}, ABR:{worked:2384,saldoMes:-496,saldoAcum:6608}, MAI:{worked:1565,saldoMes:-835,saldoAcum:5773}, JUN:{worked:5861,saldoMes:2981,saldoAcum:8754}, JUL:{worked:1773,saldoMes:-1107,saldoAcum:7647} } },
  { nome: "RENATA APARECIDA PIMENTA MOREIRA", pin: false, saldoDez: null, months: { JAN:{worked:null,saldoMes:null,saldoAcum:null}, FEV:{worked:null,saldoMes:null,saldoAcum:null}, MAR:{worked:null,saldoMes:null,saldoAcum:null}, ABR:{worked:null,saldoMes:null,saldoAcum:null}, MAI:{worked:null,saldoMes:null,saldoAcum:null}, JUN:{worked:null,saldoMes:null,saldoAcum:null}, JUL:{worked:495,saldoMes:15,saldoAcum:15} } },
  { nome: "RENATO ESPIRITO SANTO DIAS TATIT", pin: true, saldoDez: 6752, months: { JAN:{worked:1001,saldoMes:-6679,saldoAcum:73}, FEV:{worked:2417,saldoMes:17,saldoAcum:90}, MAR:{worked:2960,saldoMes:560,saldoAcum:650}, ABR:{worked:2898,saldoMes:18,saldoAcum:668}, MAI:{worked:2750,saldoMes:350,saldoAcum:1018}, JUN:{worked:3047,saldoMes:167,saldoAcum:1185}, JUL:{worked:1893,saldoMes:-987,saldoAcum:198} } },
  { nome: "ROBERTO CARLOS SANTANA", pin: true, saldoDez: 631, months: { JAN:{worked:1551,saldoMes:-413,saldoAcum:218}, FEV:{worked:2923,saldoMes:87,saldoAcum:305}, MAR:{worked:3253,saldoMes:853,saldoAcum:1158}, ABR:{worked:2271,saldoMes:-609,saldoAcum:549}, MAI:{worked:2773,saldoMes:373,saldoAcum:922}, JUN:{worked:3334,saldoMes:454,saldoAcum:1376}, JUL:{worked:1917,saldoMes:-963,saldoAcum:413} } },
  { nome: "RONALDO HILÁRIO DOS SANTOS", pin: true, saldoDez: 537, months: { JAN:{worked:1325,saldoMes:1,saldoAcum:538}, FEV:{worked:0,saldoMes:0,saldoAcum:538}, MAR:{worked:1288,saldoMes:212,saldoAcum:750}, ABR:{worked:1387,saldoMes:907,saldoAcum:1657}, MAI:{worked:1471,saldoMes:-449,saldoAcum:1208}, JUN:{worked:1996,saldoMes:-884,saldoAcum:324}, JUL:{worked:1701,saldoMes:-699,saldoAcum:-375} } },
  { nome: "TANIA CRISTINA BEGOSSO", pin: true, saldoDez: 454, months: { JAN:{worked:2404,saldoMes:4,saldoAcum:458}, FEV:{worked:2742,saldoMes:342,saldoAcum:800}, MAR:{worked:7689,saldoMes:5289,saldoAcum:6089}, ABR:{worked:1207,saldoMes:-1673,saldoAcum:4416}, MAI:{worked:1648,saldoMes:208,saldoAcum:4624}, JUN:{worked:3667,saldoMes:787,saldoAcum:5411}, JUL:{worked:1664,saldoMes:-1216,saldoAcum:4195} } },
  { nome: "THIAGO ALMEIDA DA SILVA", pin: true, saldoDez: 925, months: { JAN:{worked:2350,saldoMes:-50,saldoAcum:875}, FEV:{worked:2407,saldoMes:7,saldoAcum:882}, MAR:{worked:2029,saldoMes:-371,saldoAcum:511}, ABR:{worked:1771,saldoMes:-1109,saldoAcum:-598}, MAI:{worked:2286,saldoMes:-114,saldoAcum:-712}, JUN:{worked:5289,saldoMes:2409,saldoAcum:1697}, JUL:{worked:2533,saldoMes:-347,saldoAcum:1350} } },
  { nome: "ALEXSANDRA BERTACO SEVERINO", pin: false, saldoDez: null, months: { JAN:{worked:531,saldoMes:531,saldoAcum:531}, FEV:{worked:443,saldoMes:443,saldoAcum:974}, MAR:{worked:120,saldoMes:120,saldoAcum:1094}, ABR:{worked:57,saldoMes:57,saldoAcum:1151}, MAI:{worked:17,saldoMes:17,saldoAcum:1168}, JUN:{worked:80,saldoMes:-400,saldoAcum:768}, JUL:{worked:2156,saldoMes:1676,saldoAcum:2444} } },
  { nome: "CAMILA PEREIRA DOS SANTOS", pin: true, saldoDez: null, months: { JAN:{worked:null,saldoMes:null,saldoAcum:null}, FEV:{worked:null,saldoMes:null,saldoAcum:null}, MAR:{worked:null,saldoMes:null,saldoAcum:null}, ABR:{worked:null,saldoMes:null,saldoAcum:null}, MAI:{worked:null,saldoMes:null,saldoAcum:null}, JUN:{worked:null,saldoMes:null,saldoAcum:null}, JUL:{worked:2916,saldoMes:36,saldoAcum:36} } },
  { nome: "CESAR MOREIRA CONSTANTINO", pin: true, saldoDez: 6332, months: { JAN:{worked:2265,saldoMes:-135,saldoAcum:6197}, FEV:{worked:1499,saldoMes:-901,saldoAcum:5296}, MAR:{worked:786,saldoMes:-1614,saldoAcum:3682}, ABR:{worked:1876,saldoMes:-1004,saldoAcum:2678}, MAI:{worked:2695,saldoMes:295,saldoAcum:2973}, JUN:{worked:2862,saldoMes:462,saldoAcum:3435}, JUL:{worked:1860,saldoMes:-1020,saldoAcum:2415} } },
  { nome: "CLAUDENICE DA SILVA", pin: true, saldoDez: 377, months: { JAN:{worked:2194,saldoMes:-206,saldoAcum:171}, FEV:{worked:2161,saldoMes:-239,saldoAcum:-68}, MAR:{worked:2330,saldoMes:-70,saldoAcum:-138}, ABR:{worked:2673,saldoMes:483,saldoAcum:345}, MAI:{worked:2749,saldoMes:-341,saldoAcum:4}, JUN:{worked:2935,saldoMes:55,saldoAcum:59}, JUL:{worked:2930,saldoMes:50,saldoAcum:109} } },
  { nome: "CONCEIÇÃO AP. PANISSI MARTINS", pin: false, saldoDez: null, months: { JAN:{worked:1739,saldoMes:1739,saldoAcum:1739}, FEV:{worked:1317,saldoMes:1317,saldoAcum:3056}, MAR:{worked:1897,saldoMes:1897,saldoAcum:4953}, ABR:{worked:1263,saldoMes:783,saldoAcum:5736}, MAI:{worked:1308,saldoMes:1308,saldoAcum:7044}, JUN:{worked:1203,saldoMes:723,saldoAcum:7767}, JUL:{worked:795,saldoMes:315,saldoAcum:8082} } },
  { nome: "CLEBER FARIAS DOS SANTOS", pin: true, saldoDez: 6445, months: { JAN:{worked:2595,saldoMes:195,saldoAcum:6640}, FEV:{worked:1090,saldoMes:-1310,saldoAcum:5330}, MAR:{worked:2969,saldoMes:569,saldoAcum:5899}, ABR:{worked:2997,saldoMes:117,saldoAcum:6016}, MAI:{worked:3174,saldoMes:774,saldoAcum:6790}, JUN:{worked:3812,saldoMes:932,saldoAcum:7722}, JUL:{worked:4541,saldoMes:1661,saldoAcum:9383} } },
  { nome: "DIEGO BARBOSA DOS SANTOS", pin: false, saldoDez: 580, months: { JAN:{worked:810,saldoMes:810,saldoAcum:1390}, FEV:{worked:383,saldoMes:383,saldoAcum:1773}, MAR:{worked:225,saldoMes:225,saldoAcum:1998}, ABR:{worked:32,saldoMes:-32,saldoAcum:1966}, MAI:{worked:597,saldoMes:597,saldoAcum:2563}, JUN:{worked:719,saldoMes:239,saldoAcum:2802}, JUL:{worked:587,saldoMes:107,saldoAcum:2909} } },
  { nome: "FERNANDO CESAR BARBOZA", pin: false, saldoDez: null, months: { JAN:{worked:1496,saldoMes:1496,saldoAcum:1496}, FEV:{worked:2038,saldoMes:-362,saldoAcum:1134}, MAR:{worked:975,saldoMes:975,saldoAcum:2109}, ABR:{worked:952,saldoMes:472,saldoAcum:2581}, MAI:{worked:740,saldoMes:740,saldoAcum:3321}, JUN:{worked:1385,saldoMes:905,saldoAcum:4226}, JUL:{worked:1492,saldoMes:1012,saldoAcum:5238} } },
  { nome: "JOSÉ LUIZ DOS SANTOS MOREIRA", pin: true, saldoDez: 345, months: { JAN:{worked:2494,saldoMes:-94,saldoAcum:251}, FEV:{worked:1393,saldoMes:-1393,saldoAcum:-1142}, MAR:{worked:2096,saldoMes:304,saldoAcum:-838}, ABR:{worked:2348,saldoMes:532,saldoAcum:-306}, MAI:{worked:2051,saldoMes:263,saldoAcum:-43}, JUN:{worked:2368,saldoMes:-512,saldoAcum:-555}, JUL:{worked:2989,saldoMes:109,saldoAcum:-446} } },
  { nome: "JOSE ROMÃO BATISTA", pin: true, saldoDez: 268, months: { JAN:{worked:2961,saldoMes:25,saldoAcum:293}, FEV:{worked:2598,saldoMes:198,saldoAcum:491}, MAR:{worked:2794,saldoMes:394,saldoAcum:885}, ABR:{worked:2413,saldoMes:13,saldoAcum:898}, MAI:{worked:2530,saldoMes:130,saldoAcum:1028}, JUN:{worked:2408,saldoMes:-472,saldoAcum:556}, JUL:{worked:2779,saldoMes:-101,saldoAcum:455} } },
  { nome: "LUIZ CARLOS BAZALIA DOS SANTOS", pin: true, saldoDez: 1811, months: { JAN:{worked:5806,saldoMes:3406,saldoAcum:5217}, FEV:{worked:2354,saldoMes:-46,saldoAcum:5171}, MAR:{worked:2759,saldoMes:359,saldoAcum:5530}, ABR:{worked:2424,saldoMes:-456,saldoAcum:5074}, MAI:{worked:4163,saldoMes:1763,saldoAcum:6837}, JUN:{worked:2650,saldoMes:-230,saldoAcum:6607}, JUL:{worked:2456,saldoMes:-424,saldoAcum:6183} } },
  { nome: "MATEUS RIBEIRO DA SILVA", pin: true, saldoDez: 4635, months: { JAN:{worked:2794,saldoMes:394,saldoAcum:5029}, FEV:{worked:1805,saldoMes:-595,saldoAcum:4434}, MAR:{worked:2275,saldoMes:-125,saldoAcum:4309}, ABR:{worked:2199,saldoMes:-681,saldoAcum:3628}, MAI:{worked:2505,saldoMes:105,saldoAcum:3733}, JUN:{worked:2564,saldoMes:-316,saldoAcum:3417}, JUL:{worked:2874,saldoMes:-6,saldoAcum:3411} } },
  { nome: "THAIS CRISTINA NASCIMENTO BARBOSA", pin: true, saldoDez: null, months: { JAN:{worked:null,saldoMes:null,saldoAcum:null}, FEV:{worked:2445,saldoMes:45,saldoAcum:45}, MAR:{worked:3522,saldoMes:1122,saldoAcum:1167}, ABR:{worked:3124,saldoMes:244,saldoAcum:1411}, MAI:{worked:3323,saldoMes:923,saldoAcum:2334}, JUN:{worked:3015,saldoMes:255,saldoAcum:2589}, JUL:{worked:1893,saldoMes:-867,saldoAcum:1722} } },
];

/* ── Correções de nome: grafia na planilha → grafia no banco de dados ─────── */
export const PIN_NAME_CORRECTIONS: Record<string, string> = {
  "TATIANA DE CARVALHO COSTA LOSCHER": "TATIANA DE CARVALHO DA COSTA LOSCHER",
  "MARTA DE ALMEIDA GOMES GUNTHER": "Marta de Almeida Gomes",
  "NORMA SUELY FERREIRA SOUZA AMERICO": "Norma Suely Ferreira Souza Ameico",
  "CLEMILSON SANTOS COBRA": "CLEMILSON SANTOS COBRAS",
  "LUIZ ANDRADE": "LUIZ DE ANDRADE JUNIOR",
  "RENATO ESPIRITO SANTO DIAS TATIT": "RENATO ESPIRITO SANTO D TATIT",
  "CONCEIÇÃO AP. PANISSI MARTINS": "CONCEICAO APARECIDA PANISSI",
  "MATEUS RIBEIRO DA SILVA": "MATEUS RIBERO DA SILVA",
};

/* ── Metas mensais do Projeto PIN (Decreto nº 70.273/2025) ─────────────────
   Usadas para exibição/acompanhamento do bônus PIN. O desconto do banco de
   horas em si (Ago/26+, calculado em server.ts) usa PIN_BANK_GOAL fixo. ── */
export const PIN_BONUS_GOALS: Record<string, number> = {
  JAN: 2400, FEV: 2400, MAR: 2400, ABR: 2880, MAI: 2400, JUN: 2880, JUL: 2880,
  AGO: 2400, SET: 2400, OUT: 2400, NOV: 2880, DEZ: 2400,
};
export const PIN_BANK_GOAL = 2400;

/* ── Helpers de normalização/match de nome (mesmo padrão usado nas telas) ─── */
export function normPinName(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function findPinHistorical(dbName: string): PinHistoricalEntry | null {
  const target = normPinName(dbName);
  for (const entry of PIN_HISTORICAL) {
    const corrected = PIN_NAME_CORRECTIONS[entry.nome] ?? entry.nome;
    if (normPinName(corrected) === target) return entry;
  }
  return null;
}

/* ── Banco de horas — Projeto PIN (fonte de verdade única para TimeCard.tsx,
   Reports.tsx e PinProject.tsx) ─────────────────────────────────────────────
   /api/pin-project/auto-balances resolve TODO mês (Jan/2026 em diante) no
   servidor, nessa ordem de prioridade: override manual do admin > planilha
   oficial congelada (Jan–Jul/26) > cálculo automático do espelho de ponto
   (Ago/26+, aplicando déficit cheio quando o mês não teve apontamento).
   O cliente nunca reimplementa essa lógica — só lê o resultado. */
export const PIN_MONTH_ABBR: Record<number, string> = {
  1: "JAN", 2: "FEV", 3: "MAR", 4: "ABR", 5: "MAI", 6: "JUN", 7: "JUL",
  8: "AGO", 9: "SET", 10: "OUT", 11: "NOV", 12: "DEZ",
};

export function pinMonthKey(year: number, month: number): string {
  return `${PIN_MONTH_ABBR[month]}${year}`;
}

export type PinAutoMonth = {
  acum: number | null; extras: number; goal: number; recordCount: number;
  isComplete: boolean; isCurrentMonth: boolean; noSeedMode: boolean; isManualOverride?: boolean;
};
export type PinAutoMonths = Record<string, PinAutoMonth>;

export async function fetchPinAutoBalances(): Promise<Record<string, PinAutoMonths>> {
  try {
    const j = await fetch("/api/pin-project/auto-balances").then(r => r.json());
    if (!j.success || !Array.isArray(j.employees)) return {};
    const map: Record<string, PinAutoMonths> = {};
    for (const emp of j.employees) map[emp.id] = emp.autoMonths ?? {};
    return map;
  } catch {
    return {};
  }
}

/* Saldo acumulado PIN de um funcionário num mês — sempre lido da resposta de
   /api/pin-project/auto-balances (já busque com fetchPinAutoBalances). */
export function pinAccumFor(
  empId: string,
  year: number,
  month: number,
  autoBalances: Record<string, PinAutoMonths>,
): number | null {
  return autoBalances[empId]?.[pinMonthKey(year, month)]?.acum ?? null;
}

