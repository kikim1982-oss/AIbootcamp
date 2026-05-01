-- =====================================================
-- 💰 가계부 앱 (Household Ledger) — Database Schema
-- Target: Supabase PostgreSQL
-- Tables: categories, transactions
-- View:   v_category_summary
-- =====================================================

-- ---------------------------------------------
-- 1. categories — 카테고리 마스터
-- ---------------------------------------------
-- 수입/지출 카테고리 메타데이터(이름, 색상, 아이콘, 기본 예산)를
-- 한 곳에서 관리. transactions는 이 테이블을 FK로 참조.

CREATE TABLE IF NOT EXISTS categories (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color           TEXT NOT NULL DEFAULT 'gray',
  icon            TEXT,
  budget_default  INTEGER DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, type)
);

-- ---------------------------------------------
-- 2. transactions — 거래 내역
-- ---------------------------------------------
-- 한 행 = 한 건의 수입 또는 지출.
-- amount는 항상 양수(>0); 수입/지출 구분은 type 컬럼.

CREATE TABLE IF NOT EXISTS transactions (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  memo        TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------
-- 3. indexes
-- ---------------------------------------------

CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
-- Note: month-level filtering uses date BETWEEN ranges in queries,
-- which can leverage idx_transactions_date directly (no extra index needed).

-- ---------------------------------------------
-- 4. seed: 기본 카테고리 14개
-- ---------------------------------------------

INSERT INTO categories (name, type, color, icon, sort_order) VALUES
  ('급여',     'income',  'emerald',  '💼', 1),
  ('부수입',   'income',  'green',    '💵', 2),
  ('이자',     'income',  'lime',     '📈', 3),
  ('환급',     'income',  'teal',     '↩️', 4),
  ('기타수입', 'income',  'cyan',     '✨', 5),
  ('식비',     'expense', 'amber',    '🍱', 1),
  ('교통',     'expense', 'sky',      '🚌', 2),
  ('주거',     'expense', 'violet',   '🏠', 3),
  ('구독료',   'expense', 'fuchsia',  '🎬', 4),
  ('경조사',   'expense', 'rose',     '🎁', 5),
  ('의류',     'expense', 'pink',     '👗', 6),
  ('의료',     'expense', 'red',      '🏥', 7),
  ('여가',     'expense', 'orange',   '🎮', 8),
  ('기타',     'expense', 'gray',     '📦', 9)
ON CONFLICT (name, type) DO NOTHING;

-- ---------------------------------------------
-- 5. view: 카테고리별 월간 합계 (조회 편의용)
-- ---------------------------------------------
-- 서버 GET /api/transactions/summary 응답에 그대로 활용 가능

CREATE OR REPLACE VIEW v_category_summary AS
SELECT
  t.type,
  c.id        AS category_id,
  c.name      AS category,
  c.color,
  c.icon,
  TO_CHAR(t.date, 'YYYY-MM') AS year_month,
  SUM(t.amount)  AS total,
  COUNT(*)       AS tx_count
FROM transactions t
JOIN categories c ON c.id = t.category_id
GROUP BY t.type, c.id, c.name, c.color, c.icon, TO_CHAR(t.date, 'YYYY-MM');

-- ---------------------------------------------
-- 6. (선택) RLS 비활성화 — 학습용
-- ---------------------------------------------
-- 운영 환경에서는 RLS + 정책 설정 필수. 본 프로젝트는 학습 목적이라 OFF.

ALTER TABLE categories   DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 끝. 실행 방법:
--   psql "<connection-string>" -f schema.sql
-- 또는 Supabase Dashboard → SQL Editor에 통째로 붙여넣기
-- =====================================================
