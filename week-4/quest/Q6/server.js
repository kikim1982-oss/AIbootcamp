require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5500;

// --- DB 연결 ---
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

// --- 미들웨어 ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- Lazy DB Init ---
let dbInitialized = false;

async function initDB() {
  if (dbInitialized) return;
  // 테이블은 이미 Supabase에 생성되어 있으므로 연결 확인만 수행
  await pool.query('SELECT 1');
  dbInitialized = true;
}

app.use('/api', async (_req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// --- API Routes ---

// GET /api/salaries - 목록 조회
app.get('/api/salaries', async (req, res) => {
  try {
    const sort = req.query.sort || 'latest';
    let orderClause = 'ORDER BY created_at DESC';

    if (sort === 'salary') {
      orderClause = 'ORDER BY salary DESC, created_at DESC';
    }

    const result = await pool.query(`SELECT * FROM salaries ${orderClause}`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/salaries error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch salaries' });
  }
});

// GET /api/salaries/stats - 통계 조회
app.get('/api/salaries/stats', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count, ROUND(AVG(salary)) as avg_salary, ROUND(AVG(monthly_expense)) as avg_expense FROM salaries'
    );
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        count: parseInt(row.count, 10),
        avgSalary: parseInt(row.avg_salary, 10) || 0,
        avgExpense: parseInt(row.avg_expense, 10) || 0,
      },
    });
  } catch (err) {
    console.error('GET /api/salaries/stats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// POST /api/salaries - 연봉 등록
app.post('/api/salaries', async (req, res) => {
  try {
    const { job_category, salary, monthly_expense, comment } = req.body;

    // 유효성 검사: salary 필수, 1~99999
    if (salary == null || salary < 1 || salary > 99999) {
      return res.status(400).json({ success: false, message: 'salary is required and must be between 1 and 99999' });
    }

    const result = await pool.query(
      `INSERT INTO salaries (job_category, salary, monthly_expense, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, job_category, salary, monthly_expense, comment, created_at`,
      [job_category || '기타', salary, monthly_expense || null, comment || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('POST /api/salaries error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create salary entry' });
  }
});

// DELETE /api/salaries/:id - 삭제
app.delete('/api/salaries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM salaries WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/salaries/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete salary entry' });
  }
});

// --- SPA Fallback ---
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 듀얼모드: 로컬 + Vercel ---
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
