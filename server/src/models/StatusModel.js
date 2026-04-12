import db from '../db/db.js'

export const StatusModel = {
  async list(userId) {
    const { rows } = await db.query(
      'SELECT * FROM status WHERE user_id = $1 ORDER BY ordem ASC',
      [userId]
    )
    return rows
  },

  async get(id, userId) {
    const { rows } = await db.query(
      'SELECT * FROM status WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    return rows[0] || null
  },

  async create({ nome, cor = '#6b7280', ordem = 0 }, userId) {
    const { rows } = await db.query(
      'INSERT INTO status (nome, cor, ordem, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, cor, ordem, userId]
    )
    return rows[0]
  },

  async update(id, { nome, cor, ordem }, userId) {
    const { rows } = await db.query(
      `UPDATE status
       SET nome  = COALESCE($1, nome),
           cor   = COALESCE($2, cor),
           ordem = COALESCE($3, ordem)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [nome, cor, ordem, id, userId]
    )
    return rows[0] || null
  },

  async delete(id, userId) {
    await db.query('DELETE FROM status WHERE id = $1 AND user_id = $2', [id, userId])
  },
}
