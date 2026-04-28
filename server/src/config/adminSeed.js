/**
 * Seed do usuário admin na primeira execução.
 * Cria o admin se não existir — usa ADMIN_EMAIL e ADMIN_PASSWORD do .env.
 * Também migra dados existentes (sem user_id) para o admin.
 */
import db           from '../db/db.js'
import { hashPassword } from '../utils/auth.js'

const DEFAULT_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@admin.com'
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'
const DEFAULT_NOME     = process.env.ADMIN_NOME     || 'Administrador'

export async function seedAdmin() {
  try {
    // Verifica se já existe algum admin
    const { rows } = await db.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    )

    let adminId

    if (rows.length === 0) {
      // Cria o admin apenas na primeira execução
      const hash = await hashPassword(DEFAULT_PASSWORD)
      const { rows: created } = await db.query(
        `INSERT INTO users (nome, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')
         RETURNING id`,
        [DEFAULT_NOME, DEFAULT_EMAIL, hash]
      )
      adminId = created[0].id
      console.log(`[AdminSeed] Admin criado: ${DEFAULT_EMAIL} (id=${adminId})`)
    } else {
      adminId = rows[0].id
      // Não sobrescreve email/senha de admin já existente.
      // Para alterar credenciais, use o script reset_password.mjs ou a interface admin.
      console.log(`[AdminSeed] Admin já existe (id=${adminId}), credenciais preservadas.`)
    }

    // Migra dados existentes sem user_id para o admin
    const tables = ['clients', 'sellers', 'status', 'catalogs']
    for (const table of tables) {
      const { rowCount } = await db.query(
        `UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`,
        [adminId]
      )
      if (rowCount > 0) {
        console.log(`[AdminSeed] ${rowCount} registro(s) de "${table}" migrado(s) para admin`)
      }
    }
  } catch (err) {
    console.warn('[AdminSeed] Aviso:', err.message)
  }
}
