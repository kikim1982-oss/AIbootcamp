const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');

const validators = [
  body('product_id').isInt({ min: 1 }).withMessage('product_id 값이 올바르지 않습니다.'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('수량은 1 이상이어야 합니다.'),
];

async function handler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { product_id } = req.body;
  const quantity = req.body.quantity || 1;

  try {
    const product = await pool.query('SELECT id FROM products WHERE id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' });
    }

    const result = await pool.query(
      `INSERT INTO cart (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart.quantity + EXCLUDED.quantity
       RETURNING id, product_id, quantity`,
      [req.user.id, product_id, quantity]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('POST /api/cart error:', err.message);
    return res.status(500).json({ success: false, message: '장바구니 담기 실패' });
  }
}

module.exports = [...validators, handler];
