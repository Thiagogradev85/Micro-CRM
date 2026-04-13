/**
 * Overpass API (OpenStreetMap) — fallback gratuito para Prospecção.
 *
 * Versão 2 — Multi-tag search:
 *   Combina tag de categoria OSM (quando mapeada) + busca por palavras-chave
 *   no nome, tipo e outras tags do estabelecimento. Funciona para qualquer
 *   segmento digitado em português.
 *
 * Vantagens: 100% gratuito, sem chave de API, sem limite de uso.
 * Desvantagens: cobertura variável no interior, telefones/sites incompletos.
 *
 * Cadeia de fallback:
 *   Serper Maps → SerpAPI Maps → Overpass (este arquivo)
 *
 * Suporte geográfico:
 *   - Com cidade: admin_level 8/9 (município)
 *   - Só UF:      admin_level 4 (estado via ISO3166-2 BR-XX)
 *   - Sem nenhum: retorna null (busca muito ampla)
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Mapeamento de termos PT-BR → tag OSM exata (complementa a busca por nome)
const TERM_TAGS = [
  // Saúde
  ['farmac',       '["amenity"="pharmacy"]'],
  ['drogar',       '["amenity"="pharmacy"]'],
  ['clinic',       '["amenity"~"clinic|hospital|doctors"]'],
  ['hospital',     '["amenity"="hospital"]'],
  ['medic',        '["amenity"~"clinic|hospital|doctors"]'],
  ['dentist',      '["amenity"="dentist"]'],
  ['otica',        '["shop"="optician"]'],
  ['optic',        '["shop"="optician"]'],
  // Alimentação
  ['restaur',      '["amenity"="restaurant"]'],
  ['pizzar',       '["amenity"="restaurant"]'],
  ['lanch',        '["amenity"~"fast_food|cafe"]'],
  ['padari',       '["shop"="bakery"]'],
  ['confeit',      '["shop"="confectionery"]'],
  ['supermercad',  '["shop"="supermarket"]'],
  ['mercad',       '["shop"~"supermarket|convenience"]'],
  ['acougue',      '["shop"="butcher"]'],
  ['açougue',      '["shop"="butcher"]'],
  ['cafe',         '["amenity"="cafe"]'],
  ['sorvet',       '["amenity"~"cafe|ice_cream"]'],
  // Auto
  ['posto',        '["amenity"="fuel"]'],
  ['combustiv',    '["amenity"="fuel"]'],
  ['oficin',       '["shop"="car_repair"]'],
  ['mecanic',      '["shop"="car_repair"]'],
  ['lavagem',      '["amenity"="car_wash"]'],
  ['borrachei',    '["shop"="tyres"]'],
  // Bicicletas / Scooters / Patinetes
  ['biciclet',     '["shop"="bicycle"]'],
  ['scooter',      '["shop"="bicycle"]'],
  ['patinet',      '["shop"="bicycle"]'],
  ['ciclist',      '["shop"="bicycle"]'],
  ['veloci',       '["shop"="bicycle"]'],
  // Serviços pessoais
  ['academia',     '["leisure"="fitness_centre"]'],
  ['salao',        '["shop"~"hairdresser|beauty"]'],
  ['cabelel',      '["shop"="hairdresser"]'],
  ['barbeari',     '["shop"="hairdresser"]'],
  ['lavandar',     '["shop"~"laundry|dry_cleaning"]'],
  // Pets
  ['petshop',      '["shop"="pet"]'],
  ['pet shop',     '["shop"="pet"]'],
  ['veterinar',    '["amenity"="veterinary"]'],
  // Tecnologia
  ['celular',      '["shop"="mobile_phone"]'],
  ['informatic',   '["shop"="computer"]'],
  // Construção
  ['material de',  '["shop"~"hardware|doityourself"]'],
  ['ferramenta',   '["shop"="hardware"]'],
  ['construct',    '["shop"~"hardware|doityourself"]'],
  // Educação
  ['escola',       '["amenity"~"school|college"]'],
  ['creche',       '["amenity"="kindergarten"]'],
  ['universid',    '["amenity"="university"]'],
  // Livraria
  ['livrar',       '["shop"="books"]'],
]

// Palavras sem valor semântico para a busca OSM
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'uma', 'uns', 'umas', 'loja', 'lojas', 'empresa',
  'servico', 'serviço', 'servicos', 'serviços', 'comercio', 'comércio',
])

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Extrai palavras-chave significativas do segmento digitado pelo usuário.
 * Remove stopwords e palavras curtas.
 * Ex: "loja de bicicletas elétricas" → ["biciclet", "eletr"]  (prefixos de 6 chars)
 * Ex: "farmácia"                      → ["farmac"]
 */
