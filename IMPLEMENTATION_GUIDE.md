# 🚀 Chronos Ponto - Guia de Implementação

## Status: ✅ Pronto para Produção

O sistema **Chronos Ponto** está completamente implementado e pronto para funcionar com Supabase PostgreSQL.

---

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente

As credenciais já estão configuradas em `.env`:
- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE`: Chave de serviço para operações de admin
- `NODE_OPTIONS`: Configurações de Node.js

### 2. Criar Tabelas no Supabase

**IMPORTANTE**: A porta PostgreSQL direta (5432) está bloqueada pela rede. As tabelas precisam ser criadas via SQL Editor do Supabase.

#### Passos:
1. Acesse: https://supabase.com/dashboard/projects
2. Selecione seu projeto
3. Vá para "SQL Editor"
4. Crie uma nova query
5. Cole o conteúdo de `SUPABASE_SCHEMA.sql`
6. Execute

Ou use o arquivo pré-pronto:
```bash
cat SUPABASE_SCHEMA.sql
# Copie e cole no SQL Editor do Supabase
```

---

## 📊 Arquitetura

### Backend (Express + TypeScript)
- **Servidor**: `server.ts`
- **Porta**: 3000 (desenvolvimento)
- **Framework**: Express.js
- **Compilador**: tsx (TypeScript runtime)

### Serviços
- **PDF Parsing**: `src/services/pdfService.ts`
  - Extração de texto via `pdf-parse`
  - Parsing com AI (Gemini 1.5-flash)
  - Cálculo de horas trabalhadas
  - Detecção de status (férias, atestado, etc)

### Banco de Dados
- **Plataforma**: Supabase PostgreSQL
- **Acesso**: REST API (port 5432 bloqueado)
- **Client**: `@supabase/supabase-js` com service role

---

## 🚀 Como Usar

### Iniciar o Servidor
```bash
npm run dev
```

Saída esperada:
```
🎬 Starting...
✅ Vite integrated
🚀 Chronos Ponto on http://localhost:3000
📊 Database: Supabase (REST API)
```

### Verificar Saúde
```bash
curl http://localhost:3000/api/health
```

Resposta:
```json
{
  "status": "ok",
  "name": "Chronos Ponto API",
  "timestamp": "2026-05-07T19:00:33.821Z"
}
```

---

## 📋 API Endpoints

### 1. Health Check
```
GET /api/health
```
Retorna status da API

### 2. Upload e Parse de PDF
```
POST /api/upload/ponto
Content-Type: application/json

{
  "base64": "JVBERi0xLjQKJeLjz9M..."
}
```

**Resposta**:
```json
{
  "success": true,
  "totalSegments": 5,
  "employees": [
    {
      "name": "João Silva",
      "registration": "123456",
      "cpf": "123.456.789-00",
      "records": [...]
    }
  ]
}
```

### 3. Salvar Dados ao Supabase
```
POST /api/upload/ponto/save
Content-Type: application/json

