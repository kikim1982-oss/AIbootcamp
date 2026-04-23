const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
const PORT = process.env.PORT || 4000;

// ── DB 연결 ──
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

// ── Lazy Init ──
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200),
      option_a VARCHAR(200) NOT NULL,
      option_b VARCHAR(200) NOT NULL,
      category VARCHAR(50) DEFAULT 'life',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      choice CHAR(1) NOT NULL CHECK (choice IN ('A', 'B')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  dbInitialized = true;
}

// ── 미들웨어 ──
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// DB 초기화 미들웨어 (API 라우트 전용)
app.use('/api', async (_req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB init error:', err.message);
    res.status(500).json({ success: false, message: 'Database initialization failed' });
  }
});

// ── API 라우트 ──

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

    // 질문 존재 확인
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

// ── Local / Vercel 듀얼 모드 ──
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
