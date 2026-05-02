const { pool } = require('../../db');

async function handler(req, res) {
  const { id } = req.params;
  try {
    const owner = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (owner.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (owner.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own posts' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/posts/:id error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
}

module.exports = handler;
