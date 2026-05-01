# 🗺️ Quest 6 진행 계획 — Auth + DB 쇼핑몰 (결제 제외)

> 목표: 상품 목록(공개) + 회원가입/로그인 + 사용자별 장바구니(CRUD + 수량/합계) → Vercel 배포

---

## ✅ 전체 단계 한눈에 보기

| 단계 | 작업 | 상태 |
| --- | --- | --- |
| Step 0 | 사전 준비 (Supabase · Vercel · Q5 패턴 확인) | ⬜ |
| Step 1 | 쇼핑몰 주제 확정 | ⬜ |
| Step 2 | DB 스키마: `products` + `cart` + RLS | ⬜ |
| Step 3 | 샘플 상품 10건 시드 (Unsplash 이미지) | ⬜ |
| Step 4 | 프론트엔드 베이스 (Next.js) | ⬜ |
| Step 5 | 상품 목록 화면 (공개) | ⬜ |
| Step 6 | 회원가입 / 로그인 / 로그아웃 | ⬜ |
| Step 7 | "장바구니 담기" 버튼 + 장바구니 페이지 | ⬜ |
| Step 8 | 수량 변경 (+/−) + 삭제 + 합계 계산 | ⬜ |
| Step 9 | "주문하기" 버튼 (준비 중 alert) | ⬜ |
| Step 10 | 동작 확인 + 스크린샷 4장+ | ⬜ |
| Step 11 | GitHub 푸시 | ⬜ |
| Step 12 | Vercel 배포 + 환경 변수 | ⬜ |
| Step 13 | 단톡방 공유 (보너스 5pt) | ⬜ |

---

## Step 0. 사전 준비

- [ ] Supabase 프로젝트 (Q3·Q5에서 사용 중인 거 재사용 OK)
- [ ] Vercel 계정 (Q5에서 이미 연결되어 있으면 그대로)
- [ ] Q5 코드를 베이스로 활용 가능 — Auth 파트 그대로 재사용

> 💡 **Q5에서 만든 Auth 인프라를 그대로 가져다 쓸 수 있음** — 폴더만 새로 만들고 `auth/` 관련 코드 복사. Auth 다시 안 짜도 됨.

---

## Step 1. 쇼핑몰 주제 확정

| # | 주제 | 상품 데이터 만들기 | 시연 효과 |
| --- | --- | --- | --- |
| A | **디저트/베이커리** | 케이크·쿠키·마카롱 (사진 풍부) | 上 — 비주얼 임팩트 |
| B | **반려동물 굿즈** | 사료·간식·장난감 | 中 |
| C | **식물 가게** | 다육이·관엽·허브 | 中 |
| D | **문구/굿즈 샵** | 노트·펜·스티커 | 下 — 가격대 다양 |
| E | **빈티지 디지털 카메라** | 후지·캐논 등 | 中 — 주제 특이 |
| F | **K-Drama 굿즈 샵** (Q1·Q4 연계) | 포스터·OST·머그 | 上 — 시리즈 일관성 |

➡️ **추천: A (디저트/베이커리)** — Unsplash 이미지가 압도적으로 예쁘고, 상품 단가도 다양해서 수량 변경·합계 계산 시연 효과 좋음.

---

## Step 2. DB 스키마 + RLS

```sql
-- products 테이블 (공개)
CREATE TABLE products (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  image_url   TEXT,
  description TEXT,
  category    TEXT,                -- 케이크 / 쿠키 / 마카롱 등
  stock       INTEGER DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- cart 테이블 (사용자별)
CREATE TABLE cart (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)     -- 같은 상품은 한 row, 수량만 증감
);

-- RLS 활성화
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart     ENABLE ROW LEVEL SECURITY;

-- products: 누구나 SELECT
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT USING (true);

-- cart: 본인 것만 SELECT/INSERT/UPDATE/DELETE
CREATE POLICY "Users see only their cart"
  ON cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own cart"
  ON cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own cart"
  ON cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own cart"
  ON cart FOR DELETE USING (auth.uid() = user_id);
```

> 💡 **RLS 핵심:** `cart` 테이블은 `auth.uid() = user_id` 조건으로 다른 사람 장바구니 절대 못 봄/수정. 클라이언트 코드 단에서 필터링 안 해도 안전.

---

## Step 3. 샘플 상품 시드 (디저트 가정)

