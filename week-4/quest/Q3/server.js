const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- DB 연결 ---
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

// --- OpenAI 클라이언트 ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
        is_ai BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // 기존 테이블에 is_ai 컬럼이 없으면 추가
    await client.query(`
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false
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

// --- 재료 API ---

// GET /api/ingredients
app.get('/api/ingredients', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch ingredients' });
  }
});

// POST /api/ingredients
app.post('/api/ingredients', async (req, res) => {
  try {
    const { name, amount, category } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
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

// PUT /api/ingredients/:id
app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, category } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const result = await pool.query(
      'UPDATE ingredients SET name=$1, amount=$2, category=$3 WHERE id=$4 RETURNING *',
      [name, amount || null, category || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Ingredient not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('PUT error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update ingredient' });
  }
});

// DELETE /api/ingredients/:id
app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ingredients WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Ingredient not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('DELETE error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete ingredient' });
  }
});

// --- 수기 레시피 API (is_ai = false) ---

// GET /api/recipes
app.get('/api/recipes', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes WHERE is_ai = false ORDER BY id ASC');
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
      'INSERT INTO recipes (title, ingredients, steps, is_ai) VALUES ($1, $2, $3, false) RETURNING *',
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
      'UPDATE recipes SET title=$1, ingredients=$2, steps=$3 WHERE id=$4 AND is_ai=false RETURNING *',
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
    const result = await pool.query('DELETE FROM recipes WHERE id=$1 AND is_ai=false RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Recipe not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete recipe' });
  }
});

// --- AI 레시피 API (is_ai = true) ---

// GET /api/ai-recipes
app.get('/api/ai-recipes', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes WHERE is_ai = true ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch AI recipes' });
  }
});

// POST /api/ai-recipes - AI 생성 레시피 저장
app.post('/api/ai-recipes', async (req, res) => {
  try {
    const { title, ingredients, steps } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const result = await pool.query(
      'INSERT INTO recipes (title, ingredients, steps, is_ai) VALUES ($1, $2, $3, true) RETURNING *',
      [title, ingredients || null, steps || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save AI recipe' });
  }
});

// DELETE /api/ai-recipes/:id
app.delete('/api/ai-recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recipes WHERE id=$1 AND is_ai=true RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'AI recipe not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete AI recipe' });
  }
});

// --- AI 기능 API ---

// POST /api/ai/ingredients - AI 재료 추천
app.post('/api/ai/ingredients', async (req, res) => {
  try {
    const { count = 10, existing = [] } = req.body;

    const excludeText = existing.length > 0
      ? `다음 재료는 이미 있으니 제외해줘: ${existing.join(', ')}.`
      : '';

    const prompt = `냉장고에 흔히 있는 일반 식재료 ${count}가지를 추천해줘. ${excludeText}
각 재료는 name, amount, category(냉장/냉동/상온 중 하나) 필드를 가진 객체로 반환해줘.
JSON 형식: { "items": [ { "name": "양파", "amount": "2개", "category": "상온" }, ... ] }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const items = parsed.items || Object.values(parsed)[0];
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('AI ingredients error:', err.message);
    res.status(500).json({ success: false, message: 'AI 재료 추천에 실패했습니다.' });
  }
});

// POST /api/ai/recipes/generate - DB 재료 기반 AI 레시피 생성
app.post('/api/ai/recipes/generate', async (req, res) => {
  try {
    const { style } = req.body; // 예: "간단 요리", "다이어트", "야식"

    // DB에서 현재 재료 목록 조회
    const ingResult = await pool.query('SELECT name, amount, category FROM ingredients ORDER BY id ASC');
    const ingredientList = ingResult.rows.map(r => `${r.name}${r.amount ? ` (${r.amount})` : ''}`).join(', ');

    if (!ingredientList) {
      return res.status(400).json({ success: false, message: '냉장고에 재료가 없습니다. 먼저 재료를 추가해주세요.' });
    }

    const styleText = style ? `스타일: ${style}` : '';
    const prompt = `냉장고 재료: ${ingredientList}
${styleText}
위 재료로 만들 수 있는 레시피 1개를 알려줘.
JSON 형식으로 반환해줘:
{
  "title": "요리 이름",
  "ingredients": "재료와 양 (줄바꿈 구분)",
  "steps": "조리 순서 (1. 2. 3. 형식으로 줄바꿈 구분)"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const recipe = JSON.parse(completion.choices[0].message.content);
    res.json({ success: true, data: recipe });
  } catch (err) {
    console.error('AI recipe generate error:', err.message);
    res.status(500).json({ success: false, message: 'AI 레시피 생성에 실패했습니다.' });
  }
});

// --- 서버 시작 / Vercel export ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
