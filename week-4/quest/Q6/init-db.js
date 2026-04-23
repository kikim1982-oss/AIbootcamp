const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS salaries (
        id SERIAL PRIMARY KEY,
        job_category VARCHAR(50) NOT NULL DEFAULT '기타',
        salary INTEGER NOT NULL,
        monthly_expense INTEGER,
        comment VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ salaries 테이블 생성 완료');

    const existing = await client.query('SELECT COUNT(*) FROM salaries');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO salaries (job_category, salary, monthly_expense, comment) VALUES
        ('개발',   4800, 180, '야근이 많지만 그래도 만족해요'),
        ('디자인', 3600, 150, '포트폴리오 쌓는 중'),
        ('마케팅', 3200, 120, '성과급이 더 크게 작용해요'),
        ('개발',   6500, 250, '스타트업 스톡옵션 포함'),
        ('영업',   4200, 200, '인센티브 포함 금액입니다'),
        ('기타',   2800, 100, '이제 막 취업했어요!')
      `);
      console.log('✅ 샘플 데이터 6개 삽입 완료');
    } else {
      console.log('ℹ️  샘플 데이터 이미 존재, 스킵');
    }

    console.log('\n🎉 DB 초기화 완료!');
  } finally {
    client.release();
    await pool.end();
  }
}

initDB().catch(err => {
  console.error('❌ DB 초기화 실패:', err.message);
  process.exit(1);
});
