const { pool } = require('../../db');

async function handler(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
}

module.exports = handler;
