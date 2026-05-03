require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const SEED_PRODUCTS = [
  { name: '클래식 라운드',   price:  89000, image_url: '/images/classic-round.png',    description: '블랙 토터스 패턴, 빈티지 학구파 룩',   category: '라운드' },
  { name: '미니멀 티타늄',   price: 159000, image_url: '/images/minimal-titanium.png', description: '초경량 티타늄 실버, 모던 미니멀',      category: '미니멀' },
  { name: '레트로 스퀘어',   price:  72000, image_url: '/images/retro-square.png',     description: '브라운 두꺼운 아세테이트, 90s 빈티지', category: '스퀘어' },
  { name: '캣아이 버건디',   price:  98000, image_url: '/images/cat-eye.png',          description: '딥 버건디 컬러, 우아한 캣아이',        category: '캣아이' },
  { name: '스포츠 하프림',   price: 128000, image_url: '/images/sport-half.png',       description: '네이비 메탈, 가볍고 액티브',           category: '스포츠' },
  { name: '클리어 라운드',   price:  68000, image_url: '/images/clear-frame.png',      description: '투명 프레임, K-pop 트렌디',            category: '라운드' },
];

async function main() {
  console.log('▶ Connecting to Supabase…');

  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');

  const client = await pool.connect();
  try {
    console.log('▶ Applying schema (users, products, cart)…');
    await client.query(schema);

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM products');
    if (rows[0].n > 0) {
      console.log(`✓ products already has ${rows[0].n} row(s) — skipping seed`);
    } else {
      console.log('▶ Seeding 6 demo products…');
      for (const p of SEED_PRODUCTS) {
        await client.query(
          `INSERT INTO products (name, price, image_url, description, category)
           VALUES ($1, $2, $3, $4, $5)`,
          [p.name, p.price, p.image_url, p.description, p.category]
        );
      }
      console.log('✓ Seed complete');
    }

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users)    AS users,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM cart)     AS cart
    `);
    console.log('▶ Row counts:', counts.rows[0]);
    console.log('✅ DB initialized.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ init-db failed:', err);
  process.exit(1);
});
