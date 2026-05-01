// Initialize Supabase DB by running schema.sql
// Usage: node init-db.js
//
// Reads connection string from CLI arg, env var DATABASE_URL, or hardcoded default.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CONN =
  process.argv[2] ||
  process.env.DATABASE_URL ||
  'postgresql://postgres.mivldxnchiveptioseao:S02hvWed49d9fpsl@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

const SQL_FILE = path.join(__dirname, 'schema.sql');

(async () => {
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');
  const client = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });

  console.log('🔌 Connecting to Supabase ...');
  await client.connect();
  console.log('✅ Connected.\n');

  console.log('▶  Running schema.sql ...');
  await client.query(sql);
  console.log('✅ Schema applied.\n');

  // Verification
  const cats = await client.query('SELECT type, COUNT(*) AS n FROM categories GROUP BY type ORDER BY type;');
  console.log('📋 categories rows:');
  cats.rows.forEach(r => console.log(`   ${r.type.padEnd(8)} → ${r.n} rows`));

  const tx = await client.query('SELECT COUNT(*) AS n FROM transactions;');
  console.log(`📋 transactions rows: ${tx.rows[0].n}`);

  const view = await client.query("SELECT COUNT(*) AS n FROM information_schema.views WHERE table_name = 'v_category_summary';");
  console.log(`📋 v_category_summary view exists: ${view.rows[0].n > 0 ? 'yes' : 'no'}`);

  await client.end();
  console.log('\n🎉 DB initialization complete.');
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
