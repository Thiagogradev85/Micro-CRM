# CRM Scooter & Patinetes Elétricos

CRM mobile-first para gerenciamento de clientes, catálogos, vendedores, envio em massa via WhatsApp/e-mail e relatório diário.

---

## Stack

| Camada   | Tecnologia                                        |
|----------|---------------------------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS                    |
| Backend  | Node.js + Express                                 |
| Banco    | PostgreSQL — Neon.tech                            |
| IA       | Anthropic Claude (importação de catálogo por PDF) |
| Deploy   | Render (API + Static Site)                        |

---

## Rodar localmente

```bash
# Backend
cd server && npm install && npm run dev   # http://localhost:8000

# Frontend
cd client && npm install && npm run dev   # http://localhost:5173
```

### Variáveis de ambiente — `server/.env`

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...
SERPER_API_KEY=sua-chave-aqui
PORT=8000
NODE_ENV=development
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (Neon.tech) |
| `ANTHROPIC_API_KEY` | ✅ | Chave Claude API — importação de catálogo PDF |
| `SERPER_API_KEY` | ✅ | Chave Serper API — módulo de Prospecção de Clientes |
| `PORT` | — | Porta do servidor (padrão: `8000`) |

> **Obter chaves:**
> - Anthropic: [console.anthropic.com](https://console.anthropic.com)
> - Serper: [serper.dev](https://serper.dev) — plano gratuito inclui **2.500 buscas/mês**

---

## Módulo de Prospecção de Clientes

O módulo de prospecção busca empresas no **Google Maps via Serper API** e filtra automaticamente clientes já cadastrados no banco.

### Como usar

1. Acesse **Prospecção** no menu lateral (ícone 🔭)
2. Preencha:
   - **Segmento** — tipo de negócio. Separe por vírgulas para buscar múltiplos segmentos de uma vez (ex: `farmácia, clínica, mercado`)
   - **Estado** — UF opcional para refinar a busca
   - **Cidade** — cidade opcional
3. Clique em **Buscar prospects**
4. O sistema retorna:
   - ✅ **Novos** — empresas não cadastradas (selecionáveis)
   - ⚪ **Já existem** — empresas que já estão na base (bloqueadas)
5. Selecione os desejados e clique em **Salvar selecionados**

> Quando múltiplos segmentos são informados, o sistema faz uma busca separada para cada um e combina os resultados, maximizando o número de prospects encontrados.

### Detecção de duplicatas

A deduplicação usa **similaridade fuzzy** para identificar empresas já cadastradas:
- Telefone idêntico
- Nome contém o outro (substring)
- Similaridade Jaccard ≥ 60% das palavras significativas
- Distância de edição (Levenshtein) ≤ 20% do tamanho do nome

### Verificar duplicatas no banco

Na tela de **Clientes**, clique em **Duplicatas** para escanear toda a base e encontrar registros similares. O sistema exibe grupos de possíveis duplicatas e permite excluir o registro redundante diretamente.

### Limite do plano gratuito Serper

O plano **free** oferece **2.500 buscas/mês** (cada segmento consome 1 crédito), com renovação automática no início de cada mês.
Ao atingir o limite, um modal avisará o usuário com opção de assinar um plano pago em [serper.dev](https://serper.dev).

### Configurar a chave Serper

```bash
# 1. Acesse https://serper.dev e crie uma conta gratuita
# 2. Copie sua API Key no dashboard
# 3. Adicione ao server/.env:
SERPER_API_KEY=sua-chave-aqui
```

---

## Deploy — Render

| Serviço        | Root Dir | Build           | Start       |
|----------------|----------|-----------------|-------------|
| API (Web)      | `server` | `npm ci`        | `npm start` |
| App (Static)   | `client` | `npm ci && npm run build` | — |

Variáveis necessárias no Render: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, `NODE_ENV=production`.

---

## Sistema de Modais

Todos os modais de feedback e confirmação passam pelo hook centralizado `useModal`:

```jsx
import { useModal } from '../hooks/useModal.js'

const { modal, showModal } = useModal()

// Alerta simples
showModal({ type: 'success', title: 'Salvo!', message: 'Operação concluída.' })
showModal({ type: 'error',   title: 'Erro',   message: err.message })

// Confirmação com ações
showModal({
  type: 'warning',
  title: 'Excluir cliente?',
  message: 'Esta ação não pode ser desfeita.',
  actions: [
    { label: 'Excluir', variant: 'danger', onClick: () => handleDelete() },
  ],
})

// No JSX da página:
return <div>{modal} ...</div>
```

| Tipo | Ícone | Uso |
|------|-------|-----|
| `success` | ✅ verde | Operação concluída |
| `error` | ❌ vermelho | Falha / exceção |
| `warning` | ⚠️ amarelo | Confirmação destrutiva |
| `info` | ℹ️ azul | Informação neutra |

**Nunca usar modais inline nas páginas.** Modais complexos (ex: lista de duplicatas) vivem em `components/` como componentes dedicados.

---

## Documentação completa

Acesse o **[Wiki do repositório](https://github.com/Thiagogradev85/Leads-React-JS/wiki)** para:

- Arquitetura e estrutura de pastas
- Banco de dados — tabelas e eventos
- API — todos os endpoints
- Módulo WhatsApp (Baileys)
- Módulo E-mail (Nodemailer)
- Sistema de modais (AppModal + useModal)
- Versioning e releases
