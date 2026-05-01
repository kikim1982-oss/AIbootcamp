# 🗺️ Quest 3 진행 계획 — 가계부 앱 (Server + DB)

> 목표: Supabase DB + Express(또는 Next.js) 서버로 수입/지출 CRUD + 카테고리별 합계가 가능한 가계부 앱 구현 → GitHub 푸시

---

## ✅ 전체 단계 한눈에 보기

| 단계 | 작업 | 상태 |
| --- | --- | --- |
| Step 0 | 사전 준비 (Supabase 프로젝트 + Node 환경 확인) | ⬜ |
| Step 1 | 폴더 구조 + 의존성 설치 | ⬜ |
| Step 2 | Supabase 테이블 설계 + 생성 | ⬜ |
| Step 3 | `.env` 환경 변수 설정 | ⬜ |
| Step 4 | 서버: 기본 Express 라우트 (`/api/transactions`) | ⬜ |
| Step 5 | CREATE — 수입/지출 등록 API | ⬜ |
| Step 6 | READ — 전체 내역 조회 API | ⬜ |
| Step 7 | READ — 카테고리별 합계 API | ⬜ |
| Step 8 | UPDATE / DELETE API (선택) | ⬜ |
| Step 9 | 프론트엔드 (`index.html` + `client.js`) | ⬜ |
| Step 10 | 동작 테스트 + 스크린샷 | ⬜ |
| Step 11 | (보너스) 월별 차트 또는 예산 알림 | ⬜ |
| Step 12 | GitHub 푸시 + README 작성 | ⬜ |
| Step 13 | 단톡방 공유 (공유 보너스 5pt) | ⬜ |

---

## Step 0. 사전 준비

