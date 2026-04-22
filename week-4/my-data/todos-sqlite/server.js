const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3002;

// --- DB 초기화 ---
const db = new Database(path.join(__dirname, 'todos.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    detail TEXT DEFAULT ''
  )
`);

// 테이블이 비어있으면 초기 데이터 seed
const count = db.prepare('SELECT COUNT(*) AS cnt FROM todos').get().cnt;
if (count === 0) {
  const seed = [
    { id: 6, text: '자전거타기', done: 0, detail: '' },
    { id: 1, text: '오전 운동하기', done: 0, detail: '- 날짜: 2026-04-21\n- 시간: 오전 7:00 ~ 7:30\n- 내용: 스트레칭 10분 + 조깅 20분' },
    { id: 2, text: '공부하기', done: 0, detail: '- 날짜: 2026-04-21\n- 시간: 오전 9:00 ~ 11:00\n- 내용: 주간 학습 자료 복습 및 과제 정리' },
    { id: 3, text: '장보기', done: 0, detail: '- 날짜: 2026-04-21\n- 시간: 오후 1:00 ~ 2:00\n- 내용: 마트에서 주간 식재료 구입' },
    { id: 4, text: '프로젝트 작업', done: 0, detail: '- 날짜: 2026-04-21\n- 시간: 오후 2:00 ~ 5:00\n- 내용: 진행 중인 프로젝트 기능 개발 및 코드 리뷰' },
    { id: 5, text: '독서하기', done: 0, detail: '- 날짜: 2026-04-21\n- 시간: 저녁 9:00 ~ 10:00\n- 내용: 현재 읽고 있는 책 30페이지 이상 읽기' },
  ];

  const insert = db.prepare('INSERT INTO todos (id, text, done, detail) VALUES (@id, @text, @done, @detail)');
  const seedAll = db.transaction((items) => {
    for (const item of items) insert.run(item);
  });
  seedAll(seed);
}

// --- 미들웨어 ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- 헬퍼: row → JSON 변환 (done을 boolean으로) ---
function toJSON(row) {
  return { id: row.id, text: row.text, done: !!row.done, detail: row.detail };
}

// --- API 라우트 ---

// 전체 조회
app.get('/api/todos', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM todos').all();
    res.json({ success: true, data: rows.map(toJSON) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 새 할일 생성
app.post('/api/todos', (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }
    const result = db.prepare('INSERT INTO todos (text) VALUES (?)').run(text.trim());
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: toJSON(row) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 완료 토글
app.patch('/api/todos/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    const newDone = row.done ? 0 : 1;
    db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(newDone, id);
    const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    res.json({ success: true, data: toJSON(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 삭제
app.delete('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 서버 시작 / Vercel export ---
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
