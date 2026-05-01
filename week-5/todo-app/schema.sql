-- =============================================
-- todo-app Database Schema
-- PostgreSQL (Supabase)
-- =============================================

-- 1. 카테고리 테이블
CREATE TABLE IF NOT EXISTS "todo-app_categories" (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL,
  color      VARCHAR(20)  NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- 기본 카테고리 데이터
INSERT INTO "todo-app_categories" (name, color) VALUES
  ('업무', '#3b82f6'),
  ('개인', '#10b981'),
  ('학습', '#f59e0b'),
  ('건강', '#ef4444')
ON CONFLICT DO NOTHING;

-- =============================================

-- 2. 유저 테이블
CREATE TABLE IF NOT EXISTS "todo-app_users" (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================

-- 3. 할 일 테이블
CREATE TABLE IF NOT EXISTS "todo-app_todos" (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  completed   BOOLEAN      NOT NULL DEFAULT FALSE,
  priority    VARCHAR(10)  NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
  category_id INT REFERENCES "todo-app_categories"(id) ON DELETE SET NULL,
  user_id     INT REFERENCES "todo-app_users"(id) ON DELETE CASCADE,
  due_date    DATE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON "todo-app_todos";
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON "todo-app_todos"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