- [ ] **Supabase 계정** (없으면 https://supabase.com → New project)
- [ ] **Node.js 18+** 설치 확인 — `node -v`
- [ ] 본 저장소 `package.json` 있는지 확인 (이미 있으면 스킵)

> 💡 **왜 Supabase?** 무료 티어로 PostgreSQL DB + REST API + Auth 한 번에. 프로젝트당 500MB 데이터까지 무료.

---

## Step 1. 폴더 구조

```
week-5/Q3가계부앱/
├── server.js         # Express 서버 + Supabase 연결
├── index.html        # 입력 폼 + 내역 표시
├── client.js         # fetch /api/* 호출
├── package.json
├── .env              # SUPABASE_URL, SUPABASE_KEY (gitignore!)
├── .gitignore
└── README.md
```

**의존성:**
```bash
npm init -y
npm install express @supabase/supabase-js dotenv cors
```

---

## Step 2. Supabase 테이블 설계

Supabase Dashboard → SQL Editor에서 실행:

```sql
CREATE TABLE transactions (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  memo        TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category ON transactions(category);
```

**카테고리 후보:**
- 수입: 급여, 부수입, 이자, 환급, 기타수입
- 지출: 식비, 교통, 주거, 구독료, 경조사, 의류, 의료, 여가, 기타

**RLS 설정 (간단 모드):**
```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- 또는 anon 키로 모든 작업 허용 (학습 목적, 실서비스 X)
```

---

## Step 3. `.env` 환경 변수

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
PORT=3000
```

`.gitignore`에 `.env` 반드시 추가!

---

## Step 4~7. 서버 API 설계

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| POST | `/api/transactions` | 등록 (수입/지출) |
| GET | `/api/transactions` | 전체 조회 (date DESC) |
| GET | `/api/transactions/summary` | 카테고리별 합계 |
| GET | `/api/transactions?month=2026-04` | (선택) 월별 필터 |
| PATCH | `/api/transactions/:id` | (선택) 수정 |
| DELETE | `/api/transactions/:id` | (선택) 삭제 |

**응답 포맷 통일 (CLAUDE.md 규약):**
```json
{ "success": true, "data": ... }
{ "success": false, "message": "..." }
```

**카테고리 합계 쿼리 (Step 7):**
```sql
SELECT type, category, SUM(amount) AS total, COUNT(*) AS count
FROM transactions
GROUP BY type, category
ORDER BY type, total DESC;
```

→ Supabase JS SDK에서는 `rpc()` 또는 별도 view 만들거나, 클라이언트에서 group by 처리.

---

## Step 9. 프론트엔드 (`index.html`)

**최소 UI 구성:**
- 입력 폼: 타입(수입/지출) · 날짜 · 카테고리 · 금액 · 메모 → 등록 버튼
- 카테고리별 합계 카드 (수입 총액·지출 총액·잔액)
- 내역 리스트 (최근 20건, 날짜·카테고리·금액·메모)
- (보너스) 월 선택 드롭다운으로 필터

**스타일:** Tailwind CDN 한 줄로 충분
```html
<script src="https://cdn.tailwindcss.com"></script>
```

---

## Step 10. 동작 테스트 + 스크린샷

| 테스트 | 캡처할 화면 |
| --- | --- |
| 1. 수입 등록 (예: 급여 3,000,000) | 등록 후 리스트 화면 |
| 2. 지출 5건 등록 (식비/교통/주거…) | 카테고리별 합계 표 |
| 3. 잔액 자동 계산 확인 | 상단 요약 카드 |
| 4. 에이전트 대화 화면 | Claude Code 실행 캡처 |

**스크린샷 저장 폴더:** `week-5/Q3가계부앱/screenshots/`
- `01-form.png` — 입력 폼
- `02-list.png` — 내역 리스트
- `03-summary.png` — 카테고리 합계
- `04-claude-chat.png` — 에이전트 대화 (필수)

---

## Step 11. (보너스) 창의성 5pt

다음 중 하나 이상 구현:
- **월별 지출 차트** — Chart.js로 라인/도넛 차트
- **예산 대비 사용량** — 카테고리별 예산 설정 → 80% 도달 시 경고
- **자동 분류** — 메모 키워드로 카테고리 추천 (간단 매칭)
- **CSV 내보내기** — 한 달치 내역 다운로드
- **다크 모드** + 모바일 반응형
- **AI 인사이트** — "이번 달 식비가 평소 대비 30% 늘었어요" 자동 요약

→ 1개라도 추가하면 창의성 5pt 확보

---

## Step 12. GitHub 푸시

```bash
git add week-5/Q3가계부앱/
git commit -m "Add week-5 Q3: 가계부 앱 (Supabase + Express)"
git push origin main
```

**README.md 필수 내용:**
- 프로젝트 개요 (1~2줄)
- 실행 방법 (`npm install && npm start`)
- `.env` 변수 설명 (값은 적지 말고 키 이름만)
- 화면 스크린샷 1~2장
- API 명세 (메서드·경로·역할)

---

## Step 13. 단톡방 공유 (보너스 5pt)

- GitHub repo 링크 + 동작 스크린샷 1~2장 공유
- 다른 수강생 결과물에 리액션·댓글

---

## 🎯 포인트 목표

| 항목 | 점수 | 어떻게 확보 |
| --- | --- | --- |
| 기본 완료 | 10pt | Step 1~10 (CRUD + 합계 + GitHub 제출) |
| 에이전트 활용 | 5pt | Claude와 2회 이상 대화 (Step 4·6·9 등) |
| 창의성 | 5pt | Step 11 보너스 1개 이상 |
| 공유 보너스 | 5pt | Step 13 |
| **합계** | **25pt** | 올클리어 |

---

## 🔥 Quest 1·2·3 비교

| 항목 | Q1 (Notion AI 비서) | Q2 (Chrome 리서치) | Q3 (가계부 앱) |
| --- | --- | --- | --- |
| MCP | Notion | Chrome + Notion | (없음) |
| 핵심 기술 | Notion DB 조작 | 웹 자동 탐색 | **Supabase + REST API** |
| AI의 역할 | 데이터 분석 | 데이터 수집 | **개발 파트너** (코드 작성) |
| 산출물 | 명령 시연 + 스크린샷 | md 리서치 보고서 | **풀스택 앱 + GitHub** |
| 핵심 메시지 | "내 데이터로 비서" | "AI가 인터넷 직접 탐색" | "AI와 함께 코딩" |

---

## 📌 추천 진행 순서 (실전 팁)

1. **Step 2 → Step 4 먼저**: DB 만들고 GET 한 줄로 빈 배열 받기 → 인프라 동작 확인
2. **Step 5(POST) 먼저, 데이터 1건 직접 SQL Editor로 넣고 GET으로 확인**
3. **프론트는 Step 9에서 한 번에**: 백엔드 동작 확인 후 UI 작성이 빠름
4. **Claude에게 "전체 server.js 한 번에 만들어줘"** 보다 "엔드포인트 1개씩"이 디버깅 쉬움

---

## 다음에 할 것

➡️ **Step 0 — Supabase 프로젝트 + Node 환경 확인**부터.
- Supabase 계정 있으세요? 없으면 같이 가입 가이드 진행
- 이미 있으면 → URL과 anon key만 준비해주시면 Step 1~3 자동 진행
