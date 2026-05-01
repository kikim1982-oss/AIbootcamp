# 🗺️ Quest 5 진행 계획 — Auth 커뮤니티 앱

> 목표: Supabase Auth + RLS로 로그인 사용자만 글쓰기 + 본인 글만 수정/삭제 가능한 커뮤니티 앱 → Vercel 배포 → 외부인 1명 가입 & 글 작성 인증

---

## ✅ 전체 단계 한눈에 보기

| 단계 | 작업 | 상태 |
| --- | --- | --- |
| Step 0 | 사전 준비 (Supabase Auth · Vercel 계정 · GitHub) | ⬜ |
| Step 1 | 커뮤니티 주제 확정 | ⬜ |
| Step 2 | DB 스키마: `posts` 테이블 + RLS 정책 | ⬜ |
| Step 3 | Supabase Auth 설정 (이메일/비밀번호) | ⬜ |
| Step 4 | 프론트엔드 베이스 (Vite or Next.js) | ⬜ |
| Step 5 | 회원가입 / 로그인 / 로그아웃 UI | ⬜ |
| Step 6 | 게시글 CRUD (목록·작성·수정·삭제) | ⬜ |
| Step 7 | 게시글 상세 화면 + 작성자 표시 | ⬜ |
| Step 8 | 권한 분기 UI (본인 글에만 수정·삭제 버튼) | ⬜ |
| Step 9 | 로컬 동작 확인 + 스크린샷 4장 | ⬜ |
| Step 10 | GitHub 푸시 | ⬜ |
| Step 11 | Vercel 배포 + 환경 변수 설정 | ⬜ |
| Step 12 | 외부인 1명 이상 가입 & 글 작성 (보너스 5pt) | ⬜ |
| Step 13 | 단톡방 공유 (간접 보너스) | ⬜ |

---

## Step 0. 사전 준비

- [ ] **Supabase 계정 확인** (Q3에서 이미 사용 중인 프로젝트 재사용 OK)
- [ ] **Vercel 계정** (GitHub 연동 필요 — `vercel.com` 가입)
- [ ] **GitHub Repository** 권한 (이미 `kikim1982-oss/AIbootcamp` 사용 중)
- [ ] (선택) Vercel CLI 설치 → `npm i -g vercel`

> 💡 **Supabase 프로젝트 분리 vs 재사용**: Q3 가계부와 같은 프로젝트에 `posts` 테이블만 추가해도 OK. 분리하고 싶으면 새 프로젝트 생성.

---

## Step 1. 커뮤니티 주제 확정

**기준:**
- 외부인 1~2명이 실제로 글 쓸 만한 주제 (가족·친구가 부담 없이 참여 가능)
- 본인 관심 분야와 연결되면 더 좋음

**후보:**

| # | 주제 | 외부인 참여 난이도 | 시연 효과 |
| --- | --- | --- | --- |
| A | **AI 부트캠프 자유게시판** | 中 (수강생 한정) | 上 — 발표용 임팩트 |
| B | **오늘 뭐 먹었어요** (사진+한줄) | 下 (누구나 OK) | 上 — 가족·친구 동참 쉬움 |
| C | **반려동물 자랑** | 下 | 中 |
| D | **영화·드라마 한줄 평** | 中 | 上 — Q1 K-Drama 데이터와 연결 |
| E | **운동 인증 게시판** | 中 (Q1 일정과 연동 가능) | 中 |

➡️ **추천: B (오늘 뭐 먹었어요)** — 외부인 참여 장벽이 가장 낮고, 사진 한 장 + 한줄로 끝나서 가족도 5분 안에 글 작성 가능.

---

## Step 2. DB 스키마 + RLS 정책

```sql
-- posts 테이블
CREATE TABLE posts (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT,            -- 표시용 닉네임 (auth.users.email에서 발췌)
  image_url   TEXT,            -- (선택) 사진 첨부
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 정책: SELECT는 누구나 (anon + authenticated)
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT USING (true);

-- 정책: INSERT는 로그인한 사용자만
CREATE POLICY "Authenticated users can insert"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 정책: UPDATE는 본인 글만
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id);

-- 정책: DELETE는 본인 글만
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);
```

