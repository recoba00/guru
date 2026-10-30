# 플레이비 라이트 — 퍼블리싱 (HTML · CSS · JS)

Figma `ㄴ 플레이비 라이트 UI/UX` (node 16034:12657) 중 **플랫폼 진입점을 제외한** 화면과 상태별 케이스입니다.
게임 플레이 직전(브릿지 → 게임하기)까지의 흐름을 다룹니다.

## 바로 보기

- `index.html` — 모든 화면·상태를 한 페이지에서 확인 (각 화면은 실제로 동작)
- `home.html` — 플레이비 메인
- `bridge.html` — 게임 진입 브릿지
- `attendance-complete.html` — 출석체크 완료 (홈 `출석하고 NP 받기` 성공 후 이동, `?day=1~7`)
- `terms.html`, `privacy.html` — 이용약관, 개인정보 처리방침

## 상태 재현 (`?state=`)

| 화면 | state | Figma |
|---|---|---|
| home | (없음) | 플레이비 메인 (카드 UI 게임설명 등록함) |
| home | `no-desc` | 플레이비 메인 (카드 UI 게임설명 등록 안함) |
| home | `attended` | 홈 · 출석 완료 (당일) |
| home | `loading` | 홈 · 게임 목록 로딩 (스켈레톤 UI) |
| home | `error` | 홈 · 게임 목록 조회 실패 (다시 시도 → 성공) |
| home | `empty` | 홈 · 게임 목록 없음 |
| home | `toast-ad` | 홈 · 토스트 (광고 로드 실패) |
| home | `toast-link` | 홈 · 토스트 (푸터 링크 열기 실패) |
| home | `ad` | 출석 CTA 탭 → 전면광고 노출 (미리보기) |
| bridge | (없음) | 게임 진입 브릿지 |
| bridge | `loading` | 브릿지 · 로딩 |
| bridge | `error` | 브릿지 · 게임 정보 조회 실패 (새로고침 → 성공) |
| bridge | `mission-error` | 브릿지 · 미션 조회 실패 (새로고침 → 성공) |
| bridge | `toast-launch` | 브릿지 · 토스트 (게임 실행 실패) |

`&hold=1` 을 붙이면 토스트가 사라지지 않습니다 (리뷰용).

## 동작

- 출석 CTA(AD) → **전면광고**(5초 후 닫기 가능, `js/ads.js` 목업 — 실제는 광고 SDK) → 닫으면 보상 지급 → **출석체크 완료 화면** → `확인`/닫기 → 홈(오늘 일차 `완료`, 버튼 `내일 또 출석해요!` 비활성) / 실패 시 토스트
- 게임 카드 `게임하기` → 브릿지 / 브릿지 `뒤로` → 홈 / `게임하기` → 실행(목업), 실패 시 토스트
- 푸터 링크 → 약관 화면, 실패 시 토스트 / 약관 `홈으로 돌아가기` → 홈
- **반응형**: 모바일 ~ 태블릿 세로(최대 1024px)까지 화면을 꽉 채움, PC(1025px~)는 1024px 가운데 정렬
  - 600px~: 좌우 여백 24px(768px~ 32px), 배너 480×264, 출석 일차 카드 폭에 맞춰 균등 배치(스크롤·마스크 없음), 게임 카드 2열(카드 최소 320px)
  - 브릿지·약관 본문과 하단 버튼은 최대 720px 가운데, 헤더 뒤로가기·제목도 본문 왼쪽 선에 맞춤(`Header({ contentWidth: true })`)
  - 출석체크 완료: 문구·스탬프·확인 버튼 최대 560px
  - `index.html` 상단에서 모바일 / 태블릿 세로 미리보기 전환
- 상단 배너: 모바일 328×180 고정, 화면 폭과 관계없이 가운데 정렬 / 좌우 이전·다음 배너는 잘려서 보임, 한 번에 한 장씩, **무한 루프**, **3초마다 자동 넘김**(손으로 넘기는 중·페이지 스크롤 중·배너가 화면 밖일 때는 멈춤)
- 토스트 위치: 상단 88px (Figma 기준)
- 스크롤 위치: 새로고침(당겨서 새로고침 포함)·일반 진입은 항상 맨 위, 뒤로 가기는 이전 위치 복원 (`core.restoreScroll()`)
- 헤더: 스크롤해도 상단 고정, 스크롤이 맨 위가 아니면 글래스모피즘(반투명 + 블러) — `html.is-scrolled` 클래스로 제어 (`js/core.js`)

## 구조

```
css/tokens.css       Figma 변수 → CSS 변수 (색·폰트·간격·라운드)
css/base.css         리셋, 앱 셸(모바일 기준 → 태블릿 세로 1024px까지, 그 이상은 가운데 정렬)
css/components.css   Figma 컴포넌트 단위 스타일
css/pages.css        화면별 레이아웃
js/core.js           유틸, Toast
js/ads.js            전면광고 목업 (실제 연동 시 광고 SDK 호출로 교체)
js/carousel.js       상단 배너 무한 스와이프 (터치·마우스 드래그·키보드, 328px 고정 + 좌우 미리보기)
js/shader/*.js       출석체크 완료 배경 셰이더 (Figma Mesh gradient, WebGPU)
js/components.js     컴포넌트 렌더 함수 (props → HTML)
js/mock-api.js       목업 데이터 + 가짜 API (실제 연동 시 이 파일만 교체)
js/pages/*.js        화면별 상태 관리 + 이벤트
```

## React · TypeScript 이식 가이드

| 지금 | React |
|---|---|
| `PB.ui.Header(props)` 등 `components.js` 함수 | 같은 이름의 컴포넌트 (props 그대로) |
| `components.css` 블록 (`.game-card`, `.attend-day` …) | 컴포넌트별 CSS Module / styled |
| `tokens.css` | 전역 CSS 변수 또는 theme 객체 |
| `pages/*.js` 의 `state` 객체 + `render()` | `useState` / `useReducer` |
| `mock-api.js` | API 클라이언트 (react-query 등) — 반환 형태 유지 |
| `data-action` 이벤트 위임 | 각 버튼 `onClick` |

상태 값: 출석 일차 `default | today | done`, 게임 목록 `loading | success | error`(+ 빈 배열 = 없음), 미션 `loading | success | error`.

## 참고

- 태블릿 시안은 Figma 에 없어 모바일 시안 기준으로 확장했습니다 (브레이크포인트 600 / 768 / 1024, `css/tokens.css`).
- 게임 배너·썸네일은 API 로 내려오는 이미지라 `assets/images/mock-*` 는 목업입니다 (배너 1504×741, 썸네일 192×192 · `object-fit: cover`).
- 로고(`logo-playb-lite.webp`)는 원본에서 3배수로 추출했습니다.
- 모든 텍스트는 Figma 브랜드 폰트(Pretendard) 기준입니다. (AD 배지: Text-xs-SB)
- 상단 상태바(9:41 등)는 OS 영역이라 퍼블리싱하지 않고 safe-area 여백으로 처리했습니다.
- 출석체크 완료 배경은 Figma 셰이더(Mesh gradient)를 WebGPU 로 그립니다. WebGPU 를 지원하지 않는 브라우저(일부 웹뷰 등)에서는 배경색(#f3f4f6)만 보입니다. React 이식 시에는 Figma 가 제공하는 원본 `ShaderFill` 컴포넌트를 그대로 쓰면 됩니다.
- 출석 스탬프 애니메이션은 Figma 모션(1.6초 타임라인)을 따르되, 화면 진입 시 1회만 재생합니다 (Figma 프로토타입은 반복 재생).
