# 🗺️ Quest 8 진행 계획 — 나만의 AI 대시보드 (보스 퀘스트)

> 목표: Auth + MCP + DB + AI 4가지를 하나의 웹앱에 종합 → 로그인 후 위젯 2~3개 + AI 브리핑 → Vercel 배포

---

## ⚠️ 보스 퀘스트 진행 원칙

1. **완벽 추구 X** — 위젯 2개만 동작해도 25pt 가능
2. **재활용 우선** — Q1·Q3·Q5·Q7 자산 그대로 가져오기
3. **MVP 먼저** — 위젯 1개 + 배포 → 그 다음 추가
4. **시간 박스** — 한 위젯에 30분 넘으면 스킵

---

## ✅ 전체 단계 한눈에 보기

| 단계 | 작업 | 시간 예상 | 상태 |
| --- | --- | --- | --- |
| Step 0 | 5주차 자산 점검 (재활용 가능 부품 목록) | 5분 | ⬜ |
| Step 1 | 위젯 우선순위 결정 (필수 2개 + 옵션 1개) | 10분 | ⬜ |
| Step 2 | 프론트엔드 베이스 (Next.js — Q5 코드 복사) | 15분 | ⬜ |
| Step 3 | Auth 동작 확인 (Q5 그대로) | 5분 | ⬜ |
| Step 4 | 위젯 1 — 가계부 지출 (Q3 DB 재활용) | 30분 | ⬜ |
| Step 5 | 위젯 2 — 노션 할일 (Notion MCP / API) | 40분 | ⬜ |
| Step 6 | 위젯 3 — 날씨 API (선택) | 20분 | ⬜ |
| Step 7 | AI 브리핑 컴포넌트 (3개 데이터 종합) | 30분 | ⬜ |
| Step 8 | 대시보드 레이아웃 통합 + Header (사용자명 표시) | 20분 | ⬜ |
| Step 9 | 동작 확인 + 스크린샷 5장 | 10분 | ⬜ |
| Step 10 | GitHub 푸시 + Vercel 배포 + 환경 변수 | 20분 | ⬜ |
| Step 11 | 단톡방 공유 (5pt) | 즉시 | ⬜ |

**총 예상 시간: 약 3.5시간** (위젯 2개 + AI 브리핑 + 배포)

---

## Step 0. 5주차 자산 재활용 매핑

| 출처 | 활용처 | 재활용 정도 |
| --- | --- | --- |
| **Q3 가계부 DB** (transactions, categories) | 위젯: 이번 달 지출 카드 | 100% (그대로) |
| **Q4 SQL 쿼리들** | 위젯 데이터 가공 | 80% |
| **Q5 Auth** (Next.js + Supabase) | 로그인 시스템 | 100% (복사) |
| **Q1 Notion MCP 연결** | 위젯: 오늘의 할일 | 사용은 가능, 그러나 클라우드(Vercel)에선 직접 사용 불가 → 별도 API/route 필요 |
| **Q7 Context** | AI 브리핑 톤 결정 | 50% |
| **Q2 Chrome 리서치 패턴** | 외부 API (날씨·뉴스) | 컨셉만 차용 |

---

## Step 1. 위젯 우선순위

| # | 위젯 | 데이터 소스 | 난이도 | 추천 |
| --- | --- | --- | --- | --- |
| 1 | **이번 달 지출 카드** | Supabase (Q3 DB) | 下 | ⭐ 필수 |
| 2 | **AI 브리핑** | 위 위젯 데이터 종합 | 中 | ⭐ 필수 |
| 3 | **오늘의 할일** | Notion API (Q1 일정 DB) | 中 | ⭐ 추천 |
| 4 | **이번 주 운동 일정** | Notion (Q1 일정) | 下 | (3과 통합 가능) |
| 5 | **오늘 날씨** | OpenWeather API | 下 | 선택 |
| 6 | **노트 즐겨찾기** | Notion (Q1 노트 DB) | 中 | 선택 |

➡️ **MVP 구성:** **위젯 1 (지출) + 위젯 3 (할일) + AI 브리핑** = 데이터 소스 2개(Supabase + Notion) + AI

---

## Step 2. 프론트엔드 베이스

**Q5 폴더를 통째로 복사 → 이름만 바꾸기:**
```bash
cp -r week-5/Q5커뮤니티앱 week-5/Q8나만의AI대시보드/app
cd week-5/Q8나만의AI대시보드/app
```

