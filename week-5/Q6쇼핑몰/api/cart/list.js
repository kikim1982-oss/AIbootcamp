const { pool } = require('../../db');

async function handler(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.product_id, c.quantity,
              p.name, p.price, p.image_url, p.description, p.category
         FROM cart c
         JOIN products p ON p.id = c.product_id
        WHERE c.user_id = $1
        ORDER BY c.created_at ASC`,
      [req.user.id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/cart error:', err.message);
    return res.status(500).json({ success: false, message: '장바구니 조회 실패' });
  }
}

module.exports = handler;
