/**
 * Validação de municípios brasileiros via API do IBGE.
 *
 * Endpoint: GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios
 * Gratuita, pública, sem autenticação.
 *
 * Cache lazy por UF — busca uma vez, reutiliza enquanto o servidor estiver no ar.
 * Se a API estiver indisponível, a validação retorna `true` (deixa passar)
 * para não bloquear o enriquecimento por falha externa.
 */

// Map<UF, Set<nomeNormalizado>>
const cache = new Map()

function normalize(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
}

async function fetchMunicipios(uf) {
  if (cache.has(uf)) return cache.get(uf)

  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
      { signal: AbortSignal.timeout(5000) } // timeout 5s
    )
    if (!res.ok) return null

    const data = await res.json()
    const set = new Set(data.map(m => normalize(m.nome)))
    cache.set(uf, set)
    return set
  } catch {
    // IBGE indisponível — não bloqueia o enriquecimento
    return null
  }
}

/**
 * Verifica se `city` é um município válido do estado `uf`.
 *
 * Retorna:
 *   { valid: true }                        — município confirmado pelo IBGE
 *   { valid: false }                       — não existe no estado, descartar
 *   { valid: true, unavailable: true }     — IBGE fora do ar, deixar passar mas sinalizar
 */
export async function validateCity(city, uf) {
  if (!city || !uf) return { valid: false }
  const municipios = await fetchMunicipios(uf.toUpperCase())
  if (!municipios) return { valid: true, unavailable: true }
  return { valid: municipios.has(normalize(city)) }
}
