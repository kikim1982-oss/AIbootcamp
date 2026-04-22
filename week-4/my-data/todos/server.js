const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// [Fix 4] .txt 파일이 express.static으로 직접 노출되지 않도록 차단
app.use((req, res, next) => {
  if (req.path.endsWith('.txt')) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
});

app.use(express.static(path.join(__dirname)));

// ========================================
// .txt 파일 파싱 유틸
// ========================================

const TODOS_DIR = __dirname;

function parseTxtFile(filename) {
  const filepath = path.join(TODOS_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const firstLine = lines[0] || '';
  const done = firstLine.startsWith('[x]');
  const text = firstLine.replace(/^\[.\]\s*/, '').trim();
  const detail = lines.slice(1).join('\n').trim();
  const match = filename.match(/todo_(\d+)_/);
  // [Fix 3] parseInt에 radix 10 추가
  const id = match ? parseInt(match[1], 10) : 0;
  return { id, filename, text, done, detail };
}

function saveTxtFile(filename, todo) {
  const filepath = path.join(TODOS_DIR, filename);
  const check = todo.done ? '[x]' : '[ ]';
  const detail = todo.detail ? '\n' + todo.detail : '';
  fs.writeFileSync(filepath, `${check} ${todo.text}${detail}\n`, 'utf-8');
}

function getTodoFiles() {
  return fs.readdirSync(TODOS_DIR)
    .filter(f => f.match(/^todo_\d+_.*\.txt$/))
    .sort();
}

function getNextId() {
  const files = getTodoFiles();
  if (files.length === 0) return 1;
  const ids = files.map(f => {
    const match = f.match(/^todo_(\d+)_/);
    return match ? parseInt(match[1], 10) : 0;
  });
  return Math.max(...ids) + 1;
}

function sanitizeForFilename(text) {
  return text
    .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 50) || 'untitled';
}

// ========================================
// API Routes
// ========================================

// GET /api/todos - 전체 목록
app.get('/api/todos', (req, res) => {
  try {
    const files = getTodoFiles();
    const todos = files.map(f => parseTxtFile(f));
    res.json({ success: true, data: todos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// [Fix 1] POST /api/todos - 새 todo 생성
app.post('/api/todos', (req, res) => {
  try {
    const { text, detail } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    const id = getNextId();
    const slug = sanitizeForFilename(text);
    const filename = `todo_${id}_${slug}.txt`;
    const todo = { id, filename, text: text.trim(), done: false, detail: detail || '' };

    saveTxtFile(filename, todo);
    res.status(201).json({ success: true, data: todo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/todos/:id/toggle - 완료 토글
app.patch('/api/todos/:id/toggle', (req, res) => {
  try {
    // [Fix 3] parseInt에 radix 10 추가
    const id = parseInt(req.params.id, 10);
    const files = getTodoFiles();
    const filename = files.find(f => f.match(new RegExp(`^todo_${id}_`)));
    if (!filename) return res.status(404).json({ success: false, message: 'Todo not found' });

    const todo = parseTxtFile(filename);
    todo.done = !todo.done;
    saveTxtFile(filename, todo);
    res.json({ success: true, data: todo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// [Fix 2] DELETE /api/todos/:id - todo 삭제
app.delete('/api/todos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const files = getTodoFiles();
    const filename = files.find(f => f.match(new RegExp(`^todo_${id}_`)));
    if (!filename) return res.status(404).json({ success: false, message: 'Todo not found' });

    const filepath = path.join(TODOS_DIR, filename);
    fs.unlinkSync(filepath);
    res.json({ success: true, message: `Todo ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========================================
// Startup
// ========================================

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
