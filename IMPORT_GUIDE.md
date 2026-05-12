# 📋 GUIA DE IMPORTAÇÃO DE FUNCIONÁRIOS

Este guia explica como usar os scripts para importar funcionários reais do DPM Light e remover dados fictícios.

---

## ⚠️ IMPORTANTE

Estes scripts vão **DELETAR TODOS OS DADOS** do sistema e importar funcionários reais. Use com cuidado em produção!

---

## 🚀 Opção 1: Importar Lista de Funcionários Fixa

Se você tem uma lista fixa de funcionários (como fornecida):

```bash
npm run import-employees
```

**O que acontece:**
- ✅ Remove todos os dados fictícios
- ✅ Cria organizações, departamentos e jornadas padrão
- ✅ Importa os 56 funcionários da lista fixa
- ✅ Atribui registro automático (00001, 00002, etc.)

**Resultado:**
```
✅ Importados: 56
⏭️  Duplicados: 0
❌ Erros: 0
```

---

## 🚀 Opção 2: Importar do Arquivo CSV do DPM Light

Se você tem um arquivo CSV exportado do DPM Light:

### Passo 1: Exportar do DPM Light
No DPM Light:
1. Menu: Cadastro → Funcionários
2. Selecionar todos os funcionários
3. Exportar → CSV

Salvar como `funcionarios.csv`

### Passo 2: Executar o Script

```bash
npm run import-dpm funcionarios.csv
```

**Formato esperado do CSV:**
```csv
Registro,Nome,CPF,Email,Telefone,Data Admissão,Cargo
001,ADAN FREIRE PEREIRA,123.456.789-00,adan@email.com,11-99999999,2020-01-15,Colaborador
002,ADRIANA CRISTINA DE JESUS AZEVEDO,234.567.890-00,adriana@email.com,11-98888888,2020-02-01,Gerente
```

**Campos suportados:**
- `Registro` - Matrícula do funcionário
- `Nome` - Nome completo (OBRIGATÓRIO)
- `CPF` - Cadastro de Pessoa Física
- `Email` - Email
- `Telefone` - Telefone
- `Data Admissão` - Data de entrada (dd/mm/yyyy ou yyyy-mm-dd)
- `Cargo` - Função do funcionário

**O script:**
- Reconhece automaticamente os cabeçalhos
- Normalizas datas em diferentes formatos
- Importa tudo para o Supabase
- Mostra relatório de sucesso/erros

---

## 🚀 Opção 3: Usar Endpoint HTTP

Se você quer integrar a importação em sua aplicação:

### Upload de CSV via API

```bash
curl -X POST http://localhost:3000/api/import/dpm-light/csv \
  -H "Content-Type: application/json" \
  -d @payload.json
```

**Payload (payload.json):**
```json
{
  "base64": "UmVnaXN0cm8sTm9tZSxDUEYKMDAxLEFEQU4gRlJFSVJFIFBFUkVJUkEsMTIzLjQ1Ni43ODktMDAK..."
}
```

**Para converter CSV para base64:**

**Windows PowerShell:**
```powershell
$file = Get-Content "funcionarios.csv" -Raw
$base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($file))
$payload = @{ base64 = $base64 } | ConvertTo-Json
$payload | Out-File -FilePath "payload.json"
```

**Linux/Mac:**
```bash
base64 -w 0 funcionarios.csv > payload.b64
cat > payload.json << EOF
{
  "base64": "$(cat payload.b64)"
}
EOF
```

**Resposta:**
```json
{
  "success": true,
  "total": 56,
  "summary": {
    "imported": 56,
    "duplicated": 0,
    "errors": 0
  },
  "results": [
    { "status": "imported", "nome": "ADAN FREIRE PEREIRA", "registration": "001" },
    { "status": "imported", "nome": "ADRIANA CRISTINA DE JESUS AZEVEDO", "registration": "002" }
  ]
}
```

---

## 🧹 Limpar Dados Fictícios

