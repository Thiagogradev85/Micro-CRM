import db from '../db/db.js'

export const SellerModel = {
  async list(userId) {
    const { rows } = await db.query(`
      SELECT s.*,
             COALESCE(
               json_agg(su.uf ORDER BY su.uf) FILTER (WHERE su.uf IS NOT NULL),
               '[]'
             ) AS ufs
      FROM sellers s
      LEFT JOIN seller_ufs su ON su.seller_id = s.id
      WHERE s.user_id = $1
      GROUP BY s.id
      ORDER BY s.nome ASC
    `, [userId])
    return rows
  },

  async get(id, userId) {
    const { rows } = await db.query(`
      SELECT s.*,
             COALESCE(
               json_agg(su.uf ORDER BY su.uf) FILTER (WHERE su.uf IS NOT NULL),
               '[]'
             ) AS ufs
      FROM sellers s
      LEFT JOIN seller_ufs su ON su.seller_id = s.id
      WHERE s.id = $1 AND s.user_id = $2
      GROUP BY s.id
    `, [id, userId])
    return rows[0] || null
  },

  async create({ nome, whatsapp, ufs = [] }, userId) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        'INSERT INTO sellers (nome, whatsapp, user_id) VALUES ($1, $2, $3) RETURNING *',
        [nome, whatsapp, userId]
      )
      const seller = rows[0]
      for (const uf of ufs) {
        await client.query(
          'INSERT INTO seller_ufs (seller_id, uf) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [seller.id, uf.toUpperCase()]
        )
      }
      await client.query('COMMIT')
      return this.get(seller.id, userId)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async update(id, { nome, whatsapp, ativo, ufs }, userId) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE sellers
         SET nome     = COALESCE($1, nome),
             whatsapp = COALESCE($2, whatsapp),
             ativo    = COALESCE($3, ativo)
         WHERE id = $4 AND user_id = $5`,
        [nome, whatsapp, ativo, id, userId]
      )
      if (Array.isArray(ufs)) {
        await client.query('DELETE FROM seller_ufs WHERE seller_id = $1', [id])
        for (const uf of ufs) {
          await client.query(
            'INSERT INTO seller_ufs (seller_id, uf) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, uf.toUpperCase()]
          )
        }
      }
      await client.query('COMMIT')
      return this.get(id, userId)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async delete(id, userId) {
    await db.query('DELETE FROM sellers WHERE id = $1 AND user_id = $2', [id, userId])
  },
}
