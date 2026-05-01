const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'todo-app-secret-key-2024';
const BCRYPT_ROUNDS = 10;

// --- DB Connection ---
const pool = new Pool({
  connectionString:
    'postgresql://postgres.mivldxnchiveptioseao:S02hvWed49d9fpsl@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

// --- Lazy DB Init ---
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;

  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "todo-app_users" (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add user_id column to todos table if not exists
  await pool.query(`
    ALTER TABLE "todo-app_todos"
    ADD COLUMN IF NOT EXISTS user_id INT REFERENCES "todo-app_users"(id) ON DELETE CASCADE
  `);

  dbInitialized = true;
}

// --- JWT Auth Middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// --- Helper: Generate JWT ---
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// DB init middleware for /api routes
app.use('/api', async (_req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB init error:', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// =====================
// Auth Routes (public)
// =====================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM "todo-app_users" WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password and insert
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await pool.query(
      'INSERT INTO "todo-app_users" (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase().trim(), passwordHash]
    );

    const user = rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email } },
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to register' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM "todo-app_users" WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email } },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to login' });
  }
});

// =====================
// Protected API Routes
// =====================

// Apply JWT middleware to all /api/* EXCEPT /api/auth/*
app.use('/api/todos', authMiddleware);
app.use('/api/categories', authMiddleware);

// --- Categories ---

// GET /api/categories (JWT required, no user_id filter — shared data)
app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM "todo-app_categories" ORDER BY id'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/categories error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// --- Todos ---

// GET /api/todos (filtered by user_id)
app.get('/api/todos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.completed,
        t.priority,
        t.category_id,
        t.due_date,
        t.created_at,
        t.updated_at,
        json_build_object('id', c.id, 'name', c.name, 'color', c.color) AS category
      FROM "todo-app_todos" t
      LEFT JOIN "todo-app_categories" c ON t.category_id = c.id
      WHERE t.user_id = $1
      ORDER BY t.id DESC
    `, [req.userId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/todos error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch todos' });
  }
});

// POST /api/todos (insert with user_id)
app.post('/api/todos', async (req, res) => {
  try {
    const { title, description, priority, category_id, due_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "todo-app_todos" (title, description, priority, category_id, due_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        priority || 'medium',
        category_id || null,
        due_date || null,
        req.userId,
      ]
    );

    // Return with category info
    const todo = rows[0];
    if (todo.category_id) {
      const catResult = await pool.query(
        'SELECT id, name, color FROM "todo-app_categories" WHERE id = $1',
        [todo.category_id]
      );
      todo.category = catResult.rows[0] || null;
    } else {
      todo.category = null;
    }

    res.status(201).json({ success: true, data: todo });
  } catch (err) {
    console.error('POST /api/todos error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create todo' });
  }
});

// PATCH /api/todos/:id (only allow updating own todos)
app.patch('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed, priority, category_id, due_date } = req.body;

    // Build dynamic SET clause
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Title cannot be empty' });
      }
      fields.push(`title = $${idx++}`);
      values.push(title.trim());
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (completed !== undefined) {
      fields.push(`completed = $${idx++}`);
      values.push(completed);
    }
    if (priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(priority);
    }
    if (category_id !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(category_id);
    }
    if (due_date !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(due_date);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(req.userId);

    const query = `
      UPDATE "todo-app_todos"
      SET ${fields.join(', ')}
      WHERE id = $${idx} AND user_id = $${idx + 1}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    // Attach category info
    const todo = rows[0];
    if (todo.category_id) {
      const catResult = await pool.query(
        'SELECT id, name, color FROM "todo-app_categories" WHERE id = $1',
        [todo.category_id]
      );
      todo.category = catResult.rows[0] || null;
    } else {
      todo.category = null;
    }

    res.json({ success: true, data: todo });
  } catch (err) {
    console.error('PATCH /api/todos/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update todo' });
  }
});

// DELETE /api/todos/:id (only allow deleting own todos)
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'DELETE FROM "todo-app_todos" WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('DELETE /api/todos/:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete todo' });
  }
});

// --- SPA Fallback ---
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start / Export ---
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
module.exports = app;
