require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// DB 연결
// ---------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ---------------------------------------------------------------------------
// Lazy DB init — 테이블이 없으면 생성
// ---------------------------------------------------------------------------
let dbInitialized = false;
async function initDB() {
  if (dbInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  dbInitialized = true;
}

// ---------------------------------------------------------------------------
// 유틸리티
// ---------------------------------------------------------------------------
function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
  };
}

function sendJSON(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJSON(res, 404, { success: false, message: 'File not found' });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ---------------------------------------------------------------------------
// 라우팅
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const { method } = req;
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  try {
    // ---- API: GET /api/memos ----
    if (method === 'GET' && pathname === '/api/memos') {
      await initDB();
      const result = await pool.query(
        'SELECT id, title, content, created_at FROM memos ORDER BY created_at DESC'
      );
      return sendJSON(res, 200, { data: result.rows.map(mapRow) });
    }

    // ---- API: POST /api/memos ----
    if (method === 'POST' && pathname === '/api/memos') {
      await initDB();
      const body = await parseBody(req);
      const result = await pool.query(
        'INSERT INTO memos (title, content) VALUES ($1, $2) RETURNING id, title, content, created_at',
        [body.title || '', body.content || '']
      );
      return sendJSON(res, 201, { data: mapRow(result.rows[0]) });
    }

    // ---- API: PUT /api/memos/:id ----
    const putMatch = method === 'PUT' && pathname.match(/^\/api\/memos\/(\d+)$/);
    if (putMatch) {
      await initDB();
      const id = Number(putMatch[1]);
      const body = await parseBody(req);
      const result = await pool.query(
        'UPDATE memos SET title = $1, content = $2 WHERE id = $3 RETURNING id, title, content, created_at',
        [body.title || '', body.content || '', id]
      );
      if (result.rows.length === 0) {
        return sendJSON(res, 404, { success: false, message: 'Memo not found' });
      }
      return sendJSON(res, 200, { data: mapRow(result.rows[0]) });
    }

    // ---- API: DELETE /api/memos/:id ----
    const deleteMatch = method === 'DELETE' && pathname.match(/^\/api\/memos\/(\d+)$/);
    if (deleteMatch) {
      await initDB();
      const id = Number(deleteMatch[1]);
      const result = await pool.query(
        'DELETE FROM memos WHERE id = $1 RETURNING id',
        [id]
      );
      if (result.rows.length === 0) {
        return sendJSON(res, 404, { success: false, message: 'Memo not found' });
      }
      return sendJSON(res, 200, { data: { id } });
    }

    // ---- 정적 파일 서빙 ----
    if (method === 'GET') {
      const safePath = pathname === '/' ? '/index.html' : pathname;
      const ext = path.extname(safePath);
      const filePath = path.join(__dirname, safePath);
      const contentType = MIME[ext] || 'application/octet-stream';
      return serveStaticFile(res, filePath, contentType);
    }

    // ---- 매칭되지 않는 요청 ----
    sendJSON(res, 404, { success: false, message: 'Not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJSON(res, 500, { success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// 서버 시작
// ---------------------------------------------------------------------------
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = server;