function extractKeywords(segment) {
  return segment
    .split(/\s+/)
    .map(w => normalize(w.replace(/["\\]/g, '')))
    .filter(w => w.length >= 4 && !STOPWORDS.has(w))
    // Encurta para prefixo de 6 chars (melhor matching parcial no OSM)
    .map(w => (w.length > 6 ? w.slice(0, 6) : w))
    // Remove duplicatas
    .filter((w, i, arr) => arr.indexOf(w) === i)
}

/**
 * Constrói lista de filtros Overpass para o segmento.
 * Sempre inclui:
 *   1. Tag exata de categoria (se o segmento está mapeado em TERM_TAGS)
 *   2. Busca por palavras-chave no nome do estabelecimento
 *   3. Busca por palavras-chave no tipo (shop/amenity/craft/office/leisure)
 */
function buildOsmFilters(segment) {
  const norm = normalize(segment)
  const filters = []

  // 1. Tag de categoria exata (quando segmento é reconhecido)
  for (const [term, filter] of TERM_TAGS) {
    if (norm.includes(normalize(term))) {
      filters.push(filter)
      break
    }
  }

  // 2. Keywords extraídas → busca em múltiplas tags textuais
  const keywords = extractKeywords(segment)
  if (keywords.length > 0) {
    const pattern = keywords.join('|')
    // Nome do estabelecimento (mais importante)
    filters.push(`["name"~"${pattern}","i"]`)
    // Tipo de loja/serviço (shop, amenity, craft, office, leisure)
    filters.push(`["shop"~"${pattern}","i"]`)
    filters.push(`["amenity"~"${pattern}","i"]`)
    filters.push(`["craft"~"${pattern}","i"]`)
    filters.push(`["office"~"${pattern}","i"]`)
  } else {
    // Segmento muito curto ou todo stopwords — busca pelo texto completo no nome
    const escaped = segment.replace(/["\\]/g, '').trim()
    if (escaped) filters.push(`["name"~"${escaped}","i"]`)
  }

  return filters
}

/**
 * Constrói a cláusula de área OSM.
 *   Com cidade: admin_level 8 ou 9 (município/distrito)
 *   Só UF:      admin_level 4 via código ISO 3166-2 (BR-PR, BR-SP, etc.)
 *   Sem nenhum: retorna null (sem área = busca recusada)
 */
function buildAreaQL(city, uf) {
  if (city?.trim()) {
    const c = city.trim().replace(/["\\]/g, '')
    // Sem filtro de admin_level — capitais e cidades menores podem ter níveis
    // distintos no OSM (Salvador=8, mas nem sempre padronizado). A área mais
    // ampla pode retornar resultados de bairros homônimos, mas o volume de
    // resultados é limitado a 20 e a deduplicação por ID OSM evita duplicatas.
    return `area["name"~"^${c}$","i"]->.a;`
  }
  if (uf?.trim()) {
    // ISO 3166-2 é a forma mais confiável de encontrar o estado no OSM
    return `area["ISO3166-2"="BR-${uf.trim().toUpperCase()}"]->.a;`
  }
  return null
}

/**
 * Busca estabelecimentos no OpenStreetMap via Overpass API.
 * Retorna no mesmo shape que searchPlaces() do serper.js.
 *
 * Funciona com qualquer segmento em português.
 * Requer pelo menos cidade ou UF para delimitar a área de busca.
 */
export async function searchPlacesOverpass(segment, city, uf) {
  const areaQL = buildAreaQL(city, uf)
  if (!areaQL) {
    console.log('[Overpass] sem cidade nem UF — busca muito ampla, ignorando')
    return null
  }

  const filters = buildOsmFilters(segment)
  if (filters.length === 0) {
    console.log('[Overpass] nenhum filtro construído para o segmento')
    return null
  }

  // Monta query com union de todos os filtros (nwr = node|way|relation)
  const filterLines = filters.map(f => `  nwr${f}(area.a);`).join('\n')
  const query = `[out:json][timeout:30];
${areaQL}
(
${filterLines}
);
out center 20;`

  let response
  try {
    response = await fetch(OVERPASS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(35000),
    })
  } catch (err) {
    console.warn(`[Overpass] erro de rede: ${err.message}`)
    return null
  }

  if (!response.ok) {
    console.warn(`[Overpass] HTTP ${response.status}`)
    return null
  }

  let data
  try { data = await response.json() } catch { return null }

  // Deduplica por ID do elemento OSM (um mesmo lugar pode aparecer em vários filtros)
  const seen = new Set()
  const unique = (data.elements || []).filter(el => {
    if (!el.tags?.name) return false
    if (seen.has(el.id)) return false
    seen.add(el.id)
    return true
  })

  if (unique.length === 0) {
    const area = city?.trim() || uf?.trim() || '?'
    console.log(`[Overpass] 0 resultados para "${segment}" em "${area}"`)
    return null
  }

  const places = unique.slice(0, 20).map(el => {
    const tags = el.tags || {}

    const addrParts = [
      tags['addr:street'],
      tags['addr:housenumber'],
      tags['addr:suburb'],
      tags['addr:city'] || city || null,
      tags['addr:state'] || uf  || null,
    ].filter(Boolean)

    // Normaliza telefone: remove código de país BR e espaços
    const rawPhone = (tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '').trim()
    const phone = rawPhone
      ? rawPhone.replace(/^\+?55[-\s]?/, '').replace(/[-\s()]/g, '').trim() || null
      : null

    const website = tags.website || tags['contact:website'] || tags['contact:facebook'] || tags.url || null
    const type    = tags.amenity || tags.shop || tags.craft || tags.leisure || tags.office || null

    return {
      title:       tags.name,
      address:     addrParts.join(', ') || null,
      phone:       phone   || null,
      website:     website || null,
      rating:      null,
      ratingCount: null,
      type:        type    || null,
    }
  })

  const area = city?.trim() || uf?.trim() || '?'
  console.log(`[Overpass] ${places.length} resultados para "${segment}" em "${area}" (${filters.length} filtros)`)
  return { places, creditsUsed: 0, source: 'openstreetmap' }
}
