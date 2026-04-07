# Performance da Lista de Clientes

Introduzido na **v1.6.0**.

## Problema anterior

A lista carregava **todos os clientes de uma vez** (`limit=9999`), o que causava:
- Lentidão ao digitar no campo de busca (API call a cada tecla)
- Renderização pesada com centenas de linhas no DOM
- Travamento ao expandir todas as UFs simultaneamente

## Soluções implementadas

### 1. Lazy load por UF (State view)

A view "Por Estado" nunca mais carrega todos os clientes de uma vez.

**Fluxo:**
1. Página abre → carrega apenas `GET /clients/ufs` (lista de UFs + contagem) — query ultra-leve
2. Seções de UF aparecem imediatamente com o cabeçalho e contagem correta
3. Ao clicar para abrir uma UF → carrega os clientes dessa UF
4. Cache por sessão: segunda abertura da mesma UF é instantânea
5. Com filtros ativos (status, UF, etc.) → `/clients/ufs?status_id=X` filtra as contagens no backend

**Endpoint:**
```
GET /api/clients/ufs?status_id=&ativo=&ja_cliente=&catalogo_enviado=&search=
→ [{ uf: "SC", count: 671 }, { uf: "SP", count: 230 }, ...]
```

### 2. Paginação real no backend (List view)

A view "Lista" envia `limit=50&page=N&sort=X` ao backend — nunca carrega mais que 50 clientes.

Ordenação pelo banco:

| `sort` param | ORDER BY |
|---|---|
| `nome_asc` | `c.nome ASC` |
| `nome_desc` | `c.nome DESC` |
| `contato_asc` | `c.ultimo_contato ASC NULLS FIRST` |
| `contato_desc` | `c.ultimo_contato DESC NULLS LAST` |
| _(padrão)_ | `c.created_at DESC` |

### 3. SearchInput isolado (debounce sem re-render)

O campo de busca é um componente `memo` separado — digitar só re-renderiza ele, não o `ClientsPage` inteiro.

- Estado local do input atualiza imediatamente (sem lag visual)
- Debounce de 300ms antes de chamar `setFilter('search', val)` e disparar a API

### 4. React.memo + useMemo

| Componente/valor | Otimização |
|---|---|
| `ClientRow` | `React.memo` — só re-renderiza se as props mudarem |
| `UFSection` | `React.memo` — idem |
| `tableHead` | `useMemo` — recalcula só ao mudar ordenação |
| `rowProps` | `useMemo` — objeto estável entre renders |
| `sortClients` | `useCallback` — função estável |

### 5. Paginação interna no UFSection

Mesmo após carregar os dados de uma UF, o `UFSection` renderiza no máximo **50 linhas por vez**. Botão "Ver mais (N restantes)" exibe o próximo lote sob demanda.

Evita inserir 671 `<tr>` no DOM de uma vez ao abrir SC.
