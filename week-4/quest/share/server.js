require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5700;

// ── DB 연결 ──────────────────────────────────────────
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

// ── OpenAI ───────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Lazy Init ────────────────────────────────────────
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;
  await pool.query('SELECT 1'); // 모든 테이블은 Supabase에 이미 존재
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

// =====================================================
// Q3 - AI 레시피 (재료 / 레시피 / AI)
// =====================================================

// ── 재료 CRUD ────────────────────────────────────────

// GET /api/ingredients
app.get('/api/ingredients', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/ingredients error:', err.message);
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
    console.error('POST /api/ingredients error:', err.message);
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
    console.error('PUT /api/ingredients/:id error:', err.message);
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
    console.error('DELETE /api/ingredients/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete ingredient' });
  }
});

// ── 수기 레시피 CRUD (is_ai = false) ─────────────────

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

// ── AI 레시피 CRUD (is_ai = true) ────────────────────

// GET /api/ai-recipes
app.get('/api/ai-recipes', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes WHERE is_ai = true ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch AI recipes' });
  }
});

// POST /api/ai-recipes
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

// ── AI 기능 (재료 추천 / 레시피 생성) ────────────────

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
    const { style } = req.body;

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

// =====================================================
// Q4 - 밸런스 게임
// =====================================================

// GET /api/questions - 질문 목록 (투표 집계 포함)
app.get('/api/questions', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        q.*,
        COUNT(CASE WHEN v.choice = 'A' THEN 1 END)::int AS votes_a,
        COUNT(CASE WHEN v.choice = 'B' THEN 1 END)::int AS votes_b,
        COUNT(v.id)::int AS total_votes
      FROM questions q
      LEFT JOIN votes v ON v.question_id = q.id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `);

    const data = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      choiceA: row.option_a,
      choiceB: row.option_b,
      category: row.category,
      votesA: row.votes_a,
      votesB: row.votes_b,
      totalVotes: row.total_votes,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/questions error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
});

// POST /api/questions - 질문 등록
app.post('/api/questions', async (req, res) => {
  try {
    const { title, choiceA, choiceB, category } = req.body;

    if (!choiceA || !choiceB) {
      return res.status(400).json({ success: false, message: 'choiceA and choiceB are required' });
    }

    const result = await pool.query(
      'INSERT INTO questions (title, option_a, option_b, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [title || null, choiceA, choiceB, category || 'life']
    );

    const row = result.rows[0];
    const data = {
      id: row.id,
      title: row.title,
      choiceA: row.option_a,
      choiceB: row.option_b,
      category: row.category,
      votesA: 0,
      votesB: 0,
      totalVotes: 0,
      createdAt: row.created_at,
    };

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('POST /api/questions error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create question' });
  }
});

// POST /api/questions/:id/vote - 투표
app.post('/api/questions/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { choice } = req.body;

    if (!choice || !['A', 'B'].includes(choice)) {
      return res.status(400).json({ success: false, message: 'choice must be "A" or "B"' });
    }

    const questionCheck = await pool.query('SELECT id FROM questions WHERE id = $1', [id]);
    if (questionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    await pool.query(
      'INSERT INTO votes (question_id, choice) VALUES ($1, $2)',
      [id, choice]
    );

    res.status(201).json({ success: true, message: 'Vote recorded' });
  } catch (err) {
    console.error('POST /api/questions/:id/vote error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to record vote' });
  }
});

// POST /api/ai/generate - AI 밸런스 게임 질문 생성
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { usedQuestions = [] } = req.body;
    const usedHint = usedQuestions.length > 0
      ? `\n이미 사용된 주제들 (중복 금지): ${usedQuestions.join(', ')}`
      : '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 재미있는 밸런스 게임 질문을 만드는 전문가입니다.
반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
카테고리는 반드시 다음 중 하나: 돈, 직장, 음식, 라이프`
        },
        {
          role: 'user',
          content: `창의적이고 공감되는 밸런스 게임 질문 1개를 만들어주세요.
둘 다 장단점이 있어서 선택하기 어려운 질문이어야 합니다.${usedHint}

반드시 이 JSON 형식으로만 응답:
{"title":"질문 제목(선택, 없으면 null)","choiceA":"A 선택지","choiceB":"B 선택지","category":"카테고리"}`
        }
      ],
      temperature: 1.1,
    });

    const text = completion.choices[0].message.content.trim();
    const question = JSON.parse(text);

    if (!question.choiceA || !question.choiceB || !question.category) {
      return res.status(500).json({ success: false, message: 'AI 응답 형식 오류' });
    }

    res.json({ success: true, data: question });
  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(500).json({ success: false, message: 'AI 질문 생성 실패' });
  }
});

// DELETE /api/questions/:id - 질문 삭제
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM questions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    console.error('DELETE /api/questions/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
});

// =====================================================
// Q5 - 익명 게시판
// =====================================================

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

// =====================================================
// Q6 - 연봉 비교
// =====================================================

// GET /api/salaries?sort=latest|salary
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

// GET /api/salaries/stats - 통계
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

// DELETE /api/salaries/:id
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

// =====================================================
// SPA Fallback
// =====================================================
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =====================================================
// 듀얼 모드: 로컬 + Vercel
// =====================================================
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
