import * as XLSX from 'xlsx'

const KNOWN_UFS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
])

const STATE_NAME_TO_UF = {
  'acre': 'AC',
  'alagoas': 'AL',
  'amapa': 'AP', 'amapá': 'AP',
  'amazonas': 'AM',
  'bahia': 'BA',
  'ceara': 'CE', 'ceará': 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES', 'espírito santo': 'ES',
  'goias': 'GO', 'goiás': 'GO',
  'maranhao': 'MA', 'maranhão': 'MA',
  'mato grosso do sul': 'MS', 'mato_grosso_do_sul': 'MS',
  'mato grosso': 'MT', 'mato_grosso': 'MT',
  'minas gerais': 'MG', 'minas_gerais': 'MG',
  'para': 'PA', 'pará': 'PA',
  'paraiba': 'PB', 'paraíba': 'PB',
  'parana': 'PR', 'paraná': 'PR',
  'pernambuco': 'PE',
  'piaui': 'PI', 'piauí': 'PI',
  'rio de janeiro': 'RJ', 'rio_de_janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio_grande_do_norte': 'RN',
  'rio grande do sul': 'RS', 'rio_grande_do_sul': 'RS',
  'rondonia': 'RO', 'rondônia': 'RO',
  'roraima': 'RR',
  'santa catarina': 'SC', 'santa_catarina': 'SC',
  'sao paulo': 'SP', 'são paulo': 'SP', 'sao_paulo': 'SP',
  'sergipe': 'SE',
  'tocantins': 'TO',
}

const UF_REGEX = /\b([A-Z]{2})\b/

function normalize(str) {
  return String(str).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .trim()
}

function findCol(headers, ...keywords) {
  return headers.findIndex(h =>
    keywords.some(k => normalize(String(h)).includes(normalize(k)))
  )
}

function extractUF(value) {
  if (!value) return null
  const str = String(value).trim()
  const norm = normalize(str)
  for (const [name, uf] of Object.entries(STATE_NAME_TO_UF)) {
    const nameNorm = normalize(name)
    if (norm === nameNorm || norm.startsWith(nameNorm) || norm.includes(nameNorm)) return uf
  }
  const upper = str.toUpperCase()
  const match = upper.match(UF_REGEX)
  if (match && KNOWN_UFS.has(match[1])) return match[1]
  if (KNOWN_UFS.has(upper.trim())) return upper.trim()
  return null
}

function clean(value) {
  if (value === null || value === undefined || value === '') return null
  const s = String(value).trim()
  return s || null
}

function cleanDigits(value) {
  if (!value) return null
  const digits = String(value).replace(/\D/g, '')
  if (!digits || digits.length < 8) return null
  return digits
}

function isCelular(digits) {
  if (!digits) return false
  let local = digits
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    local = digits.slice(2)
  }
  if (local.length === 11 && local[2] === '9') return true
  if (local.length === 10 && ['6','7','8','9'].includes(local[2])) return true
  return false
}

function cleanPhone(value) {
  const digits = cleanDigits(value)
  if (!digits) return null
  return isCelular(digits) ? digits : null
}

const INSTAGRAM_URL_RE = /instagram\.com\/([A-Za-z0-9_.]+)/i
const INSTAGRAM_HANDLE_RE = /^@?([A-Za-z0-9_.]{2,30})$/

function extractInstagram(value) {
  if (!value) return null
  const s = String(value).trim()
  if (!s) return null
  const urlMatch = s.match(INSTAGRAM_URL_RE)
  if (urlMatch) return '@' + urlMatch[1]
  if (s.includes(' ') || s.length > 35) return null
  const handleMatch = s.match(INSTAGRAM_HANDLE_RE)
  if (handleMatch) {
    if (KNOWN_UFS.has(s.toUpperCase())) return null
    if (/^\d+$/.test(s)) return null
    if (s.length < 2) return null
    return s.startsWith('@') ? s : '@' + s
  }
  return null
}

// Verifica se uma string é um nome de pessoa/empresa válido
// Deve ter ao menos uma letra — rejeita strings que são só telefone/número
function isValidName(value) {
  if (!value) return false
  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value)
}

// Tenta detectar automaticamente qual coluna contém nomes de empresas/pessoas
// analisando o conteúdo das células (não só o cabeçalho)
// Retorna o índice da coluna com maior proporção de valores texto válidos
function detectNomeColumn(headers, dataRows) {
  // 1. Tenta pelo cabeçalho primeiro
  const byHeader = findCol(headers, 'nome', 'name', 'loja', 'empresa', 'cliente',
    'fantasia', 'razao', 'razão', 'estabelecimento', 'razao social', 'nome fantasia')
  if (byHeader >= 0) return byHeader

  // 2. Analisa conteúdo das colunas — a coluna nome deve ter:
  //    - maioria de valores com letras
  //    - poucos valores que parecem telefone ou UF
  const sample = dataRows.slice(0, 30)
  const colCount = Math.max(...sample.map(r => r.length))
  let bestCol = -1
  let bestScore = 0

  for (let col = 0; col < colCount; col++) {
    const values = sample.map(r => String(r[col] || '').trim()).filter(Boolean)
    if (values.length === 0) continue

    let score = 0
    for (const v of values) {
      const hasLetter   = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(v)
      const isPhone     = /^[\d\s\(\)\-\+\.]{7,}$/.test(v)
      const isUF        = KNOWN_UFS.has(v.toUpperCase()) && v.length === 2
      const isUrl       = v.startsWith('http') || v.includes('www.')
      const isInstagram = v.startsWith('@') || v.includes('instagram')

      if (hasLetter && !isPhone && !isUF && !isUrl && !isInstagram) score++
      if (isPhone || isUF || isUrl || isInstagram) score -= 2
    }
    // Prefere colunas mais à esquerda (nome tende a ser primeira coluna)
    const posBonus = (colCount - col) * 0.1
    const finalScore = score + posBonus

    if (finalScore > bestScore) {
      bestScore = finalScore
      bestCol = col
    }
  }

  return bestCol
}