또는 새로 시작:
```bash
npx create-next-app@latest week-5/Q8나만의AI대시보드/app --ts --tailwind --app
cd week-5/Q8나만의AI대시보드/app
npm install @supabase/supabase-js @supabase/ssr openai
```

**폴더 구조:**
```
app/
├── layout.tsx              # 헤더 (사용자명, 로그아웃)
├── page.tsx                # 대시보드 (로그인 시) / 로그인 페이지 (비로그인)
├── login/page.tsx
├── signup/page.tsx
└── api/
    ├── notion/todos/route.ts   # Notion → 오늘 일정 가져오기
    └── briefing/route.ts       # AI 브리핑 생성

components/
├── widgets/
│   ├── ExpenseWidget.tsx
│   ├── TodoWidget.tsx
│   └── BriefingWidget.tsx
└── DashboardLayout.tsx
```

---

## Step 3. Auth 확인

Q5에서 만든 `/login`, `/signup` 그대로 동작 확인. 로그인 시 `app/page.tsx`에서 `supabase.auth.getUser()`로 사용자 정보 받아 헤더에 표시.

---

## Step 4. 위젯 1 — 이번 달 지출

```tsx
// components/widgets/ExpenseWidget.tsx
async function ExpenseWidget() {
  const supabase = createServerClient();
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;

  const { data } = await supabase
    .from('transactions')
    .select('amount, type, categories(name, icon)')
    .gte('date', monthStart)
    .eq('type', 'expense');

  const total = data?.reduce((s, t) => s + t.amount, 0) || 0;
  const byCategory = /* group by category */;

  return (
    <Card>
      <h3>💸 이번 달 지출</h3>
      <p className="text-3xl font-bold text-rose-600">₩{total.toLocaleString()}</p>
      <div>{/* Top 3 카테고리 */}</div>
    </Card>
  );
}
```

→ 가계부 4개월 데이터 그대로 활용. 5월 데이터가 적으면 4월로 fallback.

---

## Step 5. 위젯 2 — 오늘의 할일 (Notion)

**문제:** Notion MCP는 로컬 Claude Code 전용 → Vercel 클라우드에선 직접 사용 불가
**해결책:** Notion **REST API** 직접 호출 (https://api.notion.com/v1)

```ts
// app/api/notion/todos/route.ts
export async function GET() {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${DATA_SOURCE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_INTEGRATION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: '날짜',
          date: { equals: new Date().toISOString().slice(0,10) }
        }
      }),
    }
  );
  const data = await response.json();
  return Response.json({ todos: data.results });
}
```

**Integration Token:** Notion → Settings → Integrations → New → "내 대시보드" → Copy token → Vercel 환경변수 `NOTION_INTEGRATION_TOKEN`

→ Q1에서 만든 일정 DB(`ffc01eecb97b4278af111a10eff8ccba`) 그대로 사용

---

## Step 6. (선택) 위젯 3 — 오늘 날씨

가장 단순한 OpenWeather 무료 API:
```ts
// app/api/weather/route.ts
const res = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${KEY}&units=metric&lang=kr`
);
```

→ 카드에 온도·날씨 아이콘·풍속 표시. 시간 없으면 스킵.

---

## Step 7. AI 브리핑 — 핵심 컴포넌트

```ts
// app/api/briefing/route.ts
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const { expense, todos, weather } = await request.json();

  const prompt = `
사용자 프로필: 30대 직장인, 헬스/골프 취미, 외식 줄이기 목표, 월 100만원 변동비 예산.

오늘의 데이터:
- 이번 달 지출: ₩${expense.total} (Top3: ${expense.top3.map(c => c.name).join(', ')})
- 오늘 일정: ${todos.map(t => `${t.time} ${t.title}`).join(', ')}
- 날씨: ${weather.desc}, ${weather.temp}°C

브리핑을 3줄 이내로 작성:
1. 인사 (사용자 이름 포함)
2. 오늘 가장 중요한 한 가지
3. 짧은 조언 (취미는 건드리지 말 것)
  `;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });

  return Response.json({ briefing: completion.choices[0].message.content });
}
```

→ Q7 Context 패턴 그대로 가져옴. 답변이 일반론 → 맞춤형으로 변신.

---

## Step 8. 대시보드 레이아웃

```tsx
// app/page.tsx (로그인 시)
<DashboardLayout>
  <Header user={user} />
  <Grid cols={2}>
    <Suspense><BriefingWidget /></Suspense>     {/* 상단, 가로 전체 */}
    <Suspense><TodoWidget /></Suspense>          {/* 좌 */}
    <Suspense><ExpenseWidget /></Suspense>       {/* 우 */}
  </Grid>
