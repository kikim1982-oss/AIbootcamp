require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL.trim(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT c.icon || ' ' || c.name AS category, COUNT(*) AS n, SUM(t.amount)::bigint AS total
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE t.date BETWEEN '2026-04-01' AND '2026-04-30' AND t.type = 'expense'
    GROUP BY c.icon, c.name, c.sort_order
    ORDER BY total DESC
  `);
  console.log('📊 4월 지출 카테고리별:');
  r.rows.forEach(x => console.log(`  ${x.category.padEnd(12)} ${String(x.n).padStart(2)}건 ₩${Number(x.total).toLocaleString()}`));
  await c.end();
})();
