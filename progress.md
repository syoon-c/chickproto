Original prompt: 핵심 플레이 연구 파일에 있는 게임을 리소스만 남기고 리셋하는데 다른 콘텐츠는 다 빼고 홍보를 눌러서 병아리 손님 오고 음식 주고 가는 기본 시스템만 남겨놔 (만족하는 것도 빼버려)

- 복사본을 핵심 루프 전용 미니 프로토타입으로 재구성했다.
- 남긴 파일은 `index.html`, `styles.css`, `game.js`, `README.md`, `assets`, `Icon`이다.
- 삭제한 항목은 `js`, `TableJson`, `tools`, `node_modules`, 산출물 폴더와 각종 브리지/문서 파일이다.
- 현재 루프는 `홍보 -> 손님 도착 -> 음식 주기 -> 손님 퇴장`만 지원한다.
- `window.render_game_to_text`와 `window.advanceTime(ms)`를 추가해 자동 테스트 훅을 제공한다.
- Playwright로 `reset -> promotion -> serve`를 한 세션에서 검증했고, 결과는 아래와 같다.
- `output/e2e-check/after-promo.json`: `phase=guestWaiting`, `guestVisible=true`
- `output/e2e-check/after-serve.json`: `phase=idle`, `servedCount=1`, `latestLog=손님이 음식을 받고 바로 떠났습니다.`
- 임시 테스트 환경은 `C:\\Users\\Soyoon Bang\\Desktop\\temp-playwright-check`에 만들었고, 프로젝트 본체에는 다시 불필요한 테스트 의존성을 넣지 않았다.

## 2026-04-03 작업 메모

- 대상 프로젝트를 `C:\Users\Soyoon Bang\Desktop\ChickProto`로 재확인했다. `Documents\projectchick\prototype\chick-restaurant-proto`는 상태 전이 참고용으로만 사용했다.
- 핵심 루프를 `홍보 -> 손님 등장 -> 주문 받기 -> 요리 하기 -> 음식 주기 -> 식사 -> 퇴장`으로 확장했다.
- `game.js`에서 단일 `guestWaiting/serving` 구조를 없애고 `guestArriving`, `awaitingOrder`, `orderTaken`, `cooking`, `cooked`, `eating`, `leaving` 상태를 추가했다.
- `index.html`에 주문/화구 상태 카드와 `주문받기`, `요리하기` 버튼을 추가했다.
- `styles.css`에 상태 카드와 보조 버튼 스타일을 추가했다.
- 다음 단계: 로컬 서버로 실제 클릭 테스트를 돌리고, `window.advanceTime(ms)` 훅에서도 동일하게 상태가 이어지는지 다시 확인해야 한다.

## 2026-04-03 검증 메모

- `python -m http.server 4173`로 로컬 서버를 띄워 브라우저 검증을 진행했다.
- `C:\Users\Soyoon Bang\.codex`에 `playwright`를 설치해 `develop-web-game` 클라이언트를 실제로 실행했다.
- `output\web-game-promo-rerun\state-0.json` 확인 결과:
  - `phase=promoting`
  - `promoCount=1`
  - `flowLabel=손님 등장 준비`
- 커스텀 Playwright 시나리오로 `홍보 -> 주문 -> 요리 -> 서빙 -> 식사 -> 퇴장`을 끝까지 검증했다.
- 주요 산출물:
  - `output\e2e-core-loop-rerun\01-awaiting-order.json`: `phase=awaitingOrder`, `guestVisible=true`, `orderStatus=햄버거 요청`
  - `output\e2e-core-loop-rerun\03-cooked.json`: `phase=cooked`, `foodVisible=true`, `stoveStatus=완성`
  - `output\e2e-core-loop-rerun\06-idle.json`: `phase=idle`, `servedCount=1`, `guestVisible=false`
- 진행 바가 idle 복귀 직후 남아 보이던 시각 문제를 수정했고, 재검증 스크린샷에서 정상 초기화된 것을 확인했다.

## 2026-04-03 레이아웃 재수정

- 대표님 피드백 반영: "핵심 루프만 맞추는 것"이 아니라, `Documents\projectchick\prototype\chick-restaurant-proto`의 식당 화면처럼 보이도록 다시 맞추는 작업 진행.
- 레퍼런스 전체 화면을 `output\reference-screen.png`로 캡처해 톤과 배치를 확인했다.
- `index.html`, `styles.css`를 카드형 미니앱 구조에서 원본 프로토와 비슷한 HUD 오버레이 구조로 전면 교체했다.
  - 상단 3개 자원 pill
  - 우상단 리셋 버튼
  - 좌상단 말풍선
  - 우측 세로 보조 버튼
  - 좌하단 상태 카드
  - 우하단 대형 홍보 버튼
  - 하단 5칸 네비
