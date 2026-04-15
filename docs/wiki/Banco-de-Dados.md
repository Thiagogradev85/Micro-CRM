# Banco de Dados

## Tabelas

| Tabela | Descrição |
|--------|-----------|
| `companies` | Empresas (tenants do SaaS) |
| `users` | Usuários autenticados, vinculados a uma empresa |
| `status` | Status do pipeline (Prospecção, Contatado, etc.) — por empresa |
| `sellers` | Vendedores — por empresa |
| `seller_ufs` | Estados atendidos por vendedor (N:N) |
| `catalogs` | Catálogos de produtos — por empresa |
| `products` | Produtos com specs técnicas completas |
| `clients` | Clientes (soft delete via `ativo`) — por empresa |
| `clients_backup` | Snapshots diários acumulativos de clientes (nunca apaga registros) |
| `observations` | Histórico de follow-ups por cliente |
| `daily_report_events` | Eventos do relatório diário |
| `settings` | Chaves de API e configurações gerais |
| `whatsapp_sessions` | Sessões persistidas do WhatsApp (Baileys) |

## Multi-tenancy

Todas as tabelas principais têm `company_id` (FK para `companies.id`).

```
companies
  └── users          (company_id FK RESTRICT)
  └── clients        (company_id FK RESTRICT)
  └── sellers        (company_id FK RESTRICT)
  └── status         (company_id FK RESTRICT)
  └── catalogs       (company_id FK RESTRICT)
```

**ON DELETE RESTRICT** em todas as FKs de `company_id` — excluir uma empresa com dados associados é bloqueado diretamente no PostgreSQL. Além disso, `CompanyModel.delete()` faz uma verificação prévia na aplicação antes de tentar a exclusão.

## Backup diário

A tabela `clients_backup` recebe um snapshot completo de `clients` toda noite às **2:00 BRT (05:00 UTC)**. Registros antigos **nunca são removidos** — o backup é acumulativo.

```sql
-- Snapshot manual (pode rodar a qualquer momento)
INSERT INTO clients_backup (backup_date, client_id, nome, ...)
SELECT CURRENT_DATE, id, nome, ... FROM clients;
```

## Status do pipeline

| # | Nome | Dispara evento |
|---|------|----------------|
| 1 | Prospecção | — |
| 2 | Contatado | `contacted` |
| 3 | Negociação | — |
| 4 | Proposta Enviada | — |
| 5 | Fechamento | — |
| 6 | Perdido | — |
| 7 | Em Análise | — |
| 8 | Follow-up | — |
| 9 | Cliente Ativo | — |
| 10 | Cliente Inativo | — |
| 11 | Catálogo | `catalog_requested` |
| 12 | Não Tem Interesse | Reset automático após 3 meses → Prospecção |
| 13 | Fabricação Própria | — |

## Eventos do relatório diário

| `event_type` | Quando é gerado | Repetição |
|---|---|---|
| `contacted` | Status → Contatado ou observação adicionada | 1x por dia por cliente |
| `new_client` | Cliente criado manualmente ou importado | 1x por cliente |
| `catalog_requested` | Status → Catálogo | 1x por dia por cliente |
| `purchased` | Clique em "Realizou Compra" | N vezes por dia |

O campo `event_date` usa o fuso horário de Brasília (`America/Sao_Paulo`), independente do fuso do servidor.

## Constraint de unicidade

```sql
CREATE UNIQUE INDEX daily_report_events_unique_non_purchase
  ON daily_report_events (client_id, event_type, event_date)
  WHERE event_type != 'purchased';
```

## Classificação de qualidade (nota)

| Nota | Critério |
|------|----------|
| 1 — Fraco | Sem WhatsApp e sem Instagram |
| 2 — Médio | Tem WhatsApp ou Instagram (não ambos) |
| 3 — Excelente | Tem WhatsApp e Instagram |

Atribuída automaticamente na importação. Editável manualmente.

## Migrações

```
server/migrations/
├── 001_schema.sql                        # Schema completo inicial
├── 002_add_tipo_to_products.sql
├── 003_add_fields_to_clients.sql
├── 004_fix_daily_report_timezone.sql     # Corrige event_date para fuso Brasília
├── 005_not_null_constraints.sql
├── 006_overdue_index.sql
├── 007_add_cnpj_ja_cliente.sql
├── 008_add_catalogo_enviado.sql
├── 009_cleanup_instagram_false_positives.sql
├── 010_settings_table.sql
├── 011_multi_tenant.sql                  # Tabela users + user_id nas tabelas principais
├── 012_seed_missing_user_statuses.sql
├── 013_nao_tem_interesse.sql             # Status + reset automático após 3 meses
├── 014_whatsapp_sessions.sql
├── 015_uf_nullable.sql                   # UF opcional (fila laranja)
├── 016_companies.sql                     # Tabela companies + company_id em tudo
├── 017_clients_backup.sql                # Tabela clients_backup (snapshots diários)
├── 018_admin_companies_page.sql          # Ajustes para gerenciamento no admin
└── 019_fix_cascade.sql                   # ON DELETE CASCADE → RESTRICT (segurança)
```
