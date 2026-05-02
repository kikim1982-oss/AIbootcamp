const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');
const { verifyPassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');

const validators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password required'),
];

async function handler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, email: user.email });
    delete user.password_hash;

    return res.json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('POST /api/auth/login error:', err.message);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
}

module.exports = [...validators, handler];
