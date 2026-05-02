const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');

const validators = [
  body('content').optional().isString().trim().isLength({ min: 1, max: 500 })
    .withMessage('Content must be 1-500 characters'),
  body('category').optional().isString().trim().isLength({ max: 50 }),
];

async function handler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { id } = req.params;
  const { content, category } = req.body;

  if (content === undefined && category === undefined) {
    return res.status(400).json({ success: false, message: 'Nothing to update' });
  }

  try {
    const owner = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (owner.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (owner.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own posts' });
    }

    const result = await pool.query(
      `UPDATE posts
         SET content    = COALESCE($1, content),
             category   = COALESCE($2, category),
             updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [content ?? null, category ?? null, id]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('PATCH /api/posts/:id error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update post' });
  }
}

module.exports = [...validators, handler];