```sql
INSERT INTO products (name, price, image_url, description, category) VALUES
  ('초코 가나슈 케이크', 38000, 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600', '진한 다크 초콜릿과 가나슈로 만든 1호 사이즈', '케이크'),
  ('티라미수 컵', 8500, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', '에스프레소에 적신 레이디핑거 + 마스카르포네', '케이크'),
  ('레인보우 마카롱 6구', 22000, 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=600', '오늘의 6가지 색 마카롱 박스', '마카롱'),
  ('블루베리 치즈 타르트', 9800, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600', '국내산 블루베리 + 크림치즈 충전', '타르트'),
  ('초코칩 쿠키 (5p)', 12000, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600', '겉바속촉 수제 쿠키, 다크초코칩 듬뿍', '쿠키'),
  ('카라멜 마들렌 (8p)', 14500, 'https://images.unsplash.com/photo-1568827999250-3f6afff96e66?w=600', '버터 풍미 가득, 짭조름 카라멜 글레이즈', '구움과자'),
  ('얼그레이 휘낭시에 (6p)', 13500, 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=600', '얼그레이 향이 은은한 프랑스식 케이크', '구움과자'),
  ('레몬 쉬폰 케이크', 28000, 'https://images.unsplash.com/photo-1519869325930-281384150729?w=600', '폭신폭신 + 상큼 레몬 글레이즈', '케이크'),
  ('말차 라떼 푸딩', 7500, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600', '우지 말차 사용, 진한 풍미', '디저트'),
  ('수제 한라봉 콘피', 16000, 'https://images.unsplash.com/photo-1582934411401-0eb35e74e373?w=600', '제주 한라봉을 통째로 졸인 디저트 잼', '디저트');
```

> 에이전트에게 "Unsplash 디저트 사진 URL로 샘플 10건 채워줘" 하면 1분 안에 자동 생성.

---

## Step 4. 프론트엔드 베이스

**Q5에서 만든 Next.js 프로젝트 통째로 복사하거나 새로 만들기:**
```bash
npx create-next-app@latest week-5/Q6쇼핑몰 --ts --tailwind --app
cd week-5/Q6쇼핑몰
npm install @supabase/supabase-js @supabase/ssr
```

폴더 구조:
```
app/
├── layout.tsx          # 헤더 (로고, 로그인 상태, 장바구니 아이콘+카운트)
├── page.tsx            # 상품 목록 (홈)
├── login/page.tsx
├── signup/page.tsx
├── cart/page.tsx       # 내 장바구니
└── api/cart/route.ts   # (선택) 서버 액션 대체

components/
├── ProductCard.tsx
├── CartItem.tsx
└── CartButton.tsx      # "담기" 버튼 (로그인 안 하면 /login 리다이렉트)

lib/supabase/
├── client.ts
└── server.ts
```

---

## Step 5. 상품 목록 (Step별 구체)

- 그리드 레이아웃 (모바일 1열, 태블릿 2열, 데스크톱 3~4열)
- 카드: 이미지 → 이름 → 가격 → 카테고리 배지 → [장바구니 담기] 버튼
- 카테고리 필터 (선택)

```tsx
// 의사 코드
const { data: products } = await supabase.from('products').select('*');
return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {products.map(p => <ProductCard key={p.id} product={p} />)}
  </div>
);
```

---

## Step 6. 회원가입/로그인 (Q5 코드 재사용)

Q5에서 만든 `app/login`, `app/signup` 그대로 복붙. 작동 확인만 OK.

---

## Step 7. "장바구니 담기" + 장바구니 페이지

**담기 로직 (UNIQUE 제약 활용):**
```ts
// 같은 product_id가 있으면 quantity +1, 없으면 새로 INSERT
const { data, error } = await supabase
  .from('cart')
  .upsert({ user_id, product_id, quantity: 1 }, { onConflict: 'user_id,product_id' })
  .select();
// upsert 대신 INSERT … ON CONFLICT DO UPDATE quantity = cart.quantity + 1 도 가능
```

**장바구니 페이지 (`/cart`)**
- products와 JOIN해서 이름·이미지·가격 표시
- 각 row에 +/− 버튼, 삭제 버튼
- 하단 "총 합계: ₩XXX,XXX" + [주문하기]

---

## Step 8. 수량 변경 / 삭제 / 합계

| 액션 | API |
| --- | --- |
| +1 | `UPDATE cart SET quantity = quantity + 1 WHERE id = ?` |
| −1 | quantity = 1 이면 DELETE, 아니면 −1 |
| 삭제 | DELETE WHERE id = ? |
| 합계 | 클라이언트에서 `cart.reduce((s,c) => s + c.quantity * c.price, 0)` |

`UNIQUE (user_id, product_id)` 덕에 같은 상품이 중복 row로 안 들어감.

---

## Step 9. "주문하기" 버튼 (결제 미구현)

```tsx
<button onClick={() => alert('🛒 주문 기능은 준비 중입니다!\n현재는 장바구니 데모 버전입니다.')}>
  주문하기
</button>
```

→ 결제 빼고 점선 placeholder 처리.

