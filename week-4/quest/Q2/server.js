const express = require('express');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- DB 연결 (lazy init 패턴) ---
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

let dbInitialized = false;

async function initDB() {
  if (dbInitialized) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        amount VARCHAR(50),
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        ingredients TEXT,
        steps TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    dbInitialized = true;
  } finally {
    client.release();
  }
}

// --- 미들웨어 ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API 라우트 진입 전 DB 초기화
app.use('/api', async (_req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB init error:', err.message);
    res.status(500).json({ success: false, message: 'Database initialization failed' });
  }
});

// --- API 라우트 ---

// GET /api/ingredients - 전체 목록 (id 오름차순)
app.get('/api/ingredients', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch ingredients' });
  }
});

// POST /api/ingredients - 새 재료 등록
app.post('/api/ingredients', async (req, res) => {
  try {
    const { name, amount, category } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const result = await pool.query(
      'INSERT INTO ingredients (name, amount, category) VALUES ($1, $2, $3) RETURNING *',
      [name, amount || null, category || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('POST error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create ingredient' });
  }
});

// PUT /api/ingredients/:id - 재료 수정
app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, category } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const result = await pool.query(
      'UPDATE ingredients SET name = $1, amount = $2, category = $3 WHERE id = $4 RETURNING *',
      [name, amount || null, category || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('PUT error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update ingredient' });
  }
});

// DELETE /api/ingredients/:id - 재료 삭제
app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM ingredients WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('DELETE error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete ingredient' });
  }
});

// --- recipes API ---

// GET /api/recipes
app.get('/api/recipes', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch recipes' });
  }
});

// POST /api/recipes
app.post('/api/recipes', async (req, res) => {
  try {
    const { title, ingredients, steps } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const result = await pool.query(
      'INSERT INTO recipes (title, ingredients, steps) VALUES ($1, $2, $3) RETURNING *',
      [title, ingredients || null, steps || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create recipe' });
  }
});

// PUT /api/recipes/:id
app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, ingredients, steps } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const result = await pool.query(
      'UPDATE recipes SET title=$1, ingredients=$2, steps=$3 WHERE id=$4 RETURNING *',
      [title, ingredients || null, steps || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Recipe not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update recipe' });
  }
});

// DELETE /api/recipes/:id
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recipes WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Recipe not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete recipe' });
  }
});

// --- 서버 시작 / Vercel export ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