Para limpar TODOS os dados antes de importar:

```bash
npm run clean-employees
```

**O que remove:**
- ✅ Todos os employees
- ✅ Todos os attendance_records
- ✅ Todos os time_entries
- ✅ Todos os time_bank_entries
- ✅ Todos os absences
- ✅ Todos os users

**Mantém:**
- ✅ Organizations (estrutura)
- ✅ Schedules (jornadas)
- ✅ Departments (departamentos)

---

## 📊 Verificar Importação

Depois de importar, verifique os dados:

```bash
# Via terminal
curl http://localhost:3000/api/employees

# Resposta
{
  "success": true,
  "count": 56,
  "employees": [
    {
      "id": "uuid...",
      "name": "ADAN FREIRE PEREIRA",
      "registration": "001",
      "cpf": null,
      "email": null,
      "admission_date": "2026-05-07",
      "organization_id": "uuid...",
      "department_id": "uuid...",
      "schedule_id": "uuid..."
    },
    ...
  ]
}
```

---

## ⚙️ Fluxo Completo Recomendado

1. **Preparar dados** (no DPM Light)
   ```bash
   # Exportar CSV do DPM Light
   # Salvar como funcionarios.csv
   ```

2. **Limpar banco** (opcional)
   ```bash
   npm run clean-employees
   ```

3. **Importar dados**
   ```bash
   npm run import-dpm funcionarios.csv
   ```

4. **Verificar importação**
   ```bash
   curl http://localhost:3000/api/employees
   ```

5. **Usar sistema**
   - Enviar PDFs com ponto para `/api/upload/ponto`
   - Sistema agora terá dados reais dos funcionários

---

## 🐛 Troubleshooting

### Erro: "Arquivo não encontrado"
```bash
❌ Arquivo não encontrado: funcionarios.csv
```
**Solução:** Use o caminho completo ou coloque o arquivo na pasta do projeto
```bash
npm run import-dpm "./dados/funcionarios.csv"
```

### Erro: "CSV muito pequeno ou vazio"
```bash
❌ CSV muito pequeno ou vazio
```
**Solução:** Verifique se o arquivo tem cabeçalho + dados

### Erro: "Coluna Nome não encontrada"
```bash
❌ Coluna "Nome" não encontrada no CSV
```
**Solução:** Renomeie a coluna para "Nome" ou "NOME"

### Muitos duplicados?
Se muitos funcionários aparecem como "duplicados", é porque o `registration` já existe. Limpe antes:
```bash
npm run clean-employees
npm run import-dpm funcionarios.csv
```

---

## 📁 Estrutura de Dados

Após importação, a estrutura fica assim:

```
organizations (1)
└── Empresa

   departments (1)
   └── Geral
       └── employees (56)
           ├── ADAN FREIRE PEREIRA
           ├── ADRIANA CRISTINA DE JESUS AZEVEDO
           └── ... (mais 54)

   schedules (1)
   └── Expediente (8h/dia, Seg-Sex)

users (0 inicialmente)
```

---

## 🎯 Próximos Passos

Depois que os funcionários estiverem importados:

1. **Integração com PDFs:**
   - Upload PDF com dados de ponto
   - Sistema faz match com funcionários reais
   - Cria attendance_records e time_entries

2. **Dashboard Real:**
   - Ver horas trabalhadas por funcionário
   - Histórico de pontos
   - Relatórios de ponto

3. **Edição de Dados:**
   - Adicionar CPF/Email/Telefone
   - Ajustar jornada
   - Mudar departamento

---

## 📞 Suporte

Se tiver problemas:

1. Verifique o arquivo CSV está bem formatado
2. Confirme que o servidor está rodando: `npm run dev`
3. Teste a API: `curl http://localhost:3000/api/health`
4. Verifique .env tem credenciais Supabase corretas
5. Check database: Acesse Supabase dashboard

---

**✅ Pronto! Seu sistema agora tem dados reais!**
