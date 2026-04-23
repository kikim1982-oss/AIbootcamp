require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// ── DB 연결 ──────────────────────────────────────────
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

// ── Lazy init ────────────────────────────────────────
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;
  // posts 테이블은 Supabase에 이미 생성되어 있으므로
  // 여기서는 연결 확인만 수행
  await pool.query('SELECT 1');
  dbInitialized = true;
}

// ── 미들웨어 ─────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// /api 요청 전 DB 초기화 보장
app.use('/api', async (_req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB init error:', err.message);
    res.status(500).json({ success: false, message: 'Database initialization failed' });
  }
});

// ── API 라우트 ───────────────────────────────────────

// GET /api/posts?sort=latest|likes
app.get('/api/posts', async (req, res) => {
  try {
    const sort = req.query.sort;
    let orderClause = 'ORDER BY created_at DESC';
    if (sort === 'likes') {
      orderClause = 'ORDER BY likes DESC, created_at DESC';
    }
    const result = await pool.query(`SELECT * FROM posts ${orderClause}`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/posts error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

// POST /api/posts
app.post('/api/posts', async (req, res) => {
  try {
    const { category, content } = req.body;

    // 유효성 검사: content 필수, 1~500자
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }
    if (content.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Content must be 500 characters or less' });
    }

    const result = await pool.query(
      'INSERT INTO posts (category, content) VALUES ($1, $2) RETURNING *',
      [category || '잡담', content.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('POST /api/posts error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

// POST /api/posts/:id/like
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, data: { id: result.rows[0].id, likes: result.rows[0].likes } });
  } catch (err) {
    console.error('POST /api/posts/:id/like error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to like post' });
  }
});

// DELETE /api/posts/:id
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/posts/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
});

// ── SPA fallback ─────────────────────────────────────
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── 서버 시작 / Vercel export ────────────────────────
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