- 핵심 루프 검증은 그대로 유지한 채 외형만 레퍼런스에 가깝게 조정했다.
- 재검증 산출물:
  - `output\reference-like-home.png`
  - `output\e2e-reference-like\01-awaiting-order.json`
  - `output\e2e-reference-like\03-cooked.png`
  - `output\e2e-reference-like\05-idle.json`

## 2026-04-03 원본 코어 직접 이식

- 대표님 의도 재정의: "원본처럼 보이게" 수준이 아니라 `Documents\projectchick\prototype\chick-restaurant-proto`의 식당 코어 플레이 자체를 바탕화면 빌드로 가져오고, 비핵심 UI만 감추는 쪽으로 전환.
- 원본의 `index.html`, `styles.css`, `game.js`, `js/`, `tablejson-data.js`, `sns-library.js`, `guest-personas.js`, `guest-icon-library.js`, `recipe-icon-library.js`를 데스크톱 프로젝트로 복사했다.
- 데스크톱 빌드 전용 조정:
  - `body.core-loop-mode` 추가
  - 상단 자원/HUD/메뉴/패널/모달 대부분 CSS로 숨김
  - `홍보`와 `리셋`만 남김
  - `getPromotionThreshold()`를 1로 바꿔 홍보 1회 즉시 손님 등장
  - 초기 로그 문구 제거
  - 저장 키를 `chick-restaurant-core-loop-desktop-v2`로 분리해 테스트 세이브가 남지 않게 처리
- 검증 산출물:
  - `output\core-copy-check\00-home.png`
  - `output\core-loop-source-style\01-awaiting-order.png`
  - `output\core-loop-source-style-2\03-after-loop.png`
- 현재 확인된 상태:
  - 시작 화면에서 설명 UI 없이 리셋/홍보만 보임
  - 홍보 1회로 손님 등장 및 테이블 착석, 주문 말풍선까지는 원본 코어 연출로 정상 진행
  - Playwright에서 주문 말풍선 클릭 좌표 검증은 아직 불안정함. 수동 클릭 확인이 한 번 더 필요함

## 2026-04-03 홍보/정산 체감 복구

- 대표님 추가 피드백 반영: `홍보 게이지 채우기`와 `손님이 먹고 돈 놓고 가는 체감`이 빠져 있던 점 수정 진행.
- `save-state.js`에서 데스크톱 코어 빌드용으로 깎아둔 `promoBase=1`, `promoFloor=1` 값을 원본 기준인 `TABLE_PROMOTION_TOUCH_COUNT`, `2`로 복구했다.
- `gameplay-system.js`에서 `getPromotionThreshold()`를 원본 계산식으로 되돌렸다.
- 식사 완료 정산 시 테이블 근처에 `🌰 +수익` 토스트가 뜨도록 추가했다.
- `styles.css`에서 숨겨뒀던 상단 HUD 중 도토리 pill만 다시 보이게 조정해서 실제 재화 증가도 즉시 확인 가능하게 했다.
- 검증:
  - Playwright 브라우저 평가 기준 `threshold=5`, `promotionProgress=0 -> 5회 홍보 후 손님 착석` 확인
  - 같은 검증에서 주문/조리/식사 루프 종료 후 `acorns: 200 -> 260`, `served: 1`, `toastText: 🌰 +60` 확인
  - HUD 스크린샷 `output\\hud-check\\core-loop-hud-check.png`에서 도토리 pill / 리셋 / 홍보 버튼만 남은 최소 HUD 확인

## 2026-04-03 코어 전용 정리

- 대표님 요청 반영: 숨김 처리하던 비핵심 UI를 실제로 걷어내고, 식당 코어 루프 전용 빌드로 재정리했다.
- `index.html`을 캔버스, 도토리 HUD, 리셋, 홍보 버튼만 남는 최소 구조로 교체했다.
- `styles.css`를 최소 HUD 전용 스타일만 남기도록 전면 교체했다.
- `js/game-ui.js`는 코어 HUD 갱신용 최소 구현만 남기고, 패널/모달/SNS/도감/면접 렌더링 로직을 제거했다.
- `game.js`에서는 비핵심 버튼/패널/모달 이벤트 바인딩을 전부 제거하고 `홍보`, `리셋`, 캔버스 상호작용만 남겼다.
- `gameplay-system.js`에서 특별 손님 스폰을 끊고, 손님 후기(SNS 태그 포스트) 생성을 완전히 막아 코어 루프 밖 보상이 더 이상 생기지 않게 했다.
- 실제 삭제:
  - `sns-library.js`
  - `guest-icon-library.js`
  - `assets\\sns-library`
  - `assets\\guest-icons`
  - `output` 테스트 산출물 전체
- 최종 검증:
  - 페이지 에러 없이 부팅
  - `promotionThreshold: 5`
  - 루프 종료 후 `acorns: 260`, `served: 1`, `toast: 🌰 +60`
