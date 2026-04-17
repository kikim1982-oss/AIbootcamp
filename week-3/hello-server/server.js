const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- In-memory data store ---
let users = [
  { id: 1, name: 'Alice Kim', email: 'alice@example.com' },
  { id: 2, name: 'Bob Lee', email: 'bob@example.com' },
  { id: 3, name: 'Charlie Park', email: 'charlie@example.com' },
];
let nextId = 4;

// --- API Routes ---

// GET /api/hello
app.get('/api/hello', (_req, res) => {
  res.json({ success: true, data: { message: 'Hello, World!' } });
});

// GET /api/users - 전체 사용자 목록
app.get('/api/users', (_req, res) => {
  res.json({ success: true, data: users });
});

// POST /api/users - 새 사용자 추가
app.post('/api/users', (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'name and email are required',
      });
    }

    const newUser = { id: nextId++, name, email };
    users.push(newUser);

    res.status(201).json({ success: true, data: newUser, message: 'User created' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/users/:id - 특정 사용자 조회
app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: `User with id ${id} not found` });
  }

  res.json({ success: true, data: user });
});

// DELETE /api/users/:id - 사용자 삭제
app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: `User with id ${id} not found` });
  }

  const deleted = users.splice(index, 1)[0];
  res.json({ success: true, data: deleted, message: 'User deleted' });
});

// GET /api/echo - 쿼리 파라미터 에코
app.get('/api/echo', (req, res) => {
  res.json({ success: true, data: req.query });
});

// POST /api/echo - 요청 body 에코
app.post('/api/echo', (req, res) => {
  res.json({ success: true, data: req.body });
});

// --- Error handling middleware ---
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// --- Server startup (dual-mode: local + Vercel serverless) ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
