# 🗺️ Quest 4 진행 계획 — 내 가계부 DB를 분석하는 에이전트

> 목표: Q3에서 만든 Supabase DB(transactions/categories)에 에이전트(Claude Code)를 연결해서, 자연어로 묻는 **소비 분석 비서** 완성

---

## ✅ 전체 단계 한눈에 보기

| 단계 | 작업 | 상태 |
| --- | --- | --- |
| Step 0 | 사전 점검 (Q3 DB·데이터 확보) | ⬜ |
| Step 1 | DB 접근 방식 결정 (Postgres MCP vs HTTP API) | ⬜ |
| Step 2 | Postgres MCP 연결 (.mcp.json 추가) | ⬜ |
| Step 3 | 데이터 보강 (3월·5월 가짜 데이터 추가) | ⬜ |
| Step 4 | **명령 1 — 기본 조회** + 스크린샷 | ⬜ |
| Step 5 | **명령 2 — 패턴 분석** + 스크린샷 | ⬜ |
| Step 6 | **명령 3 — 절약 조언** + 스크린샷 | ⬜ |
| Step 7 | (보너스) 월간 리포트 자동 생성 | ⬜ |
| Step 8 | (보너스) 소비 등급 부여 (A/B/C) | ⬜ |
| Step 9 | 결과 정리 — `result.md` + 스크린샷 모음 | ⬜ |
| Step 10 | GitHub 푸시 + README 업데이트 | ⬜ |
| Step 11 | 단톡방 공유 (보너스 5pt) | ⬜ |

---

## Step 0. 사전 점검

- [x] Q3 가계부 DB 정상 작동 확인 (transactions·categories·v_category_summary)
- [x] 4월 지출 21건 / ₩1,360,200 등록 완료
- [ ] 추가로 3월·5월 데이터 보강 → 비교 분석이 가능해짐 (Step 3)

> 💡 **현재 데이터 상태:** 4월만 21건 있어서 "지난달 비교" 같은 질문에 답이 부실. Step 3에서 보강 권장.

---

## Step 1. DB 접근 방식 — 2가지 옵션

| 방식 | 장점 | 단점 |
| --- | --- | --- |
| **A. Postgres MCP** | 자연어 → SQL 자동 생성, 빠른 분석 | `.mcp.json` 추가 + 재시작 필요 |
| **B. HTTP API (`/api/transactions`)** | Q3 server.js 그대로 활용 | 집계 SQL 한정적, 클라이언트 분석 |
| **C. Bash + node + pg (현재 사용 중)** | 즉시 사용 가능 | 매번 스크립트 작성 |

➡️ **A 추천** — `.mcp.json`에 Postgres MCP 추가하면 가장 강력. 단톡방 시연용으로도 임팩트 있음.

---

## Step 2. Postgres MCP 연결

`.mcp.json`에 다음 추가:

```json
{
  "mcpServers": {
    "postgres-budget": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.mivldxnchiveptioseao:S02hvWed49d9fpsl@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
```

⚠️ **보안:** 위 connection string은 학습용. 실제 운영에선 read-only role을 별도로 만들어 사용 권장.

→ Claude Code 재시작 후 `/mcp`로 연결 확인.

---

## Step 3. 데이터 보강 (선택)

비교 분석 풍부하게 하려면 3월·5월 데이터를 더 추가:
- **3월 지출 25건 ~ 1,400,000원** — 비교군
- **5월 지출 15건 ~ 800,000원** (4/30 기준 진행 중)
- **수입** 4월·5월 급여·부수입 5건 (잔액 계산 가능하게)

이건 `seed-history.js` 스크립트로 자동화 가능.

---

## Step 4~6. 명령 3종 실행 (필수 — 25pt 기본)

각 명령마다:
1. 자연어로 에이전트에게 질문
2. 에이전트가 SQL 생성·실행 → 결과 분석
3. 답변이 부족하면 후속 질문 (활용 5pt 확보)
4. **스크린샷 캡처** → `screenshots/` 저장

### 📊 명령 1 — 기본 조회 (필수)
**예시 질문:**
- "이번 달 4월 총 지출 얼마야?"
- "식비로 가장 많이 쓴 날·금액 알려줘"
- "교통비 월평균 얼마야?"

**스크린샷:** `screenshots/cmd1-query.png`

### 🔍 명령 2 — 패턴 분석 (필수)
**예시 질문:**
- "4월 지출을 카테고리별로 비중 분석해줘 (Top 3 + 인사이트)"
- "주중 vs 주말 지출 비교"
- "요일별 평균 지출"

**스크린샷:** `screenshots/cmd2-analysis.png`

### 💡 명령 3 — 절약 조언 (필수)
**예시 질문:**
- "월 예산 100만원이면 4월 사용률·남은 예산 알려주고, 줄일 만한 카테고리 1개 추천"
- "이 속도로 쓰면 연말까지 총 얼마 쓸 것 같아?"
- "구독료 패턴 봐서 쓸데없는 거 골라줘"

