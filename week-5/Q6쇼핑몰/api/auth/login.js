const { body, validationResult } = require('express-validator');
const { pool } = require('../../db');
const { verifyPassword } = require('../../utils/password');
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
    const result = await pool.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const user = result.rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const token = signToken({ id: user.id, email: user.email });
    delete user.password_hash;

    return res.json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('POST /api/auth/login error:', err.message);
    return res.status(500).json({ success: false, message: '로그인에 실패했습니다.' });
  }
}

module.exports = [...validators, handler];
