// =====================================================
// 💰 가계부 앱 — Express + Supabase Postgres
// 3-file project: server.js + index.html + (.env)
// =====================================================
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------
// Postgres pool (Supabase)
// ---------------------------------------------
const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

// ---------------------------------------------
// Middleware
// ---------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ---------------------------------------------
// Helpers
// ---------------------------------------------
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, status, message) => res.status(status).json({ success: false, message });

const TX_SELECT = `
  SELECT t.id, t.type, c.name AS category, t.amount, t.memo,
         TO_CHAR(t.date, 'YYYY-MM-DD') AS date,
         c.color, c.icon, t.category_id, t.created_at
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`;

// ---------------------------------------------
// Routes
// ---------------------------------------------

// GET /api/categories — all categories
app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, type, color, icon, budget_default, sort_order FROM categories ORDER BY type, sort_order'
    );
    ok(res, rows);
  } catch (err) {
    console.error('GET /api/categories', err);
    fail(res, 500, '카테고리 목록을 불러오지 못했습니다');
  }
});

// GET /api/transactions?month=YYYY-MM
app.get('/api/transactions', async (req, res) => {
  try {
    const { month } = req.query;
    let sql = TX_SELECT;
    const params = [];
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return fail(res, 400, "month는 'YYYY-MM' 형식이어야 합니다");
      }
      params.push(month);
      sql += ` WHERE TO_CHAR(t.date, 'YYYY-MM') = $1`;
    }
    sql += ' ORDER BY t.date DESC, t.id DESC';
    const { rows } = await pool.query(sql, params);
    ok(res, rows);
  } catch (err) {
    console.error('GET /api/transactions', err);
    fail(res, 500, '거래 내역을 불러오지 못했습니다');
  }
});

// GET /api/transactions/summary?month=YYYY-MM — uses v_category_summary
app.get('/api/transactions/summary', async (req, res) => {
  try {
    const { month } = req.query;
    let sql = `SELECT type, category_id, category, color, icon, year_month,
                      total::int AS total, tx_count::int AS tx_count
               FROM v_category_summary`;
    const params = [];
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return fail(res, 400, "month는 'YYYY-MM' 형식이어야 합니다");
      }
      params.push(month);
      sql += ` WHERE year_month = $1`;
    }
    sql += ' ORDER BY year_month DESC, type, total DESC';
    const { rows } = await pool.query(sql, params);
    ok(res, rows);
  } catch (err) {
    console.error('GET /api/transactions/summary', err);
    fail(res, 500, '카테고리별 합계를 불러오지 못했습니다');
  }
});

// POST /api/transactions
app.post('/api/transactions', async (req, res) => {
  try {
    const { type, category, amount, memo, date } = req.body || {};

    // ---- validation ----
    if (type !== 'income' && type !== 'expense') {
      return fail(res, 400, "type은 'income' 또는 'expense' 여야 합니다");
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return fail(res, 400, '카테고리(category)는 비워둘 수 없습니다');
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || !Number.isInteger(amt)) {
      return fail(res, 400, 'amount는 0보다 큰 정수여야 합니다');
    }
    if (!date || isNaN(new Date(date).getTime())) {
      return fail(res, 400, "date는 'YYYY-MM-DD' 형식의 유효한 날짜여야 합니다");
    }

    // ---- find category_id by (name, type) ----
    const catLookup = await pool.query(
      'SELECT id FROM categories WHERE name = $1 AND type = $2',
      [category.trim(), type]
    );
    if (catLookup.rowCount === 0) {
      return fail(res, 400, `카테고리 '${category}' (${type})를 찾을 수 없습니다`);
    }
    const categoryId = catLookup.rows[0].id;

    // ---- insert ----
    const insert = await pool.query(
      `INSERT INTO transactions (type, category_id, amount, memo, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [type, categoryId, amt, memo ? String(memo).trim() : null, date]
    );
    const newId = insert.rows[0].id;

    // ---- return joined row ----
    const { rows } = await pool.query(TX_SELECT + ' WHERE t.id = $1', [newId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('POST /api/transactions', err);
    fail(res, 500, '거래 등록 중 오류가 발생했습니다');
  }
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return fail(res, 400, '잘못된 id 입니다');
    }
    const { rowCount } = await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    if (rowCount === 0) return fail(res, 404, '해당 내역을 찾을 수 없습니다');
    ok(res, { id });
  } catch (err) {
    console.error('DELETE /api/transactions/:id', err);
    fail(res, 500, '삭제 중 오류가 발생했습니다');
  }
});

// ---------------------------------------------
// Error handler (last resort)
// ---------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  fail(res, 500, '서버 오류가 발생했습니다');
});

// ---------------------------------------------
// Start (local) / export (serverless)
// ---------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Server on http://localhost:${PORT}`);
  });
}

module.exports = app;
