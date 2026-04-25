---
name: recipe
description: 냉장고 재료 JSON 파일을 읽어 레시피를 생성하고, fal.ai로 음식 이미지를 생성한 뒤, 이미지가 포함된 마크다운 파일로 저장하는 스킬. /recipe 명령어로 실행.
---

# 냉장고 레시피 생성 스킬

## 실행 순서

아래 단계를 순서대로 수행하세요.

### 0단계 — 재료 폴더 경로 확인

스킬 실행 시 인자(ARGUMENTS)로 경로가 주어진 경우 그 경로를 사용하세요.
인자가 없으면 사용자에게 다음과 같이 물어보세요:

> "재료 JSON 파일이 있는 폴더 경로를 알려주세요. (기본값: `week-4/quest/Q1/ingredients/`)"

사용자가 경로를 입력하지 않거나 Enter를 누르면 기본값 `week-4/quest/Q1/ingredients/`를 사용합니다.
확정된 경로를 `[INGREDIENTS_DIR]`로 기억하고 이후 단계에서 사용하세요.

### 1단계 — 재료 파일 읽기

`[INGREDIENTS_DIR]` 폴더 안의 **모든 `.json` 파일**을 읽으세요.
각 파일에서 `name`, `quantity`, `category` 필드를 파악합니다.

**JSON 파일이 하나도 없는 경우**, 아래 10가지 기본 재료를 임의로 생성해 사용하세요:

```json
[
  { "name": "계란", "quantity": "3개", "category": "단백질" },
  { "name": "김치", "quantity": "100g", "category": "발효식품" },
  { "name": "밥", "quantity": "1공기", "category": "탄수화물" },
  { "name": "대파", "quantity": "1/2대", "category": "채소" },
  { "name": "간장", "quantity": "2큰술", "category": "양념" },
  { "name": "참기름", "quantity": "1작은술", "category": "양념" },
  { "name": "마늘", "quantity": "2쪽", "category": "향신채" },
  { "name": "두부", "quantity": "1/2모", "category": "단백질" },
  { "name": "당근", "quantity": "1/4개", "category": "채소" },
  { "name": "소금", "quantity": "약간", "category": "양념" }
]
```

사용자에게 "재료 파일이 없어 기본 재료 10가지로 레시피를 만들게요." 라고 알려주세요.

### 2단계 — 레시피 생성

읽어온 재료들을 바탕으로 **자취생 난이도** 레시피를 1개 생성하세요.
조건:
- 1인분 기준
- 조리 시간 15분 이내
- 재료 목록에 있는 것만 사용 (없는 재료는 최소한으로 추가)
- 단계별 조리 방법 작성
- 레시피 이름은 직관적인 한글로 작성

### 3단계 — 음식 이미지 생성

아래 명령어로 음식 이미지를 생성하세요.
- FAL_KEY는 **환경변수에서 자동으로 읽힙니다** — 코드에 직접 쓰지 마세요.
- 출력 파일명: **레시피 한글 이름과 동일하게** (예: `김치라면볶음밥.png`) — `recipe_img.png` 절대 사용 금지
- 저장 위치: `week-4/quest/Q1/recipe/`
- 프롬프트: 레시피 이름과 주재료를 영어로 변환해 음식 사진 스타일로 작성하세요.

```bash
python -c "
import os, sys
sys.argv = [
    'generate.py',
    '--prompt', '[RECIPE_PROMPT_IN_ENGLISH]',
    '--output', 'C:/Users/kikim/Downloads/AIbootcamp/week-4/quest/Q1/recipe/[레시피한글명].png',
    '--width', '1024',
    '--height', '768'
]
exec(open('C:/Users/kikim/Downloads/AIbootcamp/.claude/skills/fal-image-gen/scripts/generate.py').read())
"
```

프롬프트 예시 형식:
`"Korean [dish name], [main ingredients] stir-fry, appetizing food photography, warm lighting, in a pan"`

### 4단계 — 마크다운 파일로 저장

아래 형식으로 마크다운 파일을 작성하고 `week-4/quest/Q1/recipe/` 폴더에 저장하세요.
파일명: 레시피 한글 이름 그대로 사용 (예: `김치라면볶음밥.md`)
이미지 참조도 레시피 한글 이름과 동일한 파일명 사용 (예: `![김치라면볶음밥](김치라면볶음밥.png)`)

```markdown
# 🍳 [레시피 이름]

![[레시피 이름]]([레시피한글명].png)

> 조리 시간: XX분 | 난이도: 자취생 | 1인분

## 재료 (냉장고에서 확인)

| 재료 | 수량 |
|------|------|
| ...  | ...  |

## 조리 순서

1. ...
2. ...
3. ...

## 팁

- ...

---
*생성일: YYYY-MM-DD HH:MM*
```

저장 완료 후 사용자에게 파일 경로와 이미지 생성 결과를 알려주세요.
