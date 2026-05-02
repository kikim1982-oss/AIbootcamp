# Q5 커뮤니티앱 — Auth + 게시글 CRUD

Express + PostgreSQL(Supabase) + JWT 기반 커뮤니티 앱 백엔드.

## 폴더 구조

```
Q5커뮤니티앱/
├── server.js              # Express 엔트리포인트
├── init-db.js             # db/schema.sql 적용 + 샘플 데이터
├── api/
│   ├── index.js           # /api 라우터 통합
│   ├── auth/
│   │   ├── register.js    # POST /api/auth/register
│   │   ├── login.js       # POST /api/auth/login
│   │   ├── logout.js      # POST /api/auth/logout
│   │   └── me.js          # GET  /api/auth/me
│   └── posts/
│       ├── list.js        # GET    /api/posts
│       ├── create.js      # POST   /api/posts          (auth)
│       ├── update.js      # PATCH  /api/posts/:id      (auth + owner)
│       ├── delete.js      # DELETE /api/posts/:id      (auth + owner)
│       └── like.js        # POST   /api/posts/:id/like
├── middleware/
│   └── auth.js            # requireAuth, optionalAuth
├── utils/
│   ├── password.js        # bcrypt 해시/검증
│   └── jwt.js             # JWT sign/verify
└── db/
    ├── schema.sql         # users + posts 스키마
    └── index.js           # 공유 pg Pool
```

## 환경 변수 (.env)

```env
DATABASE_URL=postgresql://...        # Supabase connection string
JWT_SECRET=<랜덤 96+ hex>            # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_EXPIRES_IN=7d                    # optional, default 7d
BCRYPT_SALT_ROUNDS=12                # optional, default 12
PORT=5000                            # optional, default 5000
```

## 실행

```bash
npm install
node init-db.js   # users 테이블 생성 + posts에 user_id 컬럼 추가
npm start         # http://localhost:5000
```

## API 스펙

모든 응답: `{ success: boolean, data?: any, message?: string }`

### 인증

#### `POST /api/auth/register`
회원가입. 성공 시 JWT 발급.

```json
// 요청
{ "email": "user@example.com", "password": "password123", "name": "홍길동" }

// 201 응답
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "user@example.com", "name": "홍길동", "created_at": "..." },
    "token": "eyJhbGciOi..."
  }
}
```

| 에러 | 의미 |
| --- | --- |
| 400 | 이메일 형식 / 비밀번호 8자 미만 |
| 409 | 이미 가입된 이메일 |

#### `POST /api/auth/login`
이메일/비밀번호 검증. 성공 시 JWT 발급.

```json
// 요청
{ "email": "user@example.com", "password": "password123" }

// 200 응답: register와 동일한 구조
```

| 에러 | 의미 |
| --- | --- |
| 401 | 이메일 없음 또는 비밀번호 불일치 |

#### `POST /api/auth/logout`
JWT는 stateless라 서버에서 무효화하지 않습니다. 클라이언트에서 토큰을 폐기하라는 안내만 반환합니다.

#### `GET /api/auth/me` 🔒
현재 로그인한 사용자 정보.

```
Authorization: Bearer <token>
```

```json
// 200 응답
{ "success": true, "data": { "id": 1, "email": "...", "name": "...", "created_at": "..." } }
```

### 게시글

#### `GET /api/posts?sort=latest|likes`
모든 게시글 + 작성자 이름. 인증 불필요.

```json
{
  "success": true,
  "data": [
    {
      "id": 1, "category": "잡담", "content": "...", "likes": 5,
      "user_id": 7, "author_name": "홍길동", "author_email": "user@example.com",
      "created_at": "...", "updated_at": "..."
    }
  ]
}
```

#### `POST /api/posts` 🔒
새 글 작성. `user_id`는 토큰에서 자동 주입.

```json
{ "category": "고민", "content": "내용 (1-500자)" }
```

#### `PATCH /api/posts/:id` 🔒 (본인만)
본인이 작성한 글만 수정 가능. `content`, `category` 중 하나 이상 필요.

| 에러 | 의미 |
| --- | --- |
| 403 | 다른 사람 글을 수정 시도 |
| 404 | 게시글 없음 |

#### `DELETE /api/posts/:id` 🔒 (본인만)
본인이 작성한 글만 삭제 가능.

#### `POST /api/posts/:id/like`
좋아요 +1. 인증 불필요 (현재 정책).

## 보안 메모

- 비밀번호: bcrypt salt rounds 기본 12 (`BCRYPT_SALT_ROUNDS`로 조정)
- JWT: HS256, 만료 7일 (`JWT_EXPIRES_IN`으로 조정)
- 모든 SQL 쿼리는 파라미터 바인딩 사용 — SQL injection 방지
- 입력 검증: `express-validator`
- CORS: 모든 출처 허용 (운영 시엔 화이트리스트로 제한 권장)

## 기존 프론트엔드와의 호환성

이전 익명 게시판 `index.html`은 `POST /api/posts`를 `Authorization` 헤더 없이 호출합니다.
이제는 401이 반환되므로 회원가입/로그인 UI를 추가하고 토큰을 보관하도록 클라이언트 코드를 수정해야 합니다.
