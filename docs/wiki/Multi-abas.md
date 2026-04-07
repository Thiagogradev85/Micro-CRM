# Multi-abas e Sincronização

Introduzido na **v1.6.0**.

## Abertura em nova janela

Ao clicar no nome de um cliente ou no ícone de olho (👁) na lista, o detalhe do cliente abre em uma **nova aba do browser**. Isso permite trabalhar com vários clientes simultaneamente sem perder o contexto da lista.

Implementado via `<a href="/clients/:id" target="_blank" rel="noopener noreferrer">` — comportamento nativo do browser: Ctrl+clique, clique do meio e clique direito → "Abrir em nova aba" funcionam normalmente.

## Proteção contra conflito de edição

Quando o mesmo cliente está aberto em duas abas e ambas tentam salvar, o sistema detecta o conflito e avisa.

### Como funciona

1. Ao carregar o cliente, o frontend armazena o `updated_at` do banco
2. Ao salvar, envia o `updated_at` junto com o payload
3. O backend compara em JavaScript:

```javascript
const dbMs     = new Date(previous.updated_at).getTime()
const clientMs = new Date(clientUpdatedAt).getTime()
if (dbMs !== clientMs) return 'CONFLICT'
```

4. Se não bater, retorna HTTP 409
5. O frontend mostra modal com duas opções:
   - **Recarregar** — descarta edições e carrega dados atuais
   - **Forçar salvar** — sobrescreve (envia sem `updated_at`)

> A comparação é feita em milissegundos no Node.js para evitar problemas de precisão de microssegundos do PostgreSQL vs JSON.

## Sincronização automática da lista

Quando uma edição é salva na aba de detalhe, a lista principal (em outra aba) atualiza automaticamente via **BroadcastChannel** — API nativa do browser, sem polling.

### Fluxo

```
Aba detalhe: salva cliente
    → BroadcastChannel('crm_clients').postMessage({ type: 'client_updated', id })

Aba lista: ouve o canal
    → State view: invalida cache da UF e recarrega UFs abertas
    → List view: chama load() para recarregar a página atual
```

### Código relevante

| Arquivo | O que faz |
|---------|-----------|
| `client/src/pages/ClientDetailPage.jsx` | Emite o broadcast após `saveClient()` |
| `client/src/pages/ClientsPage.jsx` | Ouve o canal via `useEffect`, invalida `ufCache` |