> 💡 **RLS의 핵심:** 서버 코드 한 줄 안 짜도 "본인 글만 수정/삭제" 로직이 DB 레벨에서 강제됨. 클라이언트가 다른 사람 글 삭제 시도해도 Supabase가 거부.

---

## Step 3. Supabase Auth 설정

**Dashboard → Authentication → Providers:**
- ✅ **Email** 활성화 (기본 ON)
- ✅ **이메일 인증 비활성화** 권장 (개발 편의 — 외부인 가입 시 메일 인증 안 받아도 됨)
  - Settings → Auth → "Confirm email" OFF
- (선택) Google·GitHub OAuth 추가하면 가입 장벽 더 낮춤

**환경 변수 (Vercel · .env.local):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://mivldxnchiveptioseao.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

---

## Step 4. 프론트엔드 베이스 선택

| 옵션 | 장점 | 단점 |
| --- | --- | --- |
| **Next.js (App Router)** | Vercel과 시너지 최고, SSR | 러닝 커브 |
| **Vite + React** | 가볍고 빠름 | API 라우트 별도 |
| **단일 index.html** (Q3 패턴) | 빌드 없음 | Vercel 배포 시 정적만 |

➡️ **추천: Next.js 14 App Router** — Vercel 배포 1클릭, Supabase Auth 헬퍼 공식 지원

```bash
npx create-next-app@latest week-5/Q5커뮤니티앱 --ts --tailwind --app
cd week-5/Q5커뮤니티앱
npm install @supabase/supabase-js @supabase/ssr
```

---

## Step 5~8. 화면 구현

### 페이지 구조 (App Router)
```
app/
├── layout.tsx          # 공통 레이아웃 (헤더 — 로그인 상태 표시)
├── page.tsx            # 게시글 목록 (홈)
├── login/page.tsx      # 로그인
├── signup/page.tsx     # 회원가입
├── posts/
│   ├── new/page.tsx    # 글쓰기
│   └── [id]/
│       ├── page.tsx    # 상세 보기
│       └── edit/page.tsx  # 수정
└── api/auth/callback/route.ts  # OAuth 콜백 (선택)

lib/supabase/
├── client.ts           # 브라우저용 클라이언트
└── server.ts           # 서버 컴포넌트용
```

### Step 5. 회원가입 / 로그인
- 이메일 + 비밀번호 입력
- `supabase.auth.signUp()` / `signInWithPassword()`
- 성공 시 홈으로 redirect
- 에러 메시지 inline 표시

### Step 6. 게시글 CRUD
- **목록 (홈)**: SELECT 모든 posts, 작성자 표시, 최신순
- **작성**: 로그인 안 했으면 `/login` redirect, 로그인했으면 form
- **수정/삭제**: 본인 글일 때만 버튼 노출 (RLS가 백엔드 차단도 함)

### Step 7. 상세 화면
- `/posts/[id]` — 제목·내용·작성자·작성일
- 본인 글이면 [수정] [삭제] 버튼
- 다른 사람 글이면 [목록으로] 만

### Step 8. 권한 분기 UI
```tsx
{post.author_id === currentUser?.id && (
  <div className="flex gap-2">
    <Link href={`/posts/${post.id}/edit`}>수정</Link>
    <button onClick={handleDelete}>삭제</button>
  </div>
)}
```

---

## Step 9. 동작 확인 + 스크린샷 (필수 4장 + 보너스)

| # | 캡처 화면 | 파일명 |
| --- | --- | --- |
| 1 | 회원가입 폼 + 성공 메시지 | `01-signup.png` |
| 2 | 로그인 후 헤더에 사용자 이메일 노출 | `02-login.png` |
| 3 | 글쓰기 화면 + 작성 완료 | `03-write.png` |
| 4 | 게시글 목록 (3건 이상) | `04-list.png` |
| 5 | 본인 글에만 수정·삭제 버튼 노출 | `05-permission.png` |
| ⭐ 보너스 | **다른 사람**이 가입·글쓰기 (이름 보이게) | `06-other-user.png` |

---

## Step 10. GitHub 푸시

```bash
git add week-5/Q5커뮤니티앱
git commit -m "Add week-5 Q5: 커뮤니티 앱 (Supabase Auth + Next.js)"
git push origin main
```

