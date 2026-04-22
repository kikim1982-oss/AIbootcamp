require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;

// ── Database ────────────────────────────────────────────
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

// ── Table initialization (lazy, runs once) ──────────────
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  dbInitialized = true;
}

// ── Helpers ─────────────────────────────────────────────

function json(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

/** Map a DB row to the shape the UI expects */
function toClientTodo(row) {
  return {
    id: row.id,
    text: row.title,
    content: row.content || '',
    done: row.completed,
    createdAt: row.created_at,
  };
}

// ── Route matching ──────────────────────────────────────

// Match patterns like /api/todos/:id and /api/todos/:id/toggle
function matchRoute(method, url) {
  const parsed = new URL(url, 'http://localhost');
  const pathname = parsed.pathname;

  if (method === 'GET' && pathname === '/') {
    return { handler: 'SERVE_INDEX' };
  }
  if (method === 'GET' && pathname === '/api/todos') {
    return { handler: 'GET_TODOS' };
  }
  if (method === 'POST' && pathname === '/api/todos') {
    return { handler: 'CREATE_TODO' };
  }

  // PATCH /api/todos/:id/toggle
  const toggleMatch = pathname.match(/^\/api\/todos\/(\d+)\/toggle$/);
  if (method === 'PATCH' && toggleMatch) {
    return { handler: 'TOGGLE_TODO', id: Number(toggleMatch[1]) };
  }

  // DELETE /api/todos/:id
  const deleteMatch = pathname.match(/^\/api\/todos\/(\d+)$/);
  if (method === 'DELETE' && deleteMatch) {
    return { handler: 'DELETE_TODO', id: Number(deleteMatch[1]) };
  }

  return { handler: 'NOT_FOUND' };
}

// ── Request handler ─────────────────────────────────────

async function handleRequest(req, res) {
  const route = matchRoute(req.method, req.url);

  try {
    await initDB();

    switch (route.handler) {

      // ── Serve index.html ──
      case 'SERVE_INDEX': {
        const filePath = path.join(__dirname, 'index.html');
        const html = fs.readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        break;
      }

      // ── GET /api/todos ──
      case 'GET_TODOS': {
        const { rows } = await pool.query(
          'SELECT id, title, content, completed, created_at FROM todos ORDER BY created_at DESC'
        );
        json(res, 200, { data: rows.map(toClientTodo) });
        break;
      }

      // ── POST /api/todos ──
      case 'CREATE_TODO': {
        const body = await parseBody(req);
        if (!body.text || !body.text.trim()) {
          json(res, 400, { success: false, message: 'text is required' });
          return;
        }
        const { rows } = await pool.query(
          'INSERT INTO todos (title, content, completed) VALUES ($1, $2, false) RETURNING id, title, content, completed, created_at',
          [body.text.trim(), (body.content || '').trim()]
        );
        json(res, 201, { data: toClientTodo(rows[0]) });
        break;
      }

      // ── PATCH /api/todos/:id/toggle ──
      case 'TOGGLE_TODO': {
        const { rows } = await pool.query(
          'UPDATE todos SET completed = NOT completed WHERE id = $1 RETURNING id, title, content, completed, created_at',
          [route.id]
        );
        if (rows.length === 0) {
          json(res, 404, { success: false, message: 'Todo not found' });
          return;
        }
        json(res, 200, { data: { done: rows[0].completed } });
        break;
      }

      // ── DELETE /api/todos/:id ──
      case 'DELETE_TODO': {
        const { rows } = await pool.query(
          'DELETE FROM todos WHERE id = $1 RETURNING id',
          [route.id]
        );
        if (rows.length === 0) {
          json(res, 404, { success: false, message: 'Todo not found' });
          return;
        }
        json(res, 200, { data: { id: rows[0].id } });
        break;
      }

      // ── 404 ──
      default:
        json(res, 404, { success: false, message: 'Not found' });
    }
  } catch (err) {
    console.error('Server error:', err);
    json(res, 500, { success: false, message: 'Internal server error' });
  }
}

// ── Start server ────────────────────────────────────────

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = server;
