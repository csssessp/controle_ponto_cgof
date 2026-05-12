# 🚀 QUICK START - CHRONOS PONTO

## ⚡ Comando Rápido para Começar

```bash
npm run dev
```

Servidor rodando em: **http://localhost:3000**

---

## 📋 O Que Fazer Agora?

### ✅ Você Tem:
- [x] 54 funcionários reais no banco
- [x] Servidor rodando
- [x] APIs prontas
- [x] Scripts de importação

### 📥 Próximo Passo:
1. **Exportar** arquivo de ponto do DPM Light (PDF ou CSV)
2. **Enviar** para o servidor
3. **Sistema** faz parsing automático
4. **Dados** salvos no banco

---

## 🎯 3 FORMAS DE USAR

### **Forma 1: Importar CSV do DPM Light (Recomendado)**

```bash
npm run import-dpm funcionarios.csv
```

**Resultado:** Novos funcionários adicionados ao banco

---

### **Forma 2: Upload PDF com Ponto**

**PowerShell:**
```powershell
# Converter PDF para base64
$pdf = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ponto.pdf"))

# Enviar para parsing
$json = @{ base64 = $pdf } | ConvertTo-Json
curl -X POST http://localhost:3000/api/upload/ponto `
  -H "Content-Type: application/json" `
  -d $json
```

**Resultado:** Dados parseados com Gemini AI

---

### **Forma 3: API HTTP Pura**

```bash
# 1. Upload CSV
POST /api/import/dpm-light/csv
Body: {"base64":"..."}

# 2. Upload PDF
POST /api/upload/ponto
Body: {"base64":"..."}

# 3. Salvar dados
POST /api/upload/ponto/save
Body: {"employees":[...]}

# 4. Ver funcionários
GET /api/employees

# 5. Ver ponto específico
GET /api/attendance/{employee-id}
```

---

## 📊 Dados No Banco

**54 Funcionários Importados:**

```
1. ADAN FREIRE PEREIRA
2. ADRIANA CRISTINA DE JESUS AZEVEDO
3. ALEXSANDRA BERTACO SEVERINO
... (+ 51 mais)
54. WANDER HELENO SALLES
```

**Verificar:**
```bash
curl http://localhost:3000/api/employees
```

---

## 🛠️ Scripts Disponíveis

```bash
# Importar funcionários (1x)
npm run import-employees

# Importar CSV do DPM Light
npm run import-dpm arquivo.csv

# Limpar TODOS os dados
npm run clean-employees

# Compilar TypeScript
npm run lint

# Build para produção
npm run build

# Iniciar servidor
npm run dev
```

---

## 🔧 Troubleshooting

| Problema | Solução |
|----------|---------|
| **Porta 3000 ocupada** | `taskkill /F /IM node.exe` |
| **Sem funcionários no banco** | `npm run import-employees` |
| **API retorna erro 500** | Verificar `.env` e credenciais Supabase |
| **PDF não é parseado** | Verificar se é PDF válido com texto |

---

## 📁 Arquivos Importantes

```
chronos-ponto/
├── .env ...................... Credenciais (não modificar)
├── server.ts ................. Backend (não modificar)
├── import-employees.ts ....... Usar: npm run import-employees
├── import-dpm-light.ts ....... Usar: npm run import-dpm <csv>
├── clean-employees.ts ........ Usar: npm run clean-employees
├── IMPORT_GUIDE.md ........... Documentação completa
├── README_FINAL.md ........... Status final
└── src/services/pdfService.ts  Parsing com Gemini (não modificar)
```

---

## 💡 Exemplo Completo

### Cenário: Importar Ponto do DPM Light

**Passo 1: Exportar CSV do DPM Light**
```
Menu → Cadastro → Funcionários → Exportar → CSV
Salvar como: funcionarios.csv
```

**Passo 2: Importar no Chronos**
```bash
npm run import-dpm funcionarios.csv
```

**Passo 3: Verificar**
```bash
curl http://localhost:3000/api/employees | jq '.count'
# Resposta: 54
```

**Pronto!** ✅

---

## 📞 APIs Disponíveis

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/api/health` | Verificar server |
| GET | `/api/employees` | Listar funcionários |
| GET | `/api/attendance/:id` | Ver ponto do funcionário |
| POST | `/api/upload/ponto` | Upload PDF |
| POST | `/api/upload/ponto/save` | Salvar dados parseados |
| POST | `/api/import/dpm-light/csv` | Importar CSV |

---

## ✅ Checklist

- [x] Servidor rodando
- [x] 54 funcionários no banco
- [x] APIs testadas
- [x] Scripts criados
- [x] Documentação completa

**Próximo:** Enviar dados de ponto (PDF ou CSV)

---

## 🚨 Se Algo Der Errado

1. **Parar servidor:** Ctrl+C no terminal
2. **Reiniciar servidor:** `npm run dev`
3. **Limpar dados:** `npm run clean-employees`
4. **Re-importar:** `npm run import-employees`
5. **Verificar logs:** Console do servidor

---

**🎊 Pronto para usar! Boa sorte!**
