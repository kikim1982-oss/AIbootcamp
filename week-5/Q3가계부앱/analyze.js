// Q4 분석 에이전트용 SQL 실행기
// Usage: node analyze.js "<sql>"
//   or:  node analyze.js --query <name>

require('dotenv').config({ path: '../Q3가계부앱/.env' });
const { Client } = require('pg');

const QUERIES = {
  // ─── 명령 1: 기본 조회 ───
  'april-total': `
    SELECT
      COUNT(*) AS tx_count,
      SUM(amount)::bigint AS total
    FROM transactions
    WHERE type='expense' AND date BETWEEN '2026-04-01' AND '2026-04-30';
  `,
  'top-food-day': `
    SELECT t.date, c.name AS category, t.memo, t.amount
    FROM transactions t JOIN categories c ON c.id=t.category_id
    WHERE t.type='expense' AND c.name='식비'
    ORDER BY t.amount DESC LIMIT 5;
  `,
  'transport-monthly-avg': `
    SELECT
      TO_CHAR(date, 'YYYY-MM') AS month,
      COUNT(*) AS n,
      SUM(amount)::bigint AS total
    FROM transactions t JOIN categories c ON c.id=t.category_id
    WHERE t.type='expense' AND c.name='교통'
    GROUP BY month
    ORDER BY month;
  `,
};

(async () => {
  const arg = process.argv[2];
  if (!arg) {
    console.log('Available queries:', Object.keys(QUERIES).join(', '));
    process.exit(0);
  }
  const sql = QUERIES[arg] || arg;
  const c = new Client({
    connectionString: process.env.DATABASE_URL.trim(),
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(sql);
  console.table(r.rows);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