{
  "employees": [
    {
      "name": "João Silva",
      "registration": "123456",
      "cpf": "123.456.789-00",
      "records": [...]
    }
  ]
}
```

**Resposta**:
```json
{
  "success": true,
  "results": [
    {
      "employeeId": "uuid",
      "name": "João Silva",
      "registration": "123456",
      "recordsSaved": 20,
      "entriesSaved": 40
    }
  ]
}
```

### 4. Listar Funcionários
```
GET /api/employees
```

**Resposta**:
```json
{
  "success": true,
  "count": 15,
  "employees": [...]
}
```

### 5. Histórico de Presença
```
GET /api/attendance/:employeeId
```

**Resposta**:
```json
{
  "success": true,
  "count": 20,
  "records": [...]
}
```

---

## 🔄 Fluxo de Funcionamento

### 1. Upload de PDF
```
PDF → Base64 → API /upload/ponto
```

### 2. Parsing com AI
```
PDF Text → Gemini 1.5-flash → JSON estruturado
- Extrai: nome, matrícula, CPF, registros de ponto
- Calcula: horas trabalhadas, overtime, turnos noturnos
- Detecta: faltas, férias, atestados, compensações
```

### 3. Persistência
```
Dados Estruturados → API /upload/ponto/save → Supabase REST API
```

### 4. Consultas
```
GET /api/employees → Lista todos os funcionários
GET /api/attendance/:id → Histórico por funcionário
```

---

## 📈 Modelos de Dados

### Organization
```typescript
{
  id: uuid,
  name: string,
  cnpj?: string,
  address?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Employee
```typescript
{
  id: uuid,
  registration: string (UNIQUE),
  name: string,
  cpf?: string (UNIQUE),
  email?: string,
  phone?: string,
  roleTitle?: string,
  admissionDate?: timestamp,
  organizationId: uuid,
  departmentId?: uuid,
  scheduleId?: uuid,
  managerId?: uuid (self-reference),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### AttendanceRecord
```typescript
{
  id: uuid,
  employeeId: uuid,
  date: timestamp,
  totalWork: integer (minutos),
  overtime50: integer (minutos a 50%),
  overtime100: integer (minutos a 100%),
  nightShift: integer (minutos turno noturno),
  delay: integer (minutos de atraso),
  status: enum (NORMAL|ABSENCE|VACATION|HOLIDAY|CERTIFICATE|OFF_DAY|COMPENSATION),
  justification?: string,
  isApproved: boolean,
  approvedBy?: uuid,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### TimeEntry
```typescript
{
  id: uuid,
  recordId: uuid,
  time: timestamp,
  type: enum (IN|OUT),
  original?: string,
  isManual: boolean,
  createdAt: timestamp
}
```

---

## 🔒 Segurança

- **Autenticação**: Service Role (admin) para operações de servidor
- **RLS**: Bypass de RLS com service role (necessário para imports)
- **Dados Reais**: 100% de dados importados do PDF
- **Sem Mock**: Nenhum dado fictício no sistema

---

## 📚 Tecnologias Utilizadas

| Tecnologia | Versão | Propósito |
|-----------|--------|----------|
| Express.js | 4.21.2 | Servidor web |
| TypeScript | 5.x | Linguagem tipada |
| Vite | 6.2.3 | Build tool & dev server |
| Supabase | 2.105.3 | PostgreSQL + REST API |
| Prisma | 6.3.1 | ORM (schema reference) |
| Gemini | 1.29.0 | IA para parsing |
| pdf-parse | 2.4.5 | Extração de PDF |
| Zustand | 5.0.13 | State management (frontend) |
| Tailwind CSS | 4.1.14 | Styling |
| shadcn/ui | - | Componentes UI |

---

## 🧪 Testes

### Verificar Compilação
```bash
npm run lint
```

### Build Produção
```bash
npm run build
```

### Iniciar em Produção
```bash
npm start
```

---

## 📝 Notas Importantes

### Port 5432 PostgreSQL Bloqueado
- A rede bloqueia conexões diretas a porta 5432
- **Solução**: Usar Supabase REST API via HTTPS (port 443)
- Isso é transparente - o código usa `@supabase/supabase-js` que faz HTTP internamente

### Migrations Prisma
- `npx prisma migrate dev` **não funciona** (port 5432 bloqueado)
- Schema SQL foi convertido para PostgreSQL em `SUPABASE_SCHEMA.sql`
- Deve ser executado manualmente no SQL Editor do Supabase

### Dados 100% Reais
- Nenhum seeding ou dados mock
- Tudo vem direto do PDF importado
- Parsing feito com Gemini AI para máxima precisão

---

## 🚨 Troubleshooting

### "Address already in use :::3000"
```bash
# Windows
netstat -ano | Select-String 3000
Stop-Process -Id <PID> -Force

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### "fetch failed: self-signed certificate"
Essa é uma aviação durante desenvolvimento. Em produção, use certificados válidos.

### "PGRST116: Table does not exist"
Execute o SQL em `SUPABASE_SCHEMA.sql` no SQL Editor do Supabase.

---

## 📞 Suporte

Para questões sobre:
- **Supabase**: https://supabase.com/docs
- **Express**: https://expressjs.com/
- **TypeScript**: https://www.typescriptlang.org/
- **Gemini AI**: https://ai.google.dev/

---

## 📄 Licença

Chronos Ponto © 2026 - Todos os direitos reservados
