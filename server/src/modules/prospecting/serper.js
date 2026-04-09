import { AppError }           from '../../utils/AppError.js'
import { searchWebSerpApi }   from './serpApiSearch.js'

const SERPER_MAPS_URL   = 'https://google.serper.dev/maps'
const SERPER_SEARCH_URL = 'https://google.serper.dev/search'

// ── Rastreamento do limite Serper ─────────────────────────────────────────────
// Registra quando o limite de créditos foi atingido para calcular a data de reset.
let serperLimitHitAt = null

/**
 * Retorna o status atual do limite Serper.
 * resetDate: plano free renova no dia 1 do mês seguinte ao limite.
 * @returns {{ hitAt: string, resetDate: string } | null}
 */
export function getSerperLimitStatus() {
  if (!serperLimitHitAt) return null
  const hit   = new Date(serperLimitHitAt)
  const reset = new Date(hit.getFullYear(), hit.getMonth() + 1, 1)
  return { hitAt: serperLimitHitAt, resetDate: reset.toISOString() }
}

// ── Serper Maps ───────────────────────────────────────────────────────────────

/**
 * Searches Google Maps via Serper API for businesses matching the query.
 *
 * @param {string} query - Search query (e.g. "farmácias Curitiba PR")
 * @returns {{ places: object[], creditsUsed: number }}
 */
export async function searchPlaces(query) {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new AppError('SERPER_API_KEY não configurada no servidor.', 500)

  let response
  try {
    response = await fetch(SERPER_MAPS_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: 20 }),
    })
  } catch {
    throw new AppError('Falha ao conectar com a API Serper. Verifique sua conexão.', 502)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg  = (body.message || '').toLowerCase()
    console.error(`[Serper] ${response.status} para query="${query}" body=`, JSON.stringify(body))

    if (msg.includes('not enough credits') || msg.includes('credits') || msg.includes('quota') || msg.includes('limit') || msg.includes('exceeded')) {
      serperLimitHitAt = serperLimitHitAt || new Date().toISOString()
      throw new AppError('SERPER_LIMIT_REACHED', 402)
    }
    if (response.status === 403) throw new AppError('Chave Serper inválida. Verifique a SERPER_API_KEY no servidor.', 403)
    throw new AppError(`Erro na API Serper: ${response.status}`, 502)
  }

  // Chamada bem-sucedida — limpa flag de limite
  serperLimitHitAt = null

  const data = await response.json()
  const creditsUsed = parseInt(response.headers.get('X-API-KEY-Usage-Count') || '0', 10)
  return { places: data.places || [], creditsUsed }
}

// ── Serper Web Search (interno) ───────────────────────────────────────────────

async function _searchWebSerper(query) {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new AppError('SERPER_API_KEY não configurada no servidor.', 500)

  let response
  try {
    response = await fetch(SERPER_SEARCH_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: 10 }),
    })
  } catch {
    throw new AppError('Falha ao conectar com a API Serper.', 502)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg  = (body.message || '').toLowerCase()
    console.error(`[Serper] ${response.status} para query="${query}" body=`, JSON.stringify(body))

    if (msg.includes('not enough credits') || msg.includes('credits') || msg.includes('quota') || msg.includes('limit') || msg.includes('exceeded')) {
      throw new AppError('SERPER_LIMIT_REACHED', 402)
    }
    if (response.status === 403) throw new AppError('Chave Serper inválida.', 403)
    throw new AppError(`Erro na API Serper: ${response.status}`, 502)
  }

  // Chamada bem-sucedida — limpa flag de limite
  serperLimitHitAt = null

  const data = await response.json()
  const creditsUsed = parseInt(response.headers.get('X-API-KEY-Usage-Count') || '0', 10)

  return {
    organic:        data.organic        || [],
    knowledgeGraph: data.knowledgeGraph || null,
    localResults:   data.local          || [],
    creditsUsed,
  }
}

// ── searchWeb público — Serper com fallback Google CSE ────────────────────────

/**
 * Searches Google Web — tenta Serper primeiro, cai para Google CSE se limite atingido.
 *
 * @param {string} query
 * @returns {{ organic, knowledgeGraph, localResults }}
 */
export async function searchWeb(query) {
  // Se o limite já foi registrado nesta sessão, vai direto ao fallback
  if (serperLimitHitAt) {
    const cse = await searchWebSerpApi(query)
    if (cse) return cse
    throw new AppError('SERPER_LIMIT_REACHED', 402)
  }

  try {
    return await _searchWebSerper(query)
  } catch (err) {
    // Limite atingido agora — registra e tenta CSE como fallback
    if (err.message === 'SERPER_LIMIT_REACHED') {
      serperLimitHitAt = serperLimitHitAt || new Date().toISOString()
      console.warn(`[Serper] Limite atingido em ${serperLimitHitAt} — tentando Google CSE...`)
      const cse = await searchWebSerpApi(query)
      if (cse) return cse
      throw err  // nenhum fallback disponível — propaga SERPER_LIMIT_REACHED
    }
    throw err
  }
}