export async function importExcel(fileOrBuffer) {
  const workbook = XLSX.read(fileOrBuffer, { type: 'buffer' })
  const records  = []
  const rejected = []  // linhas rejeitadas com motivo

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    if (rows.length < 2) continue

    const sheetUF = extractUF(sheetName)

    // Encontra a linha de cabeçalho como a que tem mais colunas reconhecidas
    const HEADER_KEYWORDS = ['nome','name','loja','empresa','cliente','fantasia','razao','cidade','city',
      'uf','estado','whatsapp','wpp','celular','telefone','fone','tel','phone','zap','site','website',
      'instagram','ig','insta','endereco','endereço','logradouro','bairro','cep','cnpj']

    let headerRowIdx = 0
    let bestScore = -1
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const score = rows[i].filter(c => {
        const n = normalize(String(c))
        return HEADER_KEYWORDS.some(k => n.includes(k))
      }).length
      if (score > bestScore) { bestScore = score; headerRowIdx = i }
    }
    // Fallback: se nenhuma linha tem colunas reconhecidas, usa primeira com texto
    if (bestScore === 0) {
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        if (rows[i].some(c => isNaN(c) && String(c).trim().length > 1)) {
          headerRowIdx = i; break
        }
      }
    }

    const headers  = rows[headerRowIdx]
    const dataRows = rows.slice(headerRowIdx + 1).filter(r => !r.every(c => !String(c).trim()))

    // Detecta coluna nome — pelo cabeçalho ou pelo conteúdo
    const iNome      = detectNomeColumn(headers, dataRows)
    const iCidade    = findCol(headers, 'cidade', 'city', 'municipio', 'município', 'localidade')
    const iUF        = findCol(headers, 'uf', 'estado', 'state', 'estado/uf', 'uf/estado', 'sigla')
    const iWhatsapp  = findCol(headers, 'whatsapp', 'wpp', 'whats', 'celular', 'cel', 'telefone', 'fone', 'tel', 'phone', 'zap', 'contato', 'numero', 'número', 'mobile', 'movel', 'móvel')
    const iSite      = findCol(headers, 'site', 'website', 'url', 'www', 'homepage', 'web')
    const iInstagram = findCol(headers, 'instagram', 'ig', 'insta', '@', 'perfil', 'rede social', 'social', 'redes')

    for (let i = 0; i < dataRows.length; i++) {
      const row     = dataRows[i]
      const rowNum  = headerRowIdx + 2 + i  // número da linha no Excel (1-based + cabeçalho)
      const rawNome = iNome >= 0 ? clean(row[iNome]) : null

      // Nome ausente
      if (!rawNome) {
        rejected.push({ linha: rowNum, valor: String(row[iNome] ?? ''), motivo: 'Nome vazio ou ausente' })
        continue
      }

      // Nome só com números/símbolos — provavelmente um telefone no lugar errado
      if (!isValidName(rawNome)) {
        rejected.push({ linha: rowNum, valor: rawNome, motivo: `Nome inválido — contém apenas números ("${rawNome}"). Verifique a coluna de nome no Excel.` })
        continue
      }

      let uf = iUF >= 0 ? extractUF(row[iUF]) : null
      if (!uf) {
        for (const cell of row) {
          uf = extractUF(cell)
          if (uf) break
        }
      }
      if (!uf) uf = sheetUF
      if (!uf) {
        rejected.push({ linha: rowNum, valor: rawNome, motivo: 'Estado (UF) não encontrado' })
        continue
      }

      let whatsapp = iWhatsapp >= 0 ? cleanPhone(row[iWhatsapp]) : null
      if (!whatsapp) {
        for (const cell of row) {
          const candidate = cleanPhone(cell)
          if (candidate) { whatsapp = candidate; break }
        }
      }

      let instagram = iInstagram >= 0 ? extractInstagram(row[iInstagram]) : null
      if (!instagram) {
        for (const cell of row) {
          const candidate = extractInstagram(cell)
          if (candidate) { instagram = candidate; break }
        }
      }

      records.push({
        nome:      rawNome,
        cidade:    iCidade >= 0 ? clean(row[iCidade]) : null,
        uf,
        whatsapp,
        site:      iSite >= 0 ? clean(row[iSite]) : null,
        instagram,
      })
    }
  }

  return { records, rejected }
}
