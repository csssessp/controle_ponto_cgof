import dns from 'dns';
import net from 'net';
import { promisify } from 'util';

const resolve = promisify(dns.resolve4);

async function investigateConnection() {
  const host = 'db.yhwiertvbkeirvlieuag.supabase.co';
  const port = 5432;

  console.log('🔍 Investigando conexão ao Supabase...\n');

  // Test 1: DNS Resolution
  console.log('1️⃣ Teste DNS:');
  try {
    const ips = await resolve(host);
    console.log(`   ✅ Host resolvido para: ${ips.join(', ')}`);
  } catch (error: any) {
    console.error(`   ❌ Erro DNS: ${error.message}`);
    return;
  }

  // Test 2: Port connectivity
  console.log(`\n2️⃣ Teste de conectividade (${host}:${port}):`);
  try {
    const result = await testPortConnection(host, port);
    console.log(`   ✅ Porta ${port} está ${result ? 'acessível' : 'NÃO acessível'}`);
  } catch (error: any) {
    console.error(`   ❌ Erro de conectividade: ${error.message}`);
  }

  // Test 3: Check environment variables
  console.log('\n3️⃣ Verificando variáveis de ambiente:');
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  
  if (!dbUrl) {
    console.error('   ❌ DATABASE_URL não definida!');
  } else {
    console.log('   ✅ DATABASE_URL definida');
    console.log(`      ${dbUrl.replace(/:[^@]*@/, ':***@')}`);
  }

  if (!directUrl) {
    console.warn('   ⚠️ DIRECT_URL não definida (pode ser necessária)');
  } else {
    console.log('   ✅ DIRECT_URL definida');
  }

  // Test 4: Check Supabase project
  console.log('\n4️⃣ Informações do projeto:');
  console.log(`   Projeto ID: yhwiertvbkeirvlieuag`);
  console.log(`   URL de conexão: ${host}`);
  
  // Test 5: Suggestions
  console.log('\n5️⃣ Possíveis soluções:');
  console.log('   1. Verificar se o projeto Supabase existe e está ativo');
  console.log('   2. Verificar credenciais (usuário/senha)');
  console.log('   3. Verificar firewall/VPN local');
  console.log('   4. Testar em outro computador/rede');
  console.log('   5. Verificar se há IP whitelist no Supabase');
  console.log('   6. Usar Connection Pooler do Supabase (recomendado)');
}

function testPortConnection(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 5000 });
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

investigateConnection().catch(console.error);
