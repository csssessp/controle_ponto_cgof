import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('🔌 Testando conexão com Supabase PostgreSQL...');
    console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/:[^@]*@/, ':***@')}`);
    
    const result = await prisma.$queryRaw`SELECT version();`;
    console.log('✅ Conexão bem-sucedida!');
    console.log('PostgreSQL:', result);
    
  } catch (error: any) {
    console.error('❌ Erro de conexão:');
    console.error('Mensagem:', error.message);
    console.error('Código:', error.code);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
