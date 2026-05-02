const { pool } = require('../../db');

async function handler(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING id, likes',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('POST /api/posts/:id/like error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to like post' });
  }
}

module.exports = handler;
