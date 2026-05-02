const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');
const { hashPassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');

const validators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isString().isLength({ max: 100 }).trim(),
];

async function handler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password, name } = req.body;

  try {
    const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email, password_hash, name || null]
    );

    const user = result.rows[0];
    const token = signToken({ id: user.id, email: user.email });

    return res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('POST /api/auth/register error:', err.message);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
}

module.exports = [...validators, handler];
