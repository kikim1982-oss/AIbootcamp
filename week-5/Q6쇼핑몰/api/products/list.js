const { pool } = require('../../db');

async function handler(_req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, price, image_url, description, category FROM products ORDER BY id ASC'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/products error:', err.message);
    return res.status(500).json({ success: false, message: '상품 목록 조회 실패' });
  }
}

module.exports = handler;
