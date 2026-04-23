const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    // questions 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200),
        option_a VARCHAR(200) NOT NULL,
        option_b VARCHAR(200) NOT NULL,
        category VARCHAR(50) DEFAULT '기타',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ questions 테이블 생성 완료');

    // votes 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        choice CHAR(1) NOT NULL CHECK (choice IN ('A', 'B')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ votes 테이블 생성 완료');

    // 샘플 데이터 (이미 있으면 스킵)
    const existing = await client.query('SELECT COUNT(*) FROM questions');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO questions (title, option_a, option_b, category) VALUES
        ('직장 딜레마', '월급 500 + 주7일 출근', '월급 300 + 주4일 출근', '직장'),
        ('카페인 선택', '스타벅스 아메리카노', '편의점 커피', '음식'),
        ('주거 고민', '월세 50만원 혼자 살기', '월세 20만원 룸메이트랑 살기', '라이프'),
        ('재택 vs 출근', '재택근무 + 연봉 10% 삭감', '출근 + 연봉 유지', '직장')
      `);
      console.log('✅ 샘플 질문 4개 삽입 완료');

      // 샘플 투표 데이터
      await client.query(`
        INSERT INTO votes (question_id, choice) VALUES
        (1, 'A'), (1, 'A'), (1, 'A'), (1, 'B'),
        (2, 'A'), (2, 'B'), (2, 'B'), (2, 'B')
      `);
      console.log('✅ 샘플 투표 데이터 삽입 완료');
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
