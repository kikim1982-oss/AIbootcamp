// Seed 20 random April 2026 expense transactions
// Usage: node seed-april.js

require('dotenv').config();
const { Client } = require('pg');

const TX = [
  { date: '2026-04-01', cat: '식비',   amount: 12000,  memo: '점심 김치찌개' },
  { date: '2026-04-02', cat: '교통',   amount: 1400,   memo: '지하철 출퇴근' },
  { date: '2026-04-03', cat: '식비',   amount: 35000,  memo: '친구와 저녁' },
  { date: '2026-04-05', cat: '구독료', amount: 14900,  memo: '넷플릭스 월 구독' },
  { date: '2026-04-07', cat: '식비',   amount: 8500,   memo: '편의점 도시락' },
  { date: '2026-04-08', cat: '의료',   amount: 25000,  memo: '약국 비타민' },
  { date: '2026-04-10', cat: '식비',   amount: 18000,  memo: '스타벅스 모임' },
  { date: '2026-04-11', cat: '여가',   amount: 22000,  memo: 'CGV 영화' },
  { date: '2026-04-12', cat: '교통',   amount: 4500,   memo: '택시 (퇴근)' },
  { date: '2026-04-14', cat: '주거',   amount: 850000, memo: '4월 월세' },
  { date: '2026-04-15', cat: '식비',   amount: 9800,   memo: '마트 야채·과일' },
  { date: '2026-04-17', cat: '의류',   amount: 89000,  memo: '봄 셔츠 2장' },
  { date: '2026-04-18', cat: '경조사', amount: 100000, memo: '결혼식 축의금' },
  { date: '2026-04-20', cat: '식비',   amount: 28000,  memo: '파스타 저녁' },
  { date: '2026-04-22', cat: '구독료', amount: 9900,   memo: '멜론 스트리밍' },
  { date: '2026-04-24', cat: '식비',   amount: 15000,  memo: '한식 점심' },
  { date: '2026-04-25', cat: '여가',   amount: 45000,  memo: '골프 연습장' },
  { date: '2026-04-26', cat: '교통',   amount: 3200,   memo: '시내버스' },
  { date: '2026-04-27', cat: '기타',   amount: 12000,  memo: '다이소 생활용품' },
  { date: '2026-04-30', cat: '식비',   amount: 32000,  memo: '동료 회식' },
];

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL.trim(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✅ Connected.');

  // Map category names → ids
  const cats = await client.query(`SELECT id, name FROM categories WHERE type = 'expense'`);
  const catMap = Object.fromEntries(cats.rows.map(r => [r.name, r.id]));

  let inserted = 0;
  for (const t of TX) {
    const catId = catMap[t.cat];
    if (!catId) {
      console.error(`❌ category not found: ${t.cat}`);
      continue;
    }
    await client.query(
      `INSERT INTO transactions (type, category_id, amount, memo, date)
       VALUES ('expense', $1, $2, $3, $4)`,
      [catId, t.amount, t.memo, t.date]
    );
    inserted++;
  }

  const total = await client.query(
    `SELECT SUM(amount)::bigint AS total, COUNT(*) AS n
     FROM transactions
     WHERE date BETWEEN '2026-04-01' AND '2026-04-30' AND type = 'expense'`
  );
  console.log(`\n📊 4월 지출: ${inserted}건 등록`);
  console.log(`   누적 ${total.rows[0].n}건 / ₩${Number(total.rows[0].total).toLocaleString()}`);

  await client.end();
})().catch(e => { console.error(e); process.exit(1); });