---

## Step 10. 스크린샷 (필수)

| # | 캡처 화면 | 파일명 |
| --- | --- | --- |
| 1 | 상품 목록 (8건+) | `01-products.png` |
| 2 | 상품 1개 "장바구니 담기" 클릭 후 알림 | `02-add-cart.png` |
| 3 | 내 장바구니 (3종 이상, 수량 다름) | `03-cart-list.png` |
| 4 | 수량 +/− 변경 후 합계 변동 | `04-cart-quantity.png` |
| 5 | "주문하기" 클릭 시 준비 중 알림 | `05-checkout.png` |
| ⭐ | 비로그인 상태에서 "담기" 클릭 시 로그인 redirect | `06-auth-flow.png` |

---

## Step 11. GitHub 푸시

```bash
git add week-5/Q6쇼핑몰
git commit -m "Add week-5 Q6: 쇼핑몰 (Auth + Cart, no payment)"
git push origin main
```

---

## Step 12. Vercel 배포

- Dashboard → New Project → `kikim1982-oss/AIbootcamp` 선택
- Root Directory: `week-5/Q6쇼핑몰`
- Env Vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Deploy → URL 발급

---

## Step 13. 단톡방 공유 (5pt)

- 스크린샷 1~2장 + URL 공유
- "샘플 디저트 쇼핑몰 만들어봤어요. 회원가입하면 장바구니 동작 확인 가능합니다 🎂"

---

## 🎯 포인트 목표

| 항목 | 점수 | 어떻게 확보 |
| --- | --- | --- |
| 기본 완료 | 10pt | Step 5~9 (CRUD + 합계 + 배포) |
| 에이전트 활용 | 5pt | Claude와 2회 이상 대화 (자연스럽게 충족) |
| 창의성 | 5pt | Step 1 주제 + 상품 데이터 정성스럽게 |
| 공유 보너스 | 5pt | Step 13 |
| **합계** | **25pt** | 올클리어 |

---

## 🔥 6개 Quest 시리즈 비교

| Quest | 핵심 기술 | 출력 형태 |
| --- | --- | --- |
| Q1 (Notion 비서) | MCP — 외부 SaaS | 명령 실행 |
| Q2 (Chrome 리서치) | MCP — 웹 자동화 | md 보고서 |
| Q3 (가계부 앱) | Server + DB | 풀스택 단일 앱 |
| Q4 (분석 에이전트) | Agent + 같은 DB | SQL 분석 답변 |
| Q5 (커뮤니티) | **Auth + RLS + 배포** | 진짜 사용자 |
| **Q6 (쇼핑몰)** | **Auth + Multi-table + Cart 흐름** | **이커머스 풀 코스** |

> 💡 Q5(글) → Q6(상품·장바구니)로 진화 — **다중 테이블 관계(JOIN) + 권한 분리**가 추가됨

---

## ⚠️ Q5와 Q6의 결정적 차이

| 항목 | Q5 (커뮤니티) | Q6 (쇼핑몰) |
| --- | --- | --- |
| 테이블 수 | 1개 (posts) | **2개 (products + cart)** |
| 공개 데이터 | 모든 글 | **상품만** (장바구니는 본인) |
| 데이터 관계 | 단일 | **JOIN** (cart ↔ products) |
| UNIQUE 제약 | 없음 | **(user_id, product_id)** |
| 합계 계산 | 없음 | **있음** (수량 × 가격) |

→ Q5보다 한 단계 복잡, Q3 가계부와 비슷한 구조 (transactions ↔ categories JOIN 패턴 재현).

---

## ⚡ Q5 코드 재활용 전략

Q5와 동시에 진행하면 **Auth 코드 1번만 작성**하고 양쪽에서 사용 가능:
1. Q5 Next.js 프로젝트를 `Q6쇼핑몰`로 복사
2. `posts` 관련 코드만 삭제
3. `products` + `cart` 추가
4. 새 Vercel 프로젝트로 배포

→ **Q5+Q6 합치면 4시간 안에 가능**, 따로 짜면 6시간

---

## 다음에 할 것

➡️ **Step 1 — 주제 확정**부터.

추천: **A (디저트/베이커리)** — Unsplash 이미지 풍부, 가격대 다양 (8K~38K), 시연 효과 최고

다른 주제 가도 됩니다 (특히 **F. K-Drama 굿즈** 가 시리즈 일관성 측면에서 매력적).

또는:
- **B.** Q5와 Q6 동시 진행 (Auth 공유) — 효율 최고
- **C.** Q5 먼저 끝내고 Q6 들어가기 — 안전한 순서
- **D.** Q4 마무리부터 (result.md + 단톡방)

어떻게 갈까요?
