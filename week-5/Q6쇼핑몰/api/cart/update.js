const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');

const validators = [
  body('quantity').isInt({ min: 1 }).withMessage('수량은 1 이상이어야 합니다.'),
];

async function handler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: '잘못된 cart id 입니다.' });
  }

  try {
    const result = await pool.query(
      `UPDATE cart SET quantity = $1
        WHERE id = $2 AND user_id = $3
        RETURNING id, product_id, quantity`,
      [req.body.quantity, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '장바구니 항목을 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('PATCH /api/cart/:id error:', err.message);
    return res.status(500).json({ success: false, message: '수량 변경 실패' });
  }
}

module.exports = [...validators, handler];
