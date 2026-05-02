const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');

const validators = [
  body('content').isString().trim().isLength({ min: 1, max: 500 })
    .withMessage('Content must be 1-500 characters'),
  body('category').optional().isString().trim().isLength({ max: 50 }),
];

async function handler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { category, content } = req.body;
    const result = await pool.query(
      `INSERT INTO posts (category, content, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [category || '잡담', content.trim(), req.user.id]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('POST /api/posts error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create post' });
  }
}

module.exports = [...validators, handler];
