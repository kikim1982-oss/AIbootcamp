const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').trim(),
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    // posts 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL DEFAULT '잡담',
        content TEXT NOT NULL,
        likes INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ posts 테이블 생성 완료');

    // 샘플 데이터 (이미 있으면 스킵)
    const existing = await client.query('SELECT COUNT(*) FROM posts');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO posts (category, content, likes) VALUES
        ('고민', '취업 준비를 1년째 하고 있는데 점점 자신감이 떨어져요. 어떻게 하면 좋을까요?', 5),
        ('칭찬', '오늘 카페에서 모르는 분이 제 코드 보시고 "잘 짜셨네요"라고 해주셨어요. 너무 기뻤어요!', 12),
        ('응원', '다들 화이팅! AI 부트캠프 완주합시다 💪', 8),
        ('잡담', '점심 뭐 먹을지 매일 고민인데 저만 그런가요 ㅋㅋ', 3)
      `);
      console.log('✅ 샘플 게시글 4개 삽입 완료');
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
