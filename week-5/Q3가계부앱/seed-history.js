// Seed historical demo data for 1월, 2월, 3월 + 매월 급여
// Pattern reference: 4월 (월세 850K + 구독료 24.8K + 식비 9건 + 가끔 의류/경조사)
// Usage: node seed-history.js

require('dotenv').config();
const { Client } = require('pg');

// ----------------------------------------------------
// 거래 내역 정의 — type, category, amount, memo, date
// ----------------------------------------------------
const TX = [
  // ============ 1월 (신정·설날 영향, 살짝 高) ============
  // 수입
  { type: 'income',  cat: '급여',    amount: 3000000, memo: '1월 급여',          date: '2026-01-25' },
  { type: 'income',  cat: '부수입',  amount: 200000,  memo: '설날 용돈',         date: '2026-01-29' },
  // 지출
  { type: 'expense', cat: '식비',    amount: 18000,   memo: '신년회 점심',       date: '2026-01-02' },
  { type: 'expense', cat: '교통',    amount: 1400,    memo: '지하철',            date: '2026-01-03' },
  { type: 'expense', cat: '식비',    amount: 45000,   memo: '친구와 신년회',     date: '2026-01-05' },
  { type: 'expense', cat: '구독료',  amount: 14900,   memo: '넷플릭스',          date: '2026-01-05' },
  { type: 'expense', cat: '식비',    amount: 9500,    memo: '편의점 도시락',     date: '2026-01-08' },
  { type: 'expense', cat: '의료',    amount: 35000,   memo: '감기약',            date: '2026-01-10' },
  { type: 'expense', cat: '식비',    amount: 22000,   memo: '친구 점심',         date: '2026-01-12' },
  { type: 'expense', cat: '주거',    amount: 850000,  memo: '1월 월세',          date: '2026-01-14' },
  { type: 'expense', cat: '의류',    amount: 120000,  memo: '겨울 코트',         date: '2026-01-15' },
  { type: 'expense', cat: '식비',    amount: 12000,   memo: '점심 도시락',       date: '2026-01-17' },
  { type: 'expense', cat: '여가',    amount: 28000,   memo: '영화관',            date: '2026-01-19' },
  { type: 'expense', cat: '경조사',  amount: 50000,   memo: '친구 결혼식 축의금', date: '2026-01-20' },
  { type: 'expense', cat: '구독료',  amount: 9900,    memo: '멜론',              date: '2026-01-22' },
  { type: 'expense', cat: '식비',    amount: 38000,   memo: '가족 외식 (설 전)', date: '2026-01-24' },
  { type: 'expense', cat: '교통',    amount: 3200,    memo: 'KTX 귀성',          date: '2026-01-27' },
  { type: 'expense', cat: '식비',    amount: 25000,   memo: '명절 음식 재료',    date: '2026-01-28' },
  { type: 'expense', cat: '경조사',  amount: 100000,  memo: '조카 세뱃돈',       date: '2026-01-29' },
  { type: 'expense', cat: '식비',    amount: 16000,   memo: '점심',              date: '2026-01-30' },
  { type: 'expense', cat: '기타',    amount: 18000,   memo: '다이소 생활용품',   date: '2026-01-31' },

  // ============ 2월 (짧은 달, 발렌타인) ============
  // 수입
  { type: 'income',  cat: '급여',    amount: 3000000, memo: '2월 급여',          date: '2026-02-25' },
  // 지출
  { type: 'expense', cat: '식비',    amount: 14000,   memo: '점심',              date: '2026-02-01' },
  { type: 'expense', cat: '교통',    amount: 1400,    memo: '지하철',            date: '2026-02-03' },
  { type: 'expense', cat: '구독료',  amount: 14900,   memo: '넷플릭스',          date: '2026-02-04' },
  { type: 'expense', cat: '식비',    amount: 11000,   memo: '편의점',            date: '2026-02-05' },
  { type: 'expense', cat: '식비',    amount: 32000,   memo: '동료와 저녁',       date: '2026-02-07' },
  { type: 'expense', cat: '여가',    amount: 18000,   memo: '보드게임 카페',     date: '2026-02-10' },
  { type: 'expense', cat: '식비',    amount: 8500,    memo: '편의점 도시락',     date: '2026-02-12' },
  { type: 'expense', cat: '주거',    amount: 850000,  memo: '2월 월세',          date: '2026-02-14' },
  { type: 'expense', cat: '식비',    amount: 65000,   memo: '발렌타인 디너',     date: '2026-02-14' },
  { type: 'expense', cat: '의류',    amount: 35000,   memo: '데이트 옷',         date: '2026-02-14' },
  { type: 'expense', cat: '식비',    amount: 13000,   memo: '점심',              date: '2026-02-16' },
  { type: 'expense', cat: '의료',    amount: 15000,   memo: '약국',              date: '2026-02-18' },
  { type: 'expense', cat: '식비',    amount: 10500,   memo: '편의점',            date: '2026-02-20' },
  { type: 'expense', cat: '구독료',  amount: 9900,    memo: '멜론',              date: '2026-02-22' },
  { type: 'expense', cat: '교통',    amount: 4800,    memo: '택시',              date: '2026-02-24' },
  { type: 'expense', cat: '식비',    amount: 28000,   memo: '친구 식사',         date: '2026-02-25' },
  { type: 'expense', cat: '여가',    amount: 38000,   memo: '헬스장 1개월권',    date: '2026-02-27' },
  { type: 'expense', cat: '식비',    amount: 19000,   memo: '점심',              date: '2026-02-28' },

  // ============ 3월 (봄, 신학기) ============
  // 수입
  { type: 'income',  cat: '급여',    amount: 3000000, memo: '3월 급여',          date: '2026-03-25' },
  { type: 'income',  cat: '환급',    amount: 180000,  memo: '연말정산 환급',     date: '2026-03-15' },
  // 지출
  { type: 'expense', cat: '식비',    amount: 12500,   memo: '점심',              date: '2026-03-02' },
  { type: 'expense', cat: '교통',    amount: 1400,    memo: '지하철',            date: '2026-03-03' },
  { type: 'expense', cat: '구독료',  amount: 14900,   memo: '넷플릭스',          date: '2026-03-04' },
  { type: 'expense', cat: '식비',    amount: 35000,   memo: '친구와 저녁',       date: '2026-03-05' },
  { type: 'expense', cat: '의류',    amount: 95000,   memo: '봄 자켓',           date: '2026-03-07' },
  { type: 'expense', cat: '식비',    amount: 9000,    memo: '편의점',            date: '2026-03-08' },
  { type: 'expense', cat: '식비',    amount: 22000,   memo: '점심 모임',         date: '2026-03-10' },
  { type: 'expense', cat: '여가',    amount: 25000,   memo: '전시회 관람',       date: '2026-03-12' },
  { type: 'expense', cat: '주거',    amount: 850000,  memo: '3월 월세',          date: '2026-03-14' },
  { type: 'expense', cat: '식비',    amount: 14000,   memo: '점심',              date: '2026-03-15' },
  { type: 'expense', cat: '식비',    amount: 28000,   memo: '저녁',              date: '2026-03-17' },
  { type: 'expense', cat: '교통',    amount: 3500,    memo: '택시',              date: '2026-03-19' },
  { type: 'expense', cat: '의료',    amount: 30000,   memo: '정기 검진',         date: '2026-03-20' },
  { type: 'expense', cat: '구독료',  amount: 9900,    memo: '멜론',              date: '2026-03-22' },
  { type: 'expense', cat: '식비',    amount: 16500,   memo: '점심',              date: '2026-03-23' },
  { type: 'expense', cat: '의류',    amount: 45000,   memo: '봄 셔츠',           date: '2026-03-25' },
  { type: 'expense', cat: '식비',    amount: 38000,   memo: '친구 저녁',         date: '2026-03-27' },
  { type: 'expense', cat: '여가',    amount: 32000,   memo: '골프 연습장',       date: '2026-03-28' },
  { type: 'expense', cat: '기타',    amount: 8500,    memo: '다이소',            date: '2026-03-30' },

  // ============ 4월 급여 (지출은 이미 등록됨) ============
  { type: 'income',  cat: '급여',    amount: 3000000, memo: '4월 급여',          date: '2026-04-25' },
];

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL.trim(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✅ Connected.');

  // category lookup
  const cats = await client.query(`SELECT id, name, type FROM categories`);
  const catMap = Object.fromEntries(
    cats.rows.map(r => [`${r.type}:${r.name}`, r.id])
  );

  let inserted = 0, skipped = 0;
  for (const t of TX) {
    const catId = catMap[`${t.type}:${t.cat}`];
    if (!catId) {
      console.error(`❌ category not found: ${t.type}/${t.cat}`);
      skipped++;
      continue;
    }
    await client.query(
      `INSERT INTO transactions (type, category_id, amount, memo, date)
       VALUES ($1, $2, $3, $4, $5)`,
      [t.type, catId, t.amount, t.memo, t.date]
    );
    inserted++;
  }

  console.log(`\n📥 ${inserted}건 등록 (스킵 ${skipped}건)\n`);

  // monthly summary
  const summary = await client.query(`
    SELECT
      TO_CHAR(date, 'YYYY-MM') AS month,
      type,
      COUNT(*) AS n,
      SUM(amount)::bigint AS total
    FROM transactions
    GROUP BY month, type
    ORDER BY month, type;
  `);
  console.log('📊 월별 요약 (수입/지출):');
  let lastMonth = null;
  summary.rows.forEach(r => {
    if (r.month !== lastMonth) {
      console.log(`\n  📅 ${r.month}`);
      lastMonth = r.month;
    }
    const typeLabel = r.type === 'income' ? '💰 수입' : '💸 지출';
    console.log(`    ${typeLabel} ${String(r.n).padStart(2)}건  ₩${Number(r.total).toLocaleString().padStart(11)}`);
  });

  await client.end();
  console.log('\n🎉 완료');
})().catch(e => { console.error(e); process.exit(1); });