⚠️ `.env.local`은 절대 커밋 금지 (Next.js는 자동으로 gitignore되긴 함)

---

## Step 11. Vercel 배포

**옵션 A: Vercel Dashboard (GUI)**
1. https://vercel.com/new → GitHub repo `kikim1982-oss/AIbootcamp` 선택
2. Root Directory: `week-5/Q5커뮤니티앱`
3. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy 버튼 → 약 2분 후 URL 발급

**옵션 B: Vercel CLI**
```bash
cd week-5/Q5커뮤니티앱
vercel
# follow prompts, 환경 변수는 dashboard에서
```

배포 완료 시 `https://[project].vercel.app` URL 확보 → **이게 제출용 URL**.

---

## Step 12. 외부인 1명 가입 & 글 작성 (보너스 5pt)

**전략:**
- 가족 1명 추천 (배우자·부모·형제) — 가장 빠르게 인증 가능
- 카톡으로 URL 공유 + "가입하고 한 줄만 써줘" 부탁
- 또는 부트캠프 단톡방에 공유 → 동기 1명이 가입

**캡처할 것:**
- 그분이 작성한 게시글이 목록에 보이는 화면 (작성자 이름 같이 보이게)

---

## Step 13. 단톡방 공유

- 배포 URL + 시연 GIF 또는 스크린샷 1장
- 한 줄 멘트: "가입하고 글 한 번 써주시면 보너스 +5pt 됩니다 🙏"

---

## 🎯 포인트 목표

| 항목 | 점수 | 어떻게 확보 |
| --- | --- | --- |
| 기본 완료 | 10pt | Step 5~9 (CRUD + 배포 URL) |
| 에이전트 활용 | 5pt | Claude와 2회 이상 대화 (Step 5·6 진행 중 자연스럽게) |
| 창의성 | 5pt | Step 1 주제 + UI 개성 (예: 사진 첨부, 좋아요, 댓글) |
| 다른 사람 인증 | 5pt | Step 12 (가족 또는 동기 1명) |
| **합계** | **25pt** | 올클리어 |

---

## 🔥 5개 Quest 시리즈 비교

| Quest | 핵심 기술 | 차별점 |
| --- | --- | --- |
| Q1 (Notion 비서) | MCP — 외부 SaaS | "AI의 손과 발" |
| Q2 (Chrome 리서치) | MCP — 웹 자동화 | "AI가 인터넷 직접 접근" |
| Q3 (가계부 앱) | Server + DB | "데이터 쌓는 도구" |
| Q4 (분석 에이전트) | Agent + 같은 DB | "데이터 = 자산" |
| **Q5 (커뮤니티 앱)** | **Auth + RLS + 배포** | **"진짜 사용자 있는 서비스"** |

> 💡 Q5는 4개 Quest의 **최종 조합** — DB(Q3) + AI 활용(Q4)은 잠깐 옆에 두고, 처음으로 **남에게 보여줄 수 있는 진짜 서비스**를 만들어 배포까지.

---

## ⚡ 빠른 진행 추천 순서

1. **Step 1** 주제 5초 안에 확정 (B 추천)
2. **Step 2~3** Supabase 설정 → SQL Editor에 스키마 1번 실행
3. **Step 4** Next.js 프로젝트 생성 (1분)
4. **Step 5~8** Claude에게 한 화면씩 부탁 → 단계적으로
5. **Step 11** 배포 → 즉시 URL 확보 (1시간 안에 가능)
6. **Step 12** 가족에게 공유 → 보너스 확보
7. **남은 시간**으로 디자인·기능 추가

---

## 다음에 할 것

➡️ **Step 1 — 주제 확정**부터.

추천: **B (오늘 뭐 먹었어요)** — 사진 + 한줄 + 작성자 = 가족 참여 쉬움

다른 주제 선호하시면 말씀해 주세요. 주제 정해지면 Step 2부터 자동 진행:
- Supabase에 `posts` 테이블 + RLS 정책 자동 생성
- Next.js 프로젝트 스캐폴드
- 페이지별 코드 스텝바이스텝

또는 **Q4 마무리(result.md, 단톡방 공유)** 먼저 하시겠어요?
