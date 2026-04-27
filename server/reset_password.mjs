/**
 * Script para redefinir a senha de um usuário.
 * Uso: node reset_password.mjs <email_ou_nome> <nova_senha>
 * Exemplo: node reset_password.mjs thiago Atomi@1234
 */
import pg from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dir, '.env') })

const [,, identifier, newPassword] = process.argv

if (!identifier || !newPassword) {
  console.error('Uso: node reset_password.mjs <email_ou_nome> <nova_senha>')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// Busca por email (contém @) ou pelo nome (ILIKE)
const isEmail = identifier.includes('@')
const query = isEmail
  ? `SELECT id, nome, email, role FROM users WHERE email = $1`
  : `SELECT id, nome, email, role FROM users WHERE nome ILIKE $1`
const param = isEmail ? identifier.toLowerCase().trim() : `%${identifier}%`

const { rows } = await pool.query(query, [param])

if (rows.length === 0) {
  console.error(`Nenhum usuário encontrado para: "${identifier}"`)
  await pool.end()
  process.exit(1)
}

if (rows.length > 1) {
  console.warn('Múltiplos usuários encontrados:')
  rows.forEach(u => console.warn(`  id=${u.id}  nome=${u.nome}  email=${u.email}  role=${u.role}`))
  console.error('Use o e-mail completo para identificar o usuário com precisão.')
  await pool.end()
  process.exit(1)
}

const user = rows[0]
const hash = await bcrypt.hash(newPassword, 10)

await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, user.id])

console.log(`✅ Senha atualizada com sucesso!`)
console.log(`   Usuário : ${user.nome} (${user.email})`)
console.log(`   Role    : ${user.role}`)
console.log(`   Nova senha aplicada — faça login normalmente.`)

await pool.end()
