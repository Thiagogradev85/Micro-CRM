# Arquitetura

## Estrutura de pastas

```
├── client/src/
│   ├── components/     # AppModal, Toast, Sidebar, ClientForm, ...
│   ├── contexts/       # AuthContext (user, login, logout, company_id)
│   ├── hooks/          # useModal (feedback visual em todas as páginas)
│   ├── pages/          # Uma página por módulo + AdminCompaniesPage, AdminUsersPage
│   └── utils/          # api.js (cliente HTTP), constants.js
│
└── server/src/
    ├── controllers/    # Handlers HTTP — usam AppError + next(err)
    ├── models/         # Queries SQL — sempre filtram por company_id
    ├── middleware/     # authMiddleware (requireAuth, requireAdmin)
    ├── modules/        # Lógica de negócio isolada por domínio
    │   ├── ai-import/      # Importação de catálogo via PDF (Anthropic Claude)
    │   ├── email/          # Envio em massa via SMTP (Nodemailer)
    │   ├── file-export/    # Export Excel/PDF de clientes e relatório
    │   ├── file-import/    # Import de clientes via Excel
    │   └── whatsapp/       # Envio em massa via WhatsApp Web (Baileys)
    ├── routes/         # Roteamento Express
    └── utils/          # AppError.js, auth.js (JWT primitivos)
```

## Módulos

Cada módulo em `server/src/modules/` expõe um `index.js` com exports nomeados. Os controllers importam apenas pelo caminho do módulo.

| Módulo        | Responsabilidade |
|---------------|-----------------|
| `ai-import`   | Lê PDF de catálogo com Claude, retorna produtos como JSON |
| `email`       | Configura SMTP, envia teste e envio em massa com delay |
| `file-export` | Gera Excel (ExcelJS) e PDF (PDFKit) de clientes e relatório |
| `file-import` | Parse de .xlsx com mapeamento flexível de colunas |
| `whatsapp`    | Singleton Baileys: QR, conexão, sendBulk com callbacks |

## Fluxo de uma requisição

```
Browser → Vite proxy /api → Express router → requireAuth → Controller → Model (SQL) → PostgreSQL (Neon)
                                                               ↓ erro
                                                        AppError → middleware global → res.status(code).json
```

## Multi-tenant SaaS

### Isolamento por empresa

Todos os dados pertencem a uma empresa (`company_id`). O fluxo de isolamento:

```
Login
  └── AuthController.login()
        └── signToken({ id, email, nome, role, company_id })
              └── JWT gravado em httpOnly cookie

Toda requisição autenticada
  └── requireAuth (middleware)
        └── verifyToken → req.user = { id, email, nome, role, company_id }
              └── Controller usa req.user.company_id
                    └── Model filtra WHERE company_id = $X no SQL
```

**Regra**: controllers e models nunca importam `utils/auth.js`. O `company_id` chega via `req.user.company_id`.

### Proteção contra perda de dados

Três camadas independentes impedem a exclusão acidental de dados ao deletar uma empresa:

1. **Banco de dados** — `ON DELETE RESTRICT` em todas as FKs de `company_id` (migration 019). O PostgreSQL bloqueia o `DELETE` diretamente.
2. **Aplicação** — `CompanyModel.delete()` conta os clientes antes de tentar excluir e rejeita com HTTP 409 se houver dados.
3. **Backup acumulativo** — `clients_backup` recebe snapshot diário às 2h BRT. Registros antigos nunca são removidos.

## Auth (desacoplada)

```
utils/auth.js          ← JWT primitivos (sign, verify) — não conhece Express
  → authMiddleware.js  ← Express middleware, lê cookie, popula req.user
    → routes           ← router.use(requireAuth)
      → controllers    ← só usam req.user.id / req.user.company_id
        → models       ← recebem companyId como parâmetro, filtram no SQL
```

## Tarefas agendadas (meia-noite de Brasília)

```
server/src/index.js → agendarResetMeiaNoite()   ← Contatado → Prospecção
                    → resetNaoTemInteresse()      ← Não Tem Interesse → Prospecção após 3 meses
                    → assignSellersToClients()    ← Auto-assign por UF
                    → agendarBackupDiario()       ← Snapshot em clients_backup às 2h BRT
```

O agendador usa `setTimeout` recursivo ancorado na data de Brasília (UTC-3), não no fuso do servidor.