</DashboardLayout>
```

→ Tailwind grid + Suspense로 위젯별 로딩 분리

---

## Step 9. 스크린샷 (필수 5장)

| # | 화면 | 파일명 |
| --- | --- | --- |
| 1 | 비로그인 시 홈 → 로그인 화면 | `01-login.png` |
| 2 | 로그인 후 대시보드 전체 | `02-dashboard.png` |
| 3 | AI 브리핑 위젯 (확대) | `03-briefing.png` |
| 4 | 지출 위젯 (수치 명확) | `04-expense.png` |
| 5 | 할일 위젯 (Notion 데이터) | `05-todos.png` |

---

## Step 10. Vercel 배포

**환경 변수 (반드시):**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NOTION_INTEGRATION_TOKEN=...
OPENAI_API_KEY=...
NOTION_DATABASE_ID=ffc01eecb97b4278af111a10eff8ccba
```

배포 → URL 발급 → 본인 계정으로 로그인 테스트 → 데이터 보이는지 확인.

---

## Step 11. 단톡방 공유

- 대시보드 전체 스크린샷 + URL
- 한 줄: "5주차 보스 퀘스트 — 가계부+노션+AI 종합 대시보드 만들었어요. 매일 아침 한 화면에서 다 보임 ✨"

---

## 🎯 포인트 목표

| 항목 | 점수 | 어떻게 확보 |
| --- | --- | --- |
| 기본 완료 | 10pt | Step 4·5·8 (위젯 2개 + 배포 URL) |
| 에이전트 활용 | 5pt | Claude와 2회+ 대화 |
| 창의성 | 5pt | AI 브리핑 톤 + Context 반영 |
| 공유 보너스 | 5pt | Step 11 |
| **합계** | **25pt** | 올클리어 |

---

## 🔥 5주차 8 Quest 시리즈 — Q8의 위치

| Quest | 한 마디 |
| --- | --- |
| Q1 (Notion 비서) | "MCP의 손과 발" |
| Q2 (Chrome 리서치) | "AI가 인터넷 직접 접근" |
| Q3 (가계부 앱) | "데이터 쌓는 풀스택" |
| Q4 (분석 에이전트) | "데이터 = 자산" |
| Q5 (커뮤니티) | "Auth로 진짜 사용자" |
| Q6 (쇼핑몰) | "이커머스 핵심" |
| Q7 (Context) | "맞춤형 AI" |
| **Q8 (대시보드)** | **"이 모든 것의 합집합"** |

> 💡 Q8은 **부품을 새로 만들지 않고 조립만** — 그래서 보스. 어렵지만 만들고 나면 부트캠프에서 가장 큰 성취감.

---

## ⚠️ 함정 회피

| 함정 | 회피 |
| --- | --- |
| Notion MCP 그대로 쓰려고 함 | Vercel에선 안 됨 → REST API 사용 |
| 모든 위젯을 한 번에 | MVP 1개부터 → 배포 → 추가 |
| 디자인 완벽 추구 | Tailwind 기본 컴포넌트로 충분 |
| Auth 새로 짜려고 함 | Q5 코드 통째로 복사 |
| AI 브리핑 길게 작성 | 3줄로 제한 (프롬프트에 명시) |

---

## 🚀 추천 진행 순서 (MVP 우선)

**1차 (1.5시간): 최소 동작 — 25pt 기본 확보**
1. Q5 복사 → Auth 동작 (5분)
2. ExpenseWidget 작성 (30분)
3. BriefingWidget (단순 텍스트) (30분)
4. Vercel 배포 (15분)
5. 스크린샷 + 단톡방 공유

**2차 (1시간): 추가 위젯**
6. Notion API 연결 → TodoWidget
7. AI 브리핑 + 데이터 연동

**3차 (선택): 날씨, 디자인 다듬기**

---

## 다음에 할 것 (내일)

➡️ **Step 0 — 5주차 자산 점검**부터 시작.
- Q5 코드 위치 확인 (있으면 복사, 없으면 새로 — Q5 진행 안 했어도 OK)
- Q3 DB connection 확인 (이미 살아있음 ✅)
- Notion Integration Token 발급 (5분, https://www.notion.so/my-integrations)
- OpenAI API key 준비 (또는 Claude API)

준비물 다 모이면 Step 1부터 즉시 진행 가능.
