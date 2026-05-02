const { pool } = require('../../db');

async function handler(req, res) {
  try {
    const sort = req.query.sort;
    const orderClause = sort === 'likes'
      ? 'ORDER BY p.likes DESC, p.created_at DESC'
      : 'ORDER BY p.created_at DESC';

    const result = await pool.query(`
      SELECT
        p.id, p.category, p.content, p.likes, p.user_id,
        p.created_at, p.updated_at,
        u.name AS author_name, u.email AS author_email
      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      ${orderClause}
    `);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/posts error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
}

module.exports = handler;
