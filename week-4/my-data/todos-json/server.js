const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'todos.json');

// ========================================
// In-memory data (loaded from todos.json)
// ========================================
let todos = [];
let nextId = 1;

function loadTodos() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    todos = JSON.parse(raw);
    nextId = todos.length > 0
      ? Math.max(...todos.map(t => t.id)) + 1
      : 1;
  } catch (err) {
    console.error('Failed to load todos.json, starting with empty list:', err.message);
    todos = [];
    nextId = 1;
  }
}

function saveTodos() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), 'utf-8');
}

// Load data on startup
loadTodos();

// ========================================
// Middleware
// ========================================
app.use(express.json());

// Block direct access to .json files (security)
app.use((req, res, next) => {
  if (req.path.endsWith('.json')) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
});

// Serve static files (index.html, etc.)
app.use(express.static(path.join(__dirname)));

// ========================================
// API Routes
// ========================================

// GET /api/todos - 전체 목록 조회
app.get('/api/todos', (req, res) => {
  res.json({ success: true, data: todos });
});

// POST /api/todos - 새 할일 추가
app.post('/api/todos', (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    const newTodo = {
      id: nextId++,
      text: text.trim(),
      done: false,
    };

    todos.unshift(newTodo);
    saveTodos();

    res.status(201).json({ success: true, data: newTodo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create todo' });
  }
});

// PATCH /api/todos/:id/toggle - 완료 토글
app.patch('/api/todos/:id/toggle', (req, res) => {
  try {
    const id = Number(req.params.id);
    const todo = todos.find(t => t.id === id);

    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    todo.done = !todo.done;
    saveTodos();

    res.json({ success: true, data: todo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle todo' });
  }
});

// DELETE /api/todos/:id - 삭제
app.delete('/api/todos/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const index = todos.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    todos.splice(index, 1);
    saveTodos();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete todo' });
  }
});

// ========================================
// Local / Serverless dual mode
// ========================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Loaded ${todos.length} todos from todos.json`);
  });
}

module.exports = app;
