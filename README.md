# ⚡ Leads CRM

**v2.0.0** — CRM multi-tenant para gestão de leads, prospecção, catálogos e envio em massa via WhatsApp e E-mail.

## Funcionalidades

- **Gestão de Clientes** — cadastro, filtros, notas, UFs, catálogo enviado, vendedor responsável
- **Importação / Exportação** — Excel (bulk upsert) e PDF
- **Catálogos & Produtos** — catálogos com produtos vinculados, exportação PDF, importação via PDF com IA
- **Vendedores** — por UF, atribuição automática
- **WhatsApp em Massa** — envio filtrado com delay configurável
- **E-mail em Massa** — templates com variáveis, anexo de catálogo em PDF
- **Prospecção** — busca no Google Maps via Serper/SerpApi/Brave/Bing/Google CSE
- **Enriquecimento** — busca dados faltantes via IA (Claude)
- **Relatório Diário** — eventos: novos clientes, contatados, catálogos solicitados, compras
- **Configurações** — chaves de API via UI, proteção por senha, reveal com confirmação
- **Multi-tenant** — login por usuário, dados isolados por user_id; admin gerencia contas

## Stack

| Camada     | Tecnologia                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Router      |
| Backend    | Node.js, Express, PostgreSQL (Neon)             |
| Auth       | JWT (httpOnly cookie), bcryptjs                 |
| IA         | Claude (Anthropic) — enriquecimento + importação|
| Busca      | Serper → SerpApi → Brave → Bing → Google CSE   |
| Deploy     | Render (backend + frontend servido pelo Express)|

## Arquitetura de Auth

Camadas completamente desacopladas — trocar JWT por outro mecanismo requer alterar apenas `utils/auth.js` e `middleware/authMiddleware.js`:

```
utils/auth.js                ← JWT: hashPassword, signToken, verifyToken
middleware/authMiddleware.js ← requireAuth, requireAdmin
routes/*.js                  ← router.use(requireAuth)
controllers/*.js             ← usa req.user.id (não conhece JWT)
```

## Configuração

### Variáveis de ambiente (servidor)

```env
DATABASE_URL=postgresql://...
JWT_SECRET=seu-segredo-jwt
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=senha-forte
ADMIN_NOME=Administrador
NODE_ENV=production
```

### Chaves de API (via Settings no app)

- `ANTHROPIC_API_KEY` — Claude (enriquecimento e importação PDF)
- `SERPER_API_KEY` — prospecção Google Maps
- `SERPAPI_KEY` — fallback de busca
- `BRAVE_SEARCH_API_KEY` — fallback Brave (pago $5/mês)
- `BING_SEARCH_API_KEY` — fallback Bing
- `GOOGLE_CSE_KEY` / `GOOGLE_CSE_CX` — fallback Google CSE (requer billing mesmo no plano gratuito)

## Banco de dados — Migrações

Execute em ordem no Neon SQL Editor:

```
server/migrations/001_*.sql  →  ...  →  server/migrations/011_multi_tenant.sql
```

## Desenvolvimento local

```bash
# Backend
cd server && npm install && npm run dev

# Frontend
cd client && npm install && npm run dev
```

Frontend: http://localhost:5173 (proxy `/api/*` → porta 8000)

## Deploy (Render)

1. Build command: `cd client && npm install && npm run build && cd ../server && npm install`
2. Start command: `node server/src/index.js`
3. Configurar variáveis de ambiente no dashboard do Render

---

Desenvolvido por **Thiago Gramuglia** — CNPJ 64.828.611/0001-05
