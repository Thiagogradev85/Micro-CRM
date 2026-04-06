import { searchWeb } from './serper.js'

// ── Helpers de extração ───────────────────────────────────────────────────────

// Segmentos de URL do Instagram que não são handles de perfil
const IG_BLOCKED = new Set([
  'p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts',
  'about', 'help', 'legal', 'privacy', 'directory', 'hashtag',
  'web', 'ar', 'share', 'sharer', 'login', 'signup', 'embed',
])

function extractInstagram(text) {
  // Só extrai a partir de URL real: instagram.com/handle
  // Nunca usa fallback @handle — muito propenso a falsos positivos
  const matches = [...text.matchAll(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]{3,30})(?:[/?#]|$)/gi)]
  for (const m of matches) {
    const handle = m[1]
    if (!IG_BLOCKED.has(handle.toLowerCase())) return handle
  }
  return null
}

function extractFacebook(text) {
  // facebook.com/slug ou facebook.com/pages/nome/id ou fb.com/slug
  const match = text.match(/(?:facebook\.com|fb\.com)\/(?:pages\/[^/?#]+\/\d+\/?|)([A-Za-z0-9._-]{3,80})(?:[/?#]|$)/i)
  if (!match) return null
  const slug = match[1]
  const blocked = ['share', 'sharer', 'permalink', 'photo', 'video', 'groups',
                   'events', 'login', 'marketplace', 'watch', 'gaming', 'profile.php', 'people']
  if (blocked.some(b => slug.toLowerCase().includes(b))) return null
  return slug
}

function extractEmail(text) {
  const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (!match) return null
  const email = match[1].toLowerCase()
  const blocked = ['noreply', 'no-reply', 'mailer', 'bounce', 'example', 'sentry',
                   'wixpress', 'google', 'facebook', 'instagram', 'sampleemail']
  if (blocked.some(b => email.includes(b))) return null
  return email
}

// DDDs válidos por UF — usado para validar se o telefone encontrado bate com o estado do cliente
const UF_DDDS = {
  AC: ['68'],
  AL: ['82'],
  AM: ['92', '97'],
  AP: ['96'],
  BA: ['71', '73', '74', '75', '77'],
  CE: ['85', '88'],
  DF: ['61'],
  ES: ['27', '28'],
  GO: ['62', '64'],
  MA: ['98', '99'],
  MG: ['31', '32', '33', '34', '35', '37', '38'],
  MS: ['67'],
  MT: ['65', '66'],
  PA: ['91', '93', '94'],
  PB: ['83'],
  PE: ['81', '87'],
  PI: ['86', '89'],
  PR: ['41', '42', '43', '44', '45', '46'],
  RJ: ['21', '22', '24'],
  RN: ['84'],
  RO: ['69'],
  RR: ['95'],
  RS: ['51', '53', '54', '55'],
  SC: ['47', '48', '49'],
  SE: ['79'],
  SP: ['11', '12', '13', '14', '15', '16', '17', '18', '19'],
  TO: ['63'],
}

function dddMatchesUF(digits, uf) {
  if (!uf) return true  // sem UF cadastrada, aceita qualquer DDD
  const validDDDs = UF_DDDS[uf.toUpperCase()]
  if (!validDDDs) return true  // UF desconhecida, não rejeita
  const ddd = digits.slice(0, 2)
  return validDDDs.includes(ddd)
}

function extractPhone(text, uf = null) {
  // Formatos brasileiros: (DD) 9xxxx-xxxx | DD 9xxxx-xxxx | +55 DD xxx | DDD sem parênteses
  const matches = text.match(
    /(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)(?:9[\s.-]?\d{4}|\d{4})[\s.-]?\d{4}/g
  )
  if (!matches) return null
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, '').replace(/^55/, '')
    if ((digits.length === 10 || digits.length === 11) && dddMatchesUF(digits, uf)) {
      return digits
    }
  }
  return null
}

// Extrai dados do knowledgeGraph do Serper (painel de conhecimento do Google)
function parseKnowledgeGraph(kg, uf = null) {
  if (!kg) return {}
  const result = {}

  // Telefone direto
  const phone = kg.phoneNumber || kg.phone || ''
  if (phone) {
    const digits = phone.replace(/\D/g, '').replace(/^55/, '')
    if ((digits.length === 10 || digits.length === 11) && dddMatchesUF(digits, uf)) {
      result.phone = digits
    }
  }

  // Email direto
  const email = kg.email || ''
  if (email) result.email = extractEmail(email) || undefined

  // Website — pode conter links de redes sociais
  const website = kg.website || kg.url || ''
  if (website) {
    if (!result.instagram && website.includes('instagram.com')) result.instagram = extractInstagram(website)
    if (!result.facebook  && website.includes('facebook.com'))  result.facebook  = extractFacebook(website)
  }

  // Profiles / sitelinks do knowledge graph
  const profiles = kg.profiles || []
  for (const p of profiles) {
    const url = (p.url || p.link || '').toLowerCase()
    if (!result.instagram && url.includes('instagram')) result.instagram = extractInstagram(url)
    if (!result.facebook  && url.includes('facebook'))  result.facebook  = extractFacebook(url)
  }

  // Varre todos os textos do KG em busca de redes sociais / contato
  const kgText = JSON.stringify(kg)
  if (!result.instagram) result.instagram = extractInstagram(kgText) || undefined
  if (!result.facebook)  result.facebook  = extractFacebook(kgText)  || undefined
  if (!result.email)     result.email     = extractEmail(kgText)     || undefined
  if (!result.phone)     result.phone     = extractPhone(kgText, uf) || undefined

  return result
}

// Varre resultados orgânicos e local em busca de dados
function parseResults({ organic = [], localResults = [], knowledgeGraph = null }, uf = null) {
  const found = { instagram: null, facebook: null, email: null, phone: null }

  // Knowledge graph tem prioridade — dados mais confiáveis
  const kg = parseKnowledgeGraph(knowledgeGraph, uf)
  if (kg.instagram) found.instagram = kg.instagram
  if (kg.facebook)  found.facebook  = kg.facebook
  if (kg.email)     found.email     = kg.email
  if (kg.phone)     found.phone     = kg.phone

  // Resultados locais (Google Maps inline) — geralmente têm telefone
  for (const local of localResults) {
    const localText = JSON.stringify(local)
    if (!found.phone)     found.phone     = extractPhone(localText, uf)
    if (!found.email)     found.email     = extractEmail(localText)
    if (!found.instagram) found.instagram = extractInstagram(localText)
    if (!found.facebook)  found.facebook  = extractFacebook(localText)
    if (found.phone && found.email && found.instagram && found.facebook) break
  }

  // Resultados orgânicos
  for (const r of organic.slice(0, 10)) {
    const texts = [
      r.link    || '',
      r.title   || '',
      r.snippet || '',
      ...(r.sitelinks || []).map(s => `${s.title || ''} ${s.link || ''}`),
    ].join(' ')

    if (!found.instagram) found.instagram = extractInstagram(texts)
    if (!found.facebook)  found.facebook  = extractFacebook(texts)
    if (!found.email)     found.email     = extractEmail(texts)
    if (!found.phone)     found.phone     = extractPhone(texts, uf)

    if (found.instagram && found.facebook && found.email && found.phone) break
  }

  return found
}

// ── Enriquecedor principal ────────────────────────────────────────────────────

/**
 * Busca dados de contato faltantes para um cliente usando 3 buscas Serper paralelas:
 *  1. Busca geral (contato, telefone, email)
 *  2. Busca direcionada ao Instagram (site:instagram.com)
 *  3. Busca direcionada ao Facebook  (site:facebook.com)
 *
 * @param {{ id, nome, cidade, uf, whatsapp, telefone, email, instagram, facebook }} client
 * @returns {{ instagram?, facebook?, email?, whatsapp?, telefone? }}
 */
export async function enrichClient(client) {
  const base = [client.nome, client.cidade, client.uf].filter(Boolean).join(' ')

  // Determina quais buscas ainda fazem sentido para este cliente
  const searches = [
    searchWeb(`${base} contato telefone email whatsapp`),
    client.instagram ? Promise.resolve(null) : searchWeb(`${base} site:instagram.com`),
    client.facebook  ? Promise.resolve(null) : searchWeb(`${base} site:facebook.com`),
  ]

  const [generalRes, igRes, fbRes] = await Promise.allSettled(searches)

  // Agrega dados de todas as fontes
  let instagram = client.instagram || null
  let facebook  = client.facebook  || null
  let email     = client.email     || null
  let phone     = null

  const uf = client.uf || null

  // ── Resultado geral ──────────────────────────────────────────────────────────
  if (generalRes.status === 'fulfilled' && generalRes.value) {
    const g = parseResults(generalRes.value, uf)
    if (!instagram) instagram = g.instagram
    if (!facebook)  facebook  = g.facebook
    if (!email)     email     = g.email
    if (!phone)     phone     = g.phone
  }

  // ── Resultado Instagram (site:instagram.com) ─────────────────────────────────
  // O 1º resultado orgânico costuma SER a URL do perfil — extraímos direto do link
  if (!instagram && igRes.status === 'fulfilled' && igRes.value) {
    const firstLink = igRes.value.organic?.[0]?.link || ''
    if (firstLink.includes('instagram.com')) {
      instagram = extractInstagram(firstLink)
    }
    if (!instagram) {
      instagram = parseResults(igRes.value, uf).instagram
    }
  }

  // ── Resultado Facebook (site:facebook.com) ───────────────────────────────────
  // O 1º resultado orgânico é a página — seu link e snippet trazem telefone e email
  if (fbRes.status === 'fulfilled' && fbRes.value) {
    const fbOrganic = fbRes.value.organic || []

    // Extrai Facebook slug direto do primeiro link
    if (!facebook && fbOrganic[0]?.link) {
      facebook = extractFacebook(fbOrganic[0].link)
    }

    // Snippet da página do Facebook frequentemente contém telefone e email
    for (const r of fbOrganic.slice(0, 5)) {
      const text = [r.link, r.title, r.snippet].filter(Boolean).join(' ')
      if (!phone) phone = extractPhone(text, uf)
      if (!email) email = extractEmail(text)
      if (phone && email) break
    }

    // Knowledge graph do resultado de Facebook
    if (fbRes.value.knowledgeGraph) {
      const kg = parseKnowledgeGraph(fbRes.value.knowledgeGraph, uf)
      if (!phone)    phone    = kg.phone    || null
      if (!email)    email    = kg.email    || null
      if (!facebook) facebook = kg.facebook || null
    }
  }

  // ── Monta resultado final (só campos realmente ausentes no cliente) ───────────
  const result = {}

  if (instagram && !client.instagram) result.instagram = instagram
  if (facebook  && !client.facebook)  result.facebook  = facebook
  if (email     && !client.email)     result.email     = email

  if (phone) {
    // Preenche whatsapp ou telefone (fixo), o que estiver vazio
    if (!client.whatsapp) result.whatsapp = phone
    else if (!client.telefone) result.telefone = phone
  }

  return result
}
