const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');
const { hashPassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');

const validators = [
  body('email')
    .isEmail().withMessage('올바른 이메일을 입력해주세요.')
    .normalizeEmail(),
  body('password')
    .matches(/^\d{6}$/).withMessage('비밀번호는 숫자 6자리여야 합니다.'),
];

async function handler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: '이미 가입된 이메일입니다.' });
    }

    const password_hash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, password_hash]
    );

    const user = result.rows[0];
    const token = signToken({ id: user.id, email: user.email });

    return res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('POST /api/auth/register error:', err.message);
    return res.status(500).json({ success: false, message: '회원가입에 실패했습니다.' });
  }
}

module.exports = [...validators, handler];
