import db from '../db/db.js'

export const CatalogModel = {
  async list(userId) {
    const { rows } = await db.query(`
      SELECT c.*, COUNT(p.id)::int AS total_products
      FROM catalogs c
      LEFT JOIN products p ON p.catalog_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.data DESC
    `, [userId])
    return rows
  },

  async get(id, userId) {
    const { rows } = await db.query(
      'SELECT * FROM catalogs WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return rows[0] || null
  },

  async create({ nome, data }, userId) {
    const { rows } = await db.query(
      'INSERT INTO catalogs (nome, data, user_id) VALUES ($1, $2, $3) RETURNING *',
      [nome, data, userId]
    )
    return rows[0]
  },

  async update(id, { nome, data, ativo }, userId) {
    const { rows } = await db.query(`
      UPDATE catalogs SET
        nome  = COALESCE($1, nome),
        data  = COALESCE($2, data),
        ativo = COALESCE($3, ativo)
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [nome, data, ativo, id, userId])
    return rows[0] || null
  },

  async delete(id, userId) {
    await db.query('DELETE FROM catalogs WHERE id = $1 AND user_id = $2', [id, userId])
  },
}
