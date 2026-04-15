/**
 * fix_architecture.mjs
 *
 * Corrige a arquitetura multi-tenant:
 *   - Thiago e Scarlett passam para company_id = 3 (Atomi)
 *   - Empresas 4 (Thiago) e 5 (Scarlett) são removidas
 *
 * PRÉ-REQUISITO: rodar migration 019_fix_cascade.sql antes,
 * para garantir que as FKs já são RESTRICT (não CASCADE).
 *
 * Uso: node fix_architecture.mjs
 */
import pg from 'pg'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envText = await readFile(join(__dir, '.env'), 'utf8').catch(() => '')
for (const line of envText.split('\n')) {
  const [k, ...rest] = line.trim().split('=')
  if (k && rest.length && !process.env[k]) process.env[k] = rest.join('=').replace(/^["']|["']$/g, '')
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const ATOMI_ID = 3

// ── 1. Verifica estado atual ──────────────────────────────────────────────────
console.log('\n▶ Estado atual:')
const { rows: companies } = await pool.query('SELECT id, nome FROM companies ORDER BY id')
console.log('  Empresas:', companies.map(c => `id=${c.id} "${c.nome}"`).join(', '))

const { rows: users } = await pool.query('SELECT id, nome, company_id FROM users ORDER BY id')
console.log('  Usuários:', users.map(u => `id=${u.id} "${u.nome}" → company_id=${u.company_id}`).join(', '))

// ── 2. Move todos os usuários para Atomi ──────────────────────────────────────
console.log('\n▶ Movendo usuários para Atomi (company_id=3)...')
const { rowCount: usersUpdated } = await pool.query(
  `UPDATE users SET company_id = $1 WHERE company_id != $1 OR company_id IS NULL`,
  [ATOMI_ID]
)
console.log(`  ✅ ${usersUpdated} usuário(s) atualizados para company_id=${ATOMI_ID}`)

// ── 3. Move todos os clientes/sellers/status/catalogs para Atomi ──────────────
console.log('\n▶ Garantindo que todos os dados apontam para Atomi...')
for (const table of ['clients', 'sellers', 'status', 'catalogs']) {
  const { rowCount } = await pool.query(
    `UPDATE ${table} SET company_id = $1 WHERE company_id IS NULL OR company_id != $1`,
    [ATOMI_ID]
  )
  if (rowCount > 0) console.log(`  ✅ ${table}: ${rowCount} registros movidos`)
  else console.log(`  ⏭  ${table}: já ok`)
}

// ── 4. Tenta apagar empresas órfãs (só funciona se migration 019 já rodou) ────
console.log('\n▶ Removendo empresas 4 e 5 (Thiago/Scarlett)...')
for (const id of [4, 5]) {
  const { rows: exists } = await pool.query('SELECT nome FROM companies WHERE id = $1', [id])
  if (!exists.length) { console.log(`  ⏭  Empresa id=${id} não existe`); continue }
  try {
    await pool.query('DELETE FROM companies WHERE id = $1', [id])
    console.log(`  ✅ Empresa id=${id} "${exists[0].nome}" removida`)
  } catch (err) {
    if (err.code === '23503') {
      console.error(`  ❌ Empresa id=${id} ainda tem dados associados. Rode migration 019 primeiro.`)
    } else {
      console.error(`  ❌ Erro ao remover empresa id=${id}:`, err.message)
    }
  }
}

// ── 5. Confirma resultado final ───────────────────────────────────────────────
console.log('\n▶ Estado final:')
const { rows: finalCompanies } = await pool.query('SELECT id, nome FROM companies ORDER BY id')
console.log('  Empresas:', finalCompanies.map(c => `id=${c.id} "${c.nome}"`).join(', '))

const { rows: finalUsers } = await pool.query('SELECT id, nome, company_id FROM users ORDER BY id')
console.log('  Usuários:', finalUsers.map(u => `id=${u.id} "${u.nome}" → company_id=${u.company_id}`).join(', '))

const { rows: counts } = await pool.query(
  'SELECT company_id, COUNT(*) as total FROM clients GROUP BY company_id ORDER BY company_id'
)
console.log('  Clientes por empresa:', counts.map(r => `company_id=${r.company_id} total=${r.total}`).join(', '))

await pool.end()
console.log('\n✅ Pronto.')
