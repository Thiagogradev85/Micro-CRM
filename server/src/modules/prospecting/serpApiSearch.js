/**
 * SerpApi — fallback gratuito ao Serper.
 *
 * Plano gratuito: 100 buscas/mês, sem cartão de crédito.
 * Cadastro: serpapi.com → Register → Dashboard → copiar API Key
 * Configuração: SERPAPI_KEY no .env
 *
 * Retorna o mesmo shape que searchWeb() do serper.js:
 *   { organic: [{ link, title, snippet }], knowledgeGraph: null, localResults: [] }
 *
 * Retorna null se não configurado ou se ocorrer erro.
 */

const SERPAPI_URL = 'https://serpapi.com/search.json'

export async function searchWebSerpApi(query) {
  const key = process.env.SERPAPI_KEY
  if (!key) return null  // não configurado

  const params = new URLSearchParams({
    q:       query,
    api_key: key,
    engine:  'google',
    gl:      'br',
    hl:      'pt',
    num:     '10',
  })

  let response
  try {
    response = await fetch(`${SERPAPI_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    return null  // timeout ou erro de rede
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    console.warn(`[SerpApi] ${response.status} query="${query}":`, body?.error || '')
    return null
  }

  const data  = await response.json()

  // Verifica erro no corpo (SerpApi retorna 200 mesmo em erros de quota)
  if (data.error) {
    console.warn(`[SerpApi] erro query="${query}":`, data.error)
    return null
  }

  const items = data.organic_results || []

  const organic = items.map(item => ({
    link:    item.link    || '',
    title:   item.title   || '',
    snippet: item.snippet || '',
  }))

  console.log(`[SerpApi] ${organic.length} resultados para "${query}"`)
  return { organic, knowledgeGraph: data.knowledge_graph || null, localResults: [] }
}
