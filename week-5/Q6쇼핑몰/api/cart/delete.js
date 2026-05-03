const { pool } = require('../../db');

async function handler(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: '잘못된 cart id 입니다.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM cart WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '장바구니 항목을 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    console.error('DELETE /api/cart/:id error:', err.message);
    return res.status(500).json({ success: false, message: '삭제 실패' });
  }
}

module.exports = handler;
