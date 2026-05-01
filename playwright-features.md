# Playwright 기능 가이드

## Playwright란?
Microsoft가 만든 **오픈소스 브라우저 자동화 라이브러리**.
웹 테스트, 스크래핑, UI 자동화에 사용되며 Chromium, Firefox, WebKit을 지원한다.

---

## 핵심 기능

### 1. 브라우저 제어
| 기능 | 설명 |
|------|------|
| `browser_navigate` | URL로 페이지 이동 |
| `browser_navigate_back` | 이전 페이지로 이동 |
| `browser_resize` | 브라우저 창 크기 조절 |
| `browser_close` | 브라우저 탭 닫기 |
| `browser_tabs` | 열린 탭 목록 확인 |

---

### 2. 페이지 탐색 & 스냅샷
| 기능 | 설명 |
|------|------|
| `browser_snapshot` | 페이지 접근성 트리 캡처 (요소 참조용) |
| `browser_take_screenshot` | 화면 스크린샷 저장 (PNG/JPEG) |
| `browser_wait_for` | 특정 요소 또는 조건이 나타날 때까지 대기 |

---

### 3. 사용자 상호작용
| 기능 | 설명 |
|------|------|
| `browser_click` | 요소 클릭 |
| `browser_hover` | 요소에 마우스 올리기 |
| `browser_type` | 텍스트 입력 (키보드 타이핑) |
| `browser_fill_form` | 폼 자동 채우기 |
| `browser_select_option` | 드롭다운 옵션 선택 |
| `browser_press_key` | 키보드 키 입력 (Enter, Tab 등) |
| `browser_drag` | 드래그 앤 드롭 |

---

### 4. 네트워크 & 콘솔 모니터링
| 기능 | 설명 |
|------|------|
| `browser_network_requests` | 발생한 네트워크 요청 목록 확인 |
| `browser_console_messages` | 브라우저 콘솔 로그 확인 |

---

### 5. 파일 & 다이얼로그 처리
| 기능 | 설명 |
|------|------|
| `browser_file_upload` | 파일 업로드 |
| `browser_handle_dialog` | alert, confirm, prompt 다이얼로그 처리 |

---

### 6. 코드 실행
| 기능 | 설명 |
|------|------|
| `browser_evaluate` | 브라우저에서 JavaScript 직접 실행 |
| `browser_run_code` | Playwright 코드 블록 실행 |

---

## 주요 활용 사례

```
- E2E 테스트 자동화       : 로그인, 결제, 폼 제출 흐름 검증
- 웹 스크래핑             : 상품 정보, 가격, 데이터 수집
- UI 회귀 테스트          : 스크린샷 비교로 UI 변화 감지
- 반복 업무 자동화         : 매일 반복되는 웹 작업 자동 처리
- 접근성 검사             : 스냅샷으로 웹 접근성 구조 분석
```

---

## 지원 브라우저

| 브라우저 | 엔진 |
|---------|------|
| Chrome / Edge | Chromium |
| Firefox | Gecko |
| Safari | WebKit |

---

## 오늘 실습 예시

```js
// 쿠팡에서 닭가슴살 검색
await page.goto('https://www.coupang.com/np/search?q=닭가슴살');
await page.screenshot({ path: 'coupang-chicken.png' });
```

---

> 참고: Playwright는 봇 방어 시스템(Akamai, Cloudflare 등)에 의해
> 차단될 수 있으므로 이용약관을 반드시 확인하고 사용할 것.