**스크린샷:** `screenshots/cmd3-advice.png`

---

## Step 7~8. 보너스 — 창의성 5pt 확보

다음 중 하나 이상 구현:

### 🎯 보너스 A — 월간 리포트 자동 생성
- 에이전트가 매월 1일 자동 실행 → 전월 리포트 markdown 생성
- 구성: 총 지출 / Top 5 카테고리 / 전월 대비 / 인사이트 3줄
- `/schedule` cron routine + Postgres MCP 활용

### 🏆 보너스 B — 소비 등급 (A/B/C/D)
- 카테고리별 사용량을 점수화 (예산 대비 %·요일 패턴 등)
- 종합 점수로 등급 부여 → 가계부 UI에 표시
- 사용 데이터: `categories.budget_default` 컬럼 활용

### 🚨 보너스 C — 카드값 알림
- 매주 일요일 → 이번 주 누적 지출 + 월말 예상치 → 슬랙/카카오톡 푸시
- 임계 초과 시 ⚠️ 경고

→ 1개라도 구현하면 창의성 5pt 확보

---

## Step 9. 결과 정리 — `result.md`

`week-5/Q4가계부분석에이전트/result.md` 작성:

```markdown
# Quest 4 결과 — 가계부 DB 분석 에이전트

## 1. DB 연결 방식
- Postgres MCP / connection string 마스킹 / 권한

## 2. 명령 3개

### 명령 1: 기본 조회
- 질문 / 답변 요약 / 스크린샷 / 한 줄 인사이트

### 명령 2: 패턴 분석
### 명령 3: 절약 조언

## 3. 보너스 — 자동화 / 등급 시스템

## 4. 후기
```

---

## Step 10. GitHub 푸시

Q3와 같은 폴더(`week-5/Q3가계부앱`) 위에 Q4 폴더 추가 → 커밋·푸시:
- `week-5/Q4가계부분석에이전트/` 안에 `quest4.md`, `planning.md`, `result.md`, `screenshots/`
- (선택) 보너스 스크립트 `monthly-report.js`, `seed-history.js` 등

⚠️ `.mcp.json`에 connection string이 들어가면 절대 커밋 금지 → `.mcp.json`은 이미 gitignore 되어있는지 확인.

---

## Step 11. 단톡방 공유 (5pt)

- 핵심 스크린샷 1~2장 + 가장 임팩트 있는 답변 인용 공유
- 다른 수강생 결과물에 리액션·코멘트

---

## 🎯 포인트 목표

| 항목 | 점수 | 어떻게 확보 |
| --- | --- | --- |
| 기본 완료 | 10pt | Step 4~6 (명령 3개 + 스크린샷) |
| 에이전트 활용 | 5pt | 각 명령에서 후속 질문 1회 (Step 4~6에 내장) |
| 창의성 | 5pt | Step 7 또는 8 (자동 리포트 / 등급) |
| 공유 보너스 | 5pt | Step 11 |
| **합계** | **25pt** | 올클리어 |

---

## 🔗 Quest 시리즈 연계

| Quest | 역할 | 기여 |
| --- | --- | --- |
| Q1 (Notion 비서) | 외부 SaaS MCP 연결 | "MCP = AI의 손과 발" 학습 |
| Q2 (Chrome 리서치) | 웹 자동 탐색 | "AI가 인터넷 직접 접근" |
| **Q3 (가계부 앱)** | 데이터를 **쌓는** 도구 | DB 인프라 구축 |
| **Q4 (분석 에이전트)** | 같은 DB를 **활용하는** 도구 | 데이터 = 자산 |

> 💡 Q3 + Q4 = "**같은 DB를 다른 관점에서 두 번 쓴다**" — 데이터 한 번 잘 쌓으면 활용은 무한.

---

## 🚀 빠른 시작 (3개 명령부터 즉시)

이미 Q3 DB가 살아있고 데이터도 21건 있으니, **Step 2부터 바로 시작 가능**.

1. `.mcp.json` 수정 → Claude Code 재시작
2. "이번 달 얼마 썼어?" 부터 묻기
3. 답변 화면 스크린샷
4. 후속 질문 → 답변 → 스크린샷
5. 30분 안에 기본 10pt + 활용 5pt 확보

데이터 보강은 시간 남으면 추가, 스킵해도 명령 3개는 충분.

---

## 다음에 할 것

➡️ **Step 2 — Postgres MCP 추가** 부터.
- `.mcp.json` 수정 자동화 가능 (제가 작성하고 재시작만 부탁드림)
- 또는 **HTTP API 방식(Q3 server.js)으로 진행**도 가능 — 어느 쪽으로 가시겠어요?
