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

## 2026-07-14 기획 기준 전면 재구축

- 사용자 요청: 현재 프로토타입이 기획과 맞지 않아, MD 기획서 전체와 `C:\Users\Soyoon Bang\Documents\tables_chick\json`을 기준으로 처음부터 다시 구성한다.
- 12개 MD 기획서 전체를 읽고 시스템 기준을 재정리했다.
- 새 데이터 원본은 `data/`에 필요한 JSON 9개를 그대로 복사했으며 SHA-256 해시 일치를 확인했다.
- 유니티 `Assets\98_UI` 원본은 수정하지 않고, 프로젝트에 이미 복사된 `Icon/` 리소스만 사용한다.
- `index.html`, `styles.css`, `game.js`를 새 구조로 전면 교체하고 `src/data-loader.js`, `src/game-config.js`를 추가했다.
- 1차 수직 슬라이스 범위:
  - 시작 도토리 100
  - 설치 후보 최대 2개
  - 조명 20 + 첫 테이블 30 + 첫 조리기구 50 설치
  - 홍보 5회, 손님 입장, 수동 주문, 자동 조리, 식사, 테이블 지불 영역의 도토리 수동 회수
  - 손님/메뉴 수치는 복사한 JSON을 런타임에 직접 읽는다.
- 다음 검증: 로컬 서버와 develop-web-game Playwright 클라이언트로 설치 3종 및 영업 전체 루프를 검증한다.
- 기획 확정: 설비 기획서의 `조리 완료 후 아이디어 재화 획득` 규칙은 폐기된 옛 기획이므로 적용하지 않는다. 조리 완료 보상으로 아이디어를 지급하지 않는다.

### 2026-07-14 브라우저 검증 결과

- develop-web-game 클라이언트로 신규 저장 상태에서 설치 전체 순서를 실제 클릭했다.
  - 조명 20 + 테이블 30 + 조리기구 50
  - 결과: `acorns=0`, `installedFacilityIds=[1,5,16]`, 홍보 활성화
- 핵심 루프 전체 검증:
  - 홍보 5회 후 손님 1명 생성
  - 샐러드 주문 수동 접수
  - Recipe.json의 조리 시간 4초로 자동 조리
  - 식사 및 테이블 지불 영역에 30도토리 생성
  - 지불 영역 클릭 후 `acorns=30`, `served=1`, `collected=30`
- 중간 상태 별도 검증:
  - `output/rebuild-actual-assets/state-0.json`: `awaiting_order`, 샐러드 주문 말풍선
  - `output/rebuild-cooking/state-0.json`: `waiting_food`, 조리 2/4초
  - `output/rebuild-core-loop/state-0.json`: 전체 루프 종료 및 수동 회수 완료
- Playwright CLI 전체 페이지 검증:
  - `output/playwright/full-ui-home.png`: 재화 HUD, 목표 카드, 홍보 버튼 배치
  - `output/playwright/install-panel.png`: 설비 설명 및 설치 버튼 배치
  - favicon 경로 추가 후 콘솔 오류 0건
- 기존 `Icon/` 일부가 유니티 원본과 다른 임시 아이콘인 것을 발견했다.
  - 유니티 `Assets/98_UI/Sprite`에서 실제 PNG 107개를 `assets/ui/`로 복사했다.
  - 모든 복사본의 SHA-256이 원본과 일치함을 확인했다.
  - 게임 코드와 HUD는 이제 `assets/ui/`의 실제 원본 복사본만 참조한다.
- 다음 작업 후보:
  - 두 좌석 동시 주문과 주문 대기열 추가 검증
  - 첫 추가 설비(2번 테이블/2번 조리기구/팁박스) 성장 구간 조정
  - 이후 메뉴 연구, 할 일, 테마 순으로 기획 수직 슬라이스 확장

## 2026-07-14 직접 실행 불가 수정

- 사용자 확인: `index.html`을 열었을 때 아무 상호작용도 할 수 없었다.
- 재현 결과: `file://` 환경에서 ES 모듈 `game.js`가 CORS 정책으로 차단되어 게임 초기화가 실행되지 않았다.
- 수정:
  - ES 모듈 import와 런타임 JSON fetch 의존성을 제거했다.
  - `data/*.json` 9개를 그대로 묶는 `data/runtime-tables.js` 생성 구조를 추가했다.
  - 생성 스크립트: `tools/build-runtime-tables.mjs`
  - `index.html`은 일반 스크립트를 순서대로 읽어 서버 없이도 실행된다.
- 직접 열기 검증:
  - 전용 검증 스크립트 `tools/verify-file-open.mjs`로 실제 `file://` 실행
  - 조명/테이블/조리기구 설치 → 홍보 5회 → 주문 → 조리 → 식사 → 30도토리 회수 성공
  - 최종 상태: `acorns=30`, `served=1`, `collected=30`
  - 콘솔 오류 0건
  - 산출물: `output/file-open-verified/`
- 로컬 서버 회귀 검증도 같은 전체 루프로 통과했다.

## 2026-07-14 유니티 스크립트 기준 재구성

- 사용자 지시에 따라 MD 기획서는 구현 기준에서 완전히 제외했다.
- 읽기 전용 기준 소스: `Assets/90_Script`의 `Client/Domain`, `Client/System`, `UserData`, `DataMediator`.
- 구역 확장과 카페는 제외하고 `AreaType.Restaurant` 데이터만 로드한다.
- 유니티에서 확인한 규칙을 웹 상태 구조로 이식했다.
  - 레시피 연구: 연구 시설 3종, 아이디어 비용, 누적 횟수 천장, 가중치 추첨, 중복 스택, 강화, 도감 보상
  - 임무: AchievementAction 기반 메인 그룹/일일 진행, 개별 보상, 일일 완주 보상
  - 도감: 일반 손님/특별 손님/공연팀 등록과 방문 횟수
  - 직원: 고용, 일일 스티커 보충, 부착, 레벨업, Active/Break 주기와 직업별 자동 행동
  - 공연: 무대 설치 조건, 쿨타임, 공연 시간, 가격 버프, 공연팀 도감
  - 테마: 개별 파츠 구매/적용과 식당 가격 능력치
  - 특별 손님: 홍보 룰렛 도둑, 팁박스 절도, 클릭 체포
- 추가 JSON 11개를 원본에서 `data/`로 복사했으며 원본 유니티/테이블 파일은 수정하지 않았다.
- 실제 UI 복사본으로 직원 아이콘 3개와 공연 아이콘 10개를 추가했다.
- 검증:
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - 할 일 보상, 손님 도감, 연구/중복 강화, 직원 고용/레벨업, 공연, 테마 구매/적용을 실제 Chromium 클릭으로 확인했다.
  - 결과 화면과 상태: `output/unity-feature-regression/`

## 2026-07-14 실제 메인 UI 배치 수정

- 사용자 피드백에 따라 임의로 추가했던 `식당`, `운영` 하단 버튼을 제거했다.
- 하단 고정 버튼은 `레시피 / 할 일 / 직원 / 테마` 네 개만 유지한다.
- 도감은 우측 상단 독립 버튼으로 이동했다.
- 식당 화면을 가리던 `지금 할 일` 상단 안내 카드를 완전히 제거했다.
- 공연은 하단 메뉴가 아니라 설치된 무대 시설을 눌러 진입하도록 변경했다.
- `tools/verify-unity-features.mjs`에 버튼 문구, 안내 카드 부재, 도감 버튼 위치 검증을 추가했다.
- 검증 결과:
  - 전체 기능 클릭 테스트 `UNITY_FEATURES_OK`
  - 공식 develop-web-game 클라이언트에서 직원 버튼 클릭 후 `currentScreen=staff` 확인
  - 콘솔 오류 0건
  - 화면: `output/unity-feature-regression/`, `output/official-ui-correction/`

## 2026-07-14 월드 영역 표시 정리

- 실제 배경 위에 임의로 덧그렸던 큰 반투명 주방 사각형과 중앙 통로를 제거했다.
- 점선으로 전체 시설 크기를 표시하던 설치 구역도 제거했다.
- 설치 기능은 작은 `+` 버튼과 도토리 비용 표시로 유지했다.
- `FILE_OPEN_CORE_LOOP_OK`로 설치/영업 회귀 검증을 통과했다.
- 공식 develop-web-game 클라이언트 화면을 확인했으며 콘솔 오류가 없다.
- 결과: `output/file-open-verified/01-initial.png`, `output/official-clean-world/shot-0.png`.

## 2026-07-14 아이디어 재화 아이콘 수정

- 잘못 연결된 `icon_currency_004.png`는 1시간 도토리 교환권임을 원본에서 확인했다.
- 유니티의 실제 아이디어 전구 아이콘 `icon_currency_003.png`로 HUD와 레시피 연구 비용 표시를 교체했다.
- `UNITY_FEATURES_OK` 및 공식 develop-web-game 클라이언트 검증을 통과했다.
- 확인 화면: `output/unity-feature-regression/03-research-upgrade.png`.

## 2026-07-14 하단 시설 클릭 영역 및 화면 비율 수정

- 게임 월드와 하단 메뉴를 같은 영역에 겹쳐 두던 구조를 분리했다.
- 480×900 비율의 월드는 그대로 유지하고, 하단 메뉴 높이를 별도로 포함하도록 전체 게임 프레임을 세로로 확장했다.
- 하단 메뉴는 월드 캔버스 밖의 독립된 도크가 되어 출입구·울타리 등 아래쪽 시설과 클릭 영역을 가리지 않는다.
- 메뉴 화면과 식당 화면 양쪽에서 `레시피 / 할 일 / 직원 / 테마` 네 버튼이 모두 도크 안에 유지되는지 검증을 추가했다.
- 출입구와 울타리 설치 위치를 실제 캔버스 좌표로 클릭해 설치 패널이 열리는 것을 확인했다.
- 검증 결과:
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 렌더링 및 콘솔 오류 확인 완료
  - 화면: `output/unity-feature-regression/06-bottom-facilities-final.png`, `output/official-bottom-layout/shot-0.png`

## 2026-07-14 홍보 버튼 축소 및 테이블 중앙 재배치

- 홍보 버튼을 178×80 수준에서 142×60 수준으로 축소하고 글자·아이콘·게이지도 함께 줄였다.
- 홍보 버튼을 위로 올려 하단 우체통과 출입구 영역을 가리지 않도록 했다.
- 테이블 네 개의 중심 좌표를 기존 `y=555~785`에서 `y=430~670`으로 올려 식당 중앙에 군집하도록 배치했다.
- 중앙을 차지하던 주인공은 우측 상단 여유 공간으로 옮겼다.
- 팁박스도 주인공 및 중앙 테이블과 겹치지 않도록 우측 중단으로 조정했다.
- 테이블이 입구에서 멀어진 만큼 직접 열기 회귀 테스트의 손님 이동 대기 시간을 실제 동선에 맞게 수정했다.
- 검증 결과:
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 화면 및 콘솔 오류 확인 완료
  - 화면: `output/unity-feature-regression/08-centered-tables-final.png`, `output/file-open-verified/04-centered-table-order.png`, `output/official-centered-layout/shot-0.png`

## 2026-07-14 실제 우체통 아이콘 적용

- 임시로 연결돼 있던 `UI_Icon_Flag_Small.png` 깃발 리소스를 제거했다.
- 유니티 원본 `Assets/98_UI/Sprite/Facility/icon_facility_1_mailbox_none.png`를 프로젝트 `assets/ui/facility/`에 복사해 사용한다.
- 원본과 복사본의 SHA-256 `FA96D93EA41098C1CE35138B6FD20D04EC39A70BD022648A9B5B63F166C68094`가 일치한다.
- 유니티 프로젝트 원본은 수정하지 않았다.
- `UNITY_FEATURES_OK` 및 공식 develop-web-game 클라이언트 검증을 통과했다.
- 확인 화면: `output/unity-feature-regression/09-mailbox-icon.png`.

## 2026-07-15 테마→병아리→아이템→레시피→지역 핵심 루프

- 사용자 제안에 따라 레시피 연구 중심 구조를 새 핵심 진행 구조로 교체했다.
- 유니티 스크립트와 JSON을 확인한 결과 `Ingredient` 26종, `ThemeFacility` 26종, `Customer` 47종, `Recipe` 40종은 존재하지만 이 네 테이블을 직접 연결하는 데이터는 아직 없다.
- 기존 ID를 유지한 교체 가능한 수직 슬라이스 연결표를 `src/game-config.js`의 `CORE_PROGRESSION`으로 분리했다.
  - 돌 테마 → 우유 병아리 → 우유 2개 → 수프
  - 캠핑 테마 → 감자 병아리 → 감자 2개 → 웨지감자
  - 이태리 테마 → 토마토 병아리 → 토마토 2개 → 피자
  - 채소 테마 → 당근 병아리 → 당근 2개 → 둥지 당근 라페
- 테마 구매는 파츠 하나가 아니라 해당 테마 팩 전체를 해금·적용하며 새 병아리를 홍보 손님 후보에 추가한다.
- 식사를 완료한 병아리는 종류별 아이템을 항상 1개 지급한다.
- 레시피 화면을 `아이템 제작 / 보유 / 지역 해금`으로 변경했다.
  - 수동 제작 버튼으로 재료를 소비해 레시피를 해금할 수 있다.
  - 자동 제작 ON 상태에서는 재료가 모이는 즉시 제작된다.
  - 해금 레시피 1개 증가마다 전체 음식 수익 +5%를 적용한다.
  - 레시피 2개/3개 보유 시 `다음 지역 1/2`가 열리는 임시 기준을 적용했다.
- 원본 `Ingredient.json`, `AreaExpansion.json`을 프로젝트 `data/`에 복사하고 `runtime-tables.js`에 포함했다. 원본 테이블과 유니티 프로젝트는 수정하지 않았다.
- `render_game_to_text`에 해금 테마·병아리·재료·자동 제작·제작 레시피·지역 상태를 추가했다.
- 검증 결과:
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 실행 및 콘솔 오류 확인 완료
  - 화면: `output/progression-loop/01-theme-unlocks-chick.png`, `output/progression-loop/05-manual-craft-ready-final.png`, `output/progression-loop/07-auto-crafted-regions-viewport.png`
- 다음 확정 필요:
  - 전체 테마↔병아리↔아이템↔레시피 연결표
  - 병아리 아이템 지급 확률/수량과 제작 요구 수량
  - 실제 지역 이름, 해금 레시피 개수, 지역 전환 화면 범위

## 2026-07-15 테마 설비별 구매·적용 및 경제/지역 기준 수정

- 기존 기록의 `테마 팩 전체 구매·적용` 가정은 폐기했다.
- 유니티의 `PopupMainTheme.lua`, `PopupBuyFacility.lua`, `PopupChangeAllFacility.lua`, `FacilityContainer.cs`, `FacilityCtrl.cs`, `ConditionMgr.cs`를 기준으로 구조를 다시 맞췄다.
  - 상단에서 테마를 선택한 뒤 해당 테마의 설비 파츠를 종류별로 구매·적용한다.
  - 파츠 구매 시 해당 설비 종류에만 자동 적용되며, 다른 설비의 테마는 유지된다.
  - 아직 설치하지 않은 설비 종류의 파츠는 잠금 처리한다.
  - `보유 파츠 전체 적용`은 이미 구매한 파츠만 한꺼번에 적용한다.
  - 신규 병아리는 테마 파츠 하나가 아니라 해당 테마의 전체 파츠를 보유했을 때 해금한다.
- 초기 도토리를 200으로 조정했다.
  - 필수 설비 설치 비용은 조명 20 + 테이블 30 + 조리기구 50 = 100이다.
  - 설치 완료 뒤 남은 100으로 캠핑 테마의 첫 설비 파츠를 바로 구매할 수 있다.
- 신규 지역 해금 조건을 레시피 정확히 3개 보유로 단일화했다. 레시피 2개 상태에서는 열리지 않는다.
- 유니티 `Assets/98_UI/Sprite/Facility`의 PNG 295개를 프로젝트 `assets/ui/facility`로 복사했다. 원본과 복사본의 SHA-256을 전수 비교했으며 불일치는 0개이고 유니티 원본은 수정하지 않았다.
- 검증 결과:
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 첫 파츠만 구매: `output/progression-loop/14-first-theme-part.png`
  - 테이블만 캠핑 테마로 변경: `output/progression-loop/12-single-table-theme-world.png`
  - 전체 파츠 보유 후 감자 병아리 해금: `output/progression-loop/15-complete-theme-chick.png`
  - 레시피 3개에서 신규 지역 해금: `output/progression-loop/16-three-recipes-region.png`

## 2026-07-15 임시 UI 리소스를 유니티 원본으로 교체

- 현재 실행 경로의 이모지·임시 UI를 전수 확인하고 유니티 `Assets/98_UI`의 실제 연결 리소스로 교체했다.
- `LayerMain.prefab/.lua`에서 연결 위치를 확인해 다음 전용 리소스를 프로젝트 `assets/ui/common`으로 복사했다.
  - 하단 메뉴: `icon_mainmenu_recipe/todo/staff/theme.png`
  - 도감: `icon_btn_book.png`
  - 홍보: `icon_promotion.png`
  - 지역 해금: `bg_frame_expansion_01.png`, `icon_lock.png`, `icon_check.png`
  - 손님 불만 상태: `icon_feel_angry.png`
- `PopupMainTodo.lua`와 `TempMgr.cs`의 ID 계산 방식을 확인해 `Sprite/Mission`의 메인 임무 30개와 반복 임무 30개 아이콘을 프로젝트 `assets/ui/mission`으로 복사하고 각 카드에 연결했다.
- 복사한 공용 12개 + 임무 60개, 총 72개 파일의 SHA-256을 원본과 전수 비교했으며 불일치는 0개다. 유니티 원본은 수정하지 않았다.
- 현재 실행되는 `index.html`, `game.js`에는 임시 UI 이모지가 남아 있지 않다.
- 검증 결과:
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 실행 완료, 게임 렌더링 오류 없음
  - 확인 화면: `output/unity-feature-regression/01-daily-claimed.png`, `output/unity-feature-regression/06-bottom-facilities.png`, `output/progression-loop/04-auto-crafted-regions.png`

## 2026-07-15 설비/음식 밸런스·기본 병아리·필드 아이템·재제작 레벨업

- 레스토랑 `InstallFacility`의 설치 가격을 런타임에서 모두 50%로 조정했다. 원본 JSON은 수정하지 않았다.
  - 조명 20→10, 첫 테이블 30→15, 첫 조리기구 50→25 등 모든 레스토랑 설비에 동일하게 적용한다.
  - 초기 도토리는 필수 설비 50 + 첫 캠핑 테마 파츠 100을 보장하는 150으로 다시 계산되며, 필수 설비 설치 후 100이 남는다.
- 샐러드 가격을 30→40, 수프 가격을 60→70으로 조정했다.
- 유니티 `TempMgr.GetCustomerIcon`의 `CommonCustomer.id - 1000` 규칙을 적용해 임의의 `customerId % 7` 아이콘 순환을 제거했다.
  - 첫 일반 손님 `Customer.id=3 / assetId=1001`은 실제 기본 병아리 `icon_chick_001.png`를 사용한다.
  - 진행 연결표의 표시명도 실제 첫 네 리소스에 맞춰 기본/알/공룡/도토리 병아리로 정리했다.
  - 유니티 `Sprite/Chick` PNG 47개를 프로젝트로 복사하고 SHA-256 전수 비교 결과 불일치 0개를 확인했다. 유니티 원본은 수정하지 않았다.
- 현재 프로토타입에 없는 메뉴 연구(ActionType 8) 할 일을 메인 임무 목록에서 제거했다. 나머지는 현재 구현된 홍보/손님/팁/공연/테마/설치 행동만 유지한다.
- 병아리가 주는 아이템을 인벤토리에 즉시 넣지 않고 필드에 떨어뜨리도록 변경했다.
  - 우유 등 아이템은 이모지 원형 드롭으로 표시되며 직접 클릭해야 인벤토리에 들어간다.
  - 도토리는 테이블 아래, 아이템은 테이블 위에 배치해 클릭 영역이 겹치지 않는다.
- 자동 제작은 상시 ON/OFF 기능을 폐기하고 `남은 재료로 자동 선택 제작` 버튼을 누를 때 제작 가능한 레시피 하나만 선택해 만드는 방식으로 변경했다.
- 이미 보유한 동일 레시피를 다시 제작하면 재료를 소비하고 즉시 레벨이 1 오른다. 레벨당 실제 판매 가격은 5%씩 누적 상승한다.
  - 수프 Lv.1은 70, Lv.2는 반올림해 74로 검증했다.
- 검증 결과:
  - `node tools/verify-balance-items.mjs` → `BALANCE_ITEMS_OK`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 실행 및 초기 렌더링 확인 완료
  - 화면: `output/balance-items/00-base-chick.png`, `output/balance-items/01-milk-field-drop.png`, `output/balance-items/02-click-auto-crafted-soup.png`, `output/balance-items/03-soup-level-2.png`, `output/balance-items/04-removed-system-missions-filtered.png`

## 2026-07-15 모든 병아리 재료 필드 드랍 및 확률 적용

- 필드 드랍 함수는 우유 전용이 아니라 `CORE_PROGRESSION`의 병아리별 `ingredientId/ingredientEmoji`를 공통 처리한다.
- 현재 연결된 네 종류 모두 필드 드랍과 클릭 수집을 실제 브라우저로 검증했다.
  - 기본 병아리 → 우유
  - 알 병아리 → 감자
  - 공룡 병아리 → 토마토
  - 도토리 병아리 → 당근
- 각 진행 행에 `dropChance`를 분리했으며 현재 공통 기준은 0.5(50%)다. 이후 병아리별 수치만 개별 변경할 수 있다.
- 식사 완료 때마다 드랍 판정을 한 번만 수행하고, 실패하면 필드 아이템을 생성하지 않는다. 성공한 아이템만 기존처럼 필드에서 직접 클릭해 수집한다.
- `render_game_to_text`에 병아리별 드랍 확률과 드랍 시도/실패 지표를 포함했다.
- 검증 결과:
  - `node tools/verify-balance-items.mjs` → `BALANCE_ITEMS_OK` (50% 실패/성공 고정 재현)
  - `node tools/verify-all-ingredient-drops.mjs` → `ALL_INGREDIENT_DROPS_OK`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 실행 및 초기 렌더링 확인 완료
  - 화면: `output/all-ingredient-drops/1-milk.png`, `output/all-ingredient-drops/6-potato.png`, `output/all-ingredient-drops/8-tomato.png`, `output/all-ingredient-drops/25-carrot.png`

## 2026-07-16 레시피 단계별 재료 증가 및 테마 병아리 3단계 해금

- 레시피 제작 요구량을 고정 2개에서 `기본 요구량 + 현재 레벨`로 변경했다.
  - 첫 제작 2개, Lv.1→2 제작 3개, Lv.2→3 제작 4개처럼 레벨마다 1개씩 증가한다.
  - 수동 제작과 `남은 재료로 자동 선택 제작`이 같은 비용 계산을 사용한다.
  - 레시피 카드와 `render_game_to_text.recipes.craftCosts`에서 다음 요구량을 확인할 수 있다.
- 신규 테마는 설비 종류와 관계없이 해당 테마의 전체 파츠 보유 비율로 병아리를 해금한다.
  - 약 30% / 70% / 100%에서 각각 1마리씩, 테마당 총 3마리다.
  - 캠핑 테마 11개 파츠 기준 실제 경계값은 4개 / 8개 / 11개다.
  - 초기 돌 테마는 이전 요청을 유지해 기본 병아리 1마리만 등장한다.
- 유니티에서 복사한 일반 병아리 아이콘 45종을 전체 테마 마일스톤에 순환 배정했다. 같은 테마 안의 3마리는 서로 다른 아이콘을 사용한다.
- 신규 병아리들은 실제 홍보 손님 후보, 필드 재료 드랍, 손님 도감에 모두 연결했다. 기존 4개 재료·레시피 연결을 순환 사용하며 드랍 확률은 50%를 유지한다.
- 테마 화면에 30% / 70% / 100% 병아리 마일스톤과 잠금/해금 상태를 추가했다.
- 검증 결과:
  - `node tools/verify-theme-chick-milestones.mjs` → `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - 해금된 캠핑 병아리 3종이 서로 다른 아이콘과 재료 정보를 가지고 실제 손님으로 모두 방문하는 것까지 확인했다.
  - `node tools/verify-balance-items.mjs` → `BALANCE_ITEMS_OK`
  - `node tools/verify-all-ingredient-drops.mjs` → `ALL_INGREDIENT_DROPS_OK`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트에서 `currentScreen=theme`, 초기 `unlockedCustomers=[3]`, 레시피 초기 제작 비용 2를 확인했고 콘솔 오류는 없다.
  - 화면: `output/theme-chick-milestones/70-percent.png`, `output/theme-chick-milestones/100-percent.png`, `output/official-theme-chicks/shot-0.png`

## 2026-07-16 테마 병아리별 재료·레시피 확장 및 기본 샐러드 강화

- 테마 병아리는 78개 슬롯(26테마 × 3마리)인데 제작 경로가 4개뿐이던 불일치를 수정했다.
- 모든 병아리 슬롯에 독립적인 `병아리 → 재료 → 레시피` 경로를 배정했다.
  - 총 경로 78개, 서로 다른 재료 ID 78개, 서로 다른 레시피 ID 78개다.
  - 유니티 테이블의 실제 재료 26종과 레시피 40종 이름·아이콘·가격·조리 수치를 기반으로 확장한다.
  - 40종 이후 레시피는 기존 음식 기반의 테마 전용 레시피로 생성한다.
  - 같은 테마 안에서는 세 병아리가 서로 다른 재료와 레시피를 담당한다.
- 음식과 재료가 가능한 한 자연스럽게 연결되도록 레시피별 기본 재료표를 추가했다.
  - 예: 캠핑 감자 → 웨지감자, 캠핑 오이 → 캠핑 초밥, 캠핑 마늘 → 캠핑 불고기.
- 레시피 제작 잠금을 테마 전체 완성 기준에서 해당 병아리 해금 기준으로 변경했다.
  - 30% 병아리가 열리면 첫 경로, 70%에서 두 번째, 100%에서 세 번째 경로가 제작 화면에 추가된다.
- 기본 병아리는 기존 우유 드랍을 유지하면서 시작 음식 샐러드에 직접 연결했다.
  - 시작 샐러드는 이미 Lv.1이므로 우유 3개로 Lv.2, 우유 4개로 Lv.3, 이후 5개처럼 강화된다.
  - 샐러드 가격은 40 → 42 → 44로 5%씩 상승한다.
- 테마 마일스톤 카드에 각 병아리의 `재료 → 레시피` 연결을 표시하고, 레시피 제작 화면은 현재 해금된 병아리 경로만 보여준다.
- `render_game_to_text`에 `progression.unlockedChickRoutes`를 추가해 병아리·재료·레시피 연결을 검증할 수 있게 했다.
- 검증 결과:
  - 설정 전수 검사: 경로 78 / 재료 ID 78 / 레시피 ID 78 / 테마별 중복·누락 0.
  - `node tools/verify-theme-chick-milestones.mjs` → `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - `node tools/verify-balance-items.mjs` → `BALANCE_ITEMS_OK` (기본 병아리 우유로 샐러드 Lv.2·Lv.3 강화)
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-all-ingredient-drops.mjs` → `ALL_INGREDIENT_DROPS_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트에서 시작 경로 `기본 병아리 → 우유 → 샐러드`, 샐러드 다음 제작 비용 3, 콘솔 오류 없음 확인.
  - 화면: `output/theme-chick-milestones/00-base-salad-upgrade.png`, `output/theme-chick-milestones/70-percent.png`, `output/balance-items/03-salad-level-3.png`, `output/progression-loop/02-manual-craft-ready.png`

## 2026-07-16 상식 기반 공유 재료 및 1·2·3종 레시피 조합

- 직전 작업의 `Ingredient.json` 기반 재료 순환과 테마 접두사 재료 78종 구조를 폐기했다.
- 음식 상식에 맞춘 웹 프로토타입 전용 재료 38종을 정의했다.
  - 샐러드→양상추, 웨지감자→감자+식용유, 카레→카레가루+감자, 초밥→생선+쌀 등으로 연결한다.
  - 같은 양상추·쌀·달걀·감자 등을 여러 병아리와 여러 레시피가 중복 사용한다.
  - 우유는 샐러드에서 제거하고 수프·오므라이스·수프류 등 어울리는 음식 조합에만 사용한다.
- 78개 레시피 경로의 획득 단계에 따라 요구 재료 종류 수를 나눴다.
  - 초반 12개: 단일 재료 1종.
  - 중반 27개: 기존 재료 + 신규 재료의 2종 조합.
  - 후반 39개: 기존 재료를 포함한 3종 조합.
- 조합에 필요한 보조 재료는 항상 해당 레시피가 열리는 시점 이전에 병아리 드랍으로 획득 가능하도록 전수 검사했다. 선행 재료 누락은 0개다.
- 레시피 레벨업 시 총 요구량이 1개씩 증가하며 조합 재료에 고르게 분배된다.
  - 단일 샐러드 Lv.1→2는 양상추 3개.
  - 신규 2종 조합은 각 1개, 이후 강화부터 한쪽 재료가 추가된다.
  - 신규 3종 조합은 각 1개부터 시작한다.
- 레시피 화면에 보유 재료를 중복 없이 표시하고, 각 카드에 전체 조합과 재료별 보유/필요 수량을 표시한다.
- `render_game_to_text.recipes.craftRequirements`와 `progression.unlockedChickRoutes[].recipeIngredients`에 조합 정보를 추가했다.
- 검증 결과:
  - 설정 전수 검사: 78경로 / 공유 재료 38종 / 단일 12 · 2종 27 · 3종 39 / 선행 재료 누락 0.
  - `node tools/verify-recipe-combinations.mjs` → `RECIPE_COMBINATIONS_OK single=1 middle=2 late=3`
  - `node tools/verify-balance-items.mjs` → `BALANCE_ITEMS_OK`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-theme-chick-milestones.mjs` → `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - `node tools/verify-all-ingredient-drops.mjs` → `ALL_INGREDIENT_DROPS_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트에서 `기본 병아리 → 양상추 → 샐러드`, 요구량 3개, 콘솔 오류 없음 확인.
  - 화면: `output/balance-items/03-salad-level-3.png`, `output/progression-loop/02-manual-craft-ready.png`, `output/recipe-combinations/01-three-ingredient-ready.png`.

## 2026-07-16 돌 테마 100% 보너스 병아리

- 다음 테마 병아리까지의 초반 공백을 줄이기 위해 돌 테마만 예외 규칙을 적용했다.
  - 기본 병아리는 항상 등장한다.
  - 돌 테마 파츠 100% 보유 시 보너스 병아리 1마리가 추가로 등장한다.
  - 돌 테마의 70% 병아리 슬롯은 사용하지 않는다.
- 기존 세 번째 슬롯의 공룡 병아리는 초반 등장에 부적절해 사용하지 않았다.
- 실제 유니티 복사 리소스 `icon_chick_005.png`를 사용하는 사과 병아리를 배정했다.
  - 사과 병아리 → 과일 드랍 → 과일 가족 모임 레시피.
  - 과일 가족 모임은 초반 보너스 경로이므로 과일 단일 재료로 발견한다.
- 돌 테마 화면에는 `기본`과 `100%` 두 마일스톤만 표시한다.
- 초기 돌 테마는 이미 100% 보유 상태이므로 시작 손님 후보는 기본 병아리와 사과 병아리 두 마리다.
- 검증 결과:
  - 사과 병아리 실제 방문, `icon_chick_005.png`, 과일 드랍 ID 30033 확인.
  - 공식 상태: `stoneUnlocked=[3,10013]`, `unlockedCustomers=[3,10013]`, 콘솔 오류 없음.
  - `node tools/verify-theme-chick-milestones.mjs` → `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - `node tools/verify-balance-items.mjs` → `BALANCE_ITEMS_OK`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-all-ingredient-drops.mjs` → `ALL_INGREDIENT_DROPS_OK`
  - `node tools/verify-recipe-combinations.mjs` → `RECIPE_COMBINATIONS_OK single=1 middle=2 late=3`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 화면: `output/theme-chick-milestones/00b-stone-completion-chick.png`, `output/official-stone-bonus/shot-0.png`.

## 2026-07-16 테마 범위 축소 및 돌 테마 완료 조건 수정

- 사용할 레스토랑 테마를 돌(1)부터 우주 점성술(15)까지로 제한했다.
  - `ThemeFacility` 로딩 단계에서 16~26번 테마를 제외했다.
  - 설정의 테마 이름·리소스 슬러그와 병아리 진행 경로도 15번까지만 생성한다(총 45경로).
  - 이전 저장 데이터에 남은 16번 이후 보유/적용/해금 정보는 로드시 제거한다.
- 돌 테마 보너스 병아리의 해금 기준을 돌 파츠 보유율에서 실제 설비 설치 완료로 변경했다.
  - 우체통을 제외하고 돌 테마가 지원하는 실제 레스토랑 설비 18개를 모두 설치해야 100%가 된다.
  - 시작 상태는 0/18이며 기본 병아리만 등장한다.
  - 18/18 완료 후에만 두 번째 병아리가 손님·드랍·레시피 경로에 추가된다.
- 돌 테마 완료 보상을 사과 병아리/과일 가족 모임에서 알껍질 병아리/샌드위치로 교체했다.
  - 실제 복사 리소스 `icon_chick_002.png` 사용.
  - 알껍질 병아리 → 빵 필드 드랍(50%) → 샌드위치 발견.
  - 캠핑 테마에서 중복 사용하던 알 병아리는 `icon_chick_020.png` 카우보이 병아리로 교체했다.
- 나무 테마 파츠 11종의 가격을 모두 기존 데이터 값의 50%로 조정했다.
  - 예: 테이블 2,600→1,300, 조리기구 2,800→1,400, 출입구 3,600→1,800.
- 검증 결과:
  - `node tools/verify-theme-chick-milestones.mjs` → `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - `node tools/verify-recipe-combinations.mjs` → `RECIPE_COMBINATIONS_OK single=1 middle=2 late=3`
  - `node tools/verify-balance-items.mjs` → `BALANCE_ITEMS_OK`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-all-ingredient-drops.mjs` → `ALL_INGREDIENT_DROPS_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트: 시작 `themeChickProgress[1]=0/18`, `unlockedCustomers=[3]`, 테마 키 1~15, 콘솔 오류 없음.
  - 화면: `output/theme-chick-milestones/00b-stone-completion-locked.png`, `00c-stone-completion-unlocked.png`, `00d-wood-half-prices.png`, `output/all-ingredient-drops/1-bread.png`.

## 2026-07-16 전체 스크롤 마우스 드래그 지원

- 동적으로 생성되는 모든 스크롤 영역을 공통 탐색하는 드래그 스크롤 처리를 추가했다.
  - 세로: 레시피·할 일·직원·테마·도감 등 `menu-content` 목록.
  - 가로: 상단 메뉴 탭, 설비 필터, 테마 선택 탭.
- 가로 탭 안에서 세로로 드래그하면 바깥 목록이 세로로 움직이고, 가로로 드래그하면 해당 탭이 가로로 움직이도록 방향을 판정한다.
- 6px 이상 움직였을 때만 드래그로 판정하며, 드래그 직후 발생하는 클릭을 차단해 버튼이 잘못 눌리지 않게 했다. 짧게 누른 정상 버튼 클릭은 그대로 동작한다.
- 터치 기기의 기존 네이티브 스크롤은 유지하고, 마우스 드래그 중에는 잡는 손 모양 커서를 표시한다.
- 검증 결과:
  - `node tools/verify-drag-scroll.mjs` → `DRAG_SCROLL_OK horizontal=0->357 vertical=0->488`
  - 드래그 중 테마가 선택되지 않음, 드래그 후 정상 테마 선택 및 닫기 버튼 클릭 확인.
  - `node tools/verify-theme-chick-milestones.mjs` → `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 상태 출력 및 콘솔 오류 없음 확인.
  - 화면: `output/drag-scroll/dragged-theme-menu.png`, `output/official-drag-scroll/shot-0.png`.

## 2026-07-21 병아리 방문 등급과 공유 재료 선물

- 병아리마다 새 재료를 추가하는 구조를 폐기하고 기존 공유 재료 38종을 주·보조·희귀 선물 슬롯에 배정했다.
- 누적 방문 등급은 첫 방문 1회 / 낯익은 손님 20회 / 단골 80회 / VIP 250회 / 최고의 단골 700회다.
- 등급별 선물은 주 재료 1개 → 주 재료 2개 → 보조 재료 1개 추가 → 주 재료 3개 → 희귀 재료 1개 추가 순서로 성장한다.
- 식사를 마친 병아리는 매번 선물을 보장하며, 여러 재료는 필드의 선물 꾸러미 하나를 눌러 한 번에 수집한다.
- 도감에서 현재 등급, 누적 방문, 다음 등급 요구 횟수와 병아리의 주·보조·희귀 재료를 확인할 수 있다.
- 전수 검증 결과: `GUEST_GRADES_OK routes=45 sharedIngredients=38 thresholds=1/20/80/250/700`.

## 2026-07-23 카페 테마 케이크 재료 해금 프로토타입

- Unity 실제 카페 구현을 다시 확인해 레스토랑과 독립된 카페 구역 화면을 추가했다.
  - `AreaExpansion.Id=2`의 무료 확장 버튼을 누르면 나무가 사라지고 카페 바닥이 열린다.
  - 상단 `레스토랑 / 카페` 버튼으로 공간을 전환한다.
  - 카페 확장·보유 파츠·선택 테마는 저장 후에도 유지된다.
- `InstallFacility areaType=2`의 실제 13개 설치 구성을 반영했다.
  - 카페 테이블 3개, 그네, 카페 카운터, 케이크 진열대, 반납대, 울타리 2개, 출구, 조명 2개, 카페 장식.
- 레스토랑 테마 15종을 복제하던 초기 실험안을 폐기하고 Unity의 카페 전용 `통나무(101) / 모던(102)` 두 테마로 교체했다.
- 카페 파츠는 레스토랑 파츠와 별도 보유하며, 테스트 가격은 파츠당 최소 25도토리다.
- 테마 파츠 보유율 30%에서 시트, 70%에서 크림, 100%에서 시그니처 토핑을 영구 획득한다.
- 실제 13개 설치 슬롯 기준 요구량은 4개 / 10개 / 13개다.
- 기본 스펀지 시트·생크림·딸기 토핑 3종은 시작 재료로 제공한다.
- 통나무 카페와 모던 카페에 시트·크림·토핑을 각각 1종씩 배정했다.
- 케이크 제작 기능은 구현하지 않고, 테마 파츠 구매·마일스톤 해금·보유 재료 확인까지만 구현했다.
- 실제 화면 검증:
  - 잠긴 카페 화면 → 무료 확장 → 카페 테이블 3개와 그네 설치 → `4/13`에서 호두 시트 해금.
  - 통나무 카페 `4/13`과 해금 재료가 테마 화면에 표시되고, 모던 카페 전환 및 새로고침 후 선택 상태가 유지된다.
  - 현재 버전 콘솔 오류 없음.
- 전수 검증 결과: `CAFE_THEME_REWARDS_OK themes=2 installs=13 rewards=6 base=3 thresholds=0.3/0.7/1`.

## 2026-07-23 홍보 테스트 간소화

- 홍보 버튼의 5회 누적 게이지를 제거했다.
- 홍보 버튼을 한 번 누를 때마다 병아리 한 마리를 즉시 방문 대기열에 추가한다.
- 이전 저장 데이터의 남은 홍보 진행도는 다음 홍보 시 0으로 정리한다.

## 2026-07-27 레시피 신규 지역과 카페 확장 연결

- 현재 변경된 카페 프로토타입을 기준으로 레시피 지역 해금과 실제 카페 공간을 연결했다.
- 기존 `신규 지역`을 `카페 지역`으로 명시하고 해금 조건은 레시피 3개를 유지했다.
- 레시피 3개 전:
  - 카페 상단 배지에 현재 진행도(예: `2/3`)가 표시된다.
  - 카페 확장 버튼은 비활성화되고 잠긴 숲 화면에 필요한 레시피 수가 표시된다.
  - 잠긴 상태에서는 카페 설비 설치 후보를 상태 출력에도 노출하지 않는다.
- 레시피 3개 달성:
  - 3번째 레시피 제작 토스트로 `카페 지역 해금`을 알린다.
  - 레시피의 `지역 해금` 탭에 `3/3 · 카페 확장 가능`이 표시된다.
  - 카페 배지는 `확장 가능`으로 바뀌고 Unity `AreaExpansion 2` 기준 무료 확장 버튼이 활성화된다.
- 확장 버튼을 누르면 기존 통나무 카페 화면과 13개 설비 설치 흐름으로 이어지며 저장 후에도 열린 상태가 유지된다.
- 과거 버전에서 이미 카페를 확장한 저장 데이터는 다시 잠그지 않고 그대로 보존한다.
- 검증 결과:
  - `node tools/verify-cafe-region-unlock.mjs` → `CAFE_REGION_UNLOCK_OK recipes=3 region=1`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK` (실제 3번째 레시피 제작으로 확장 권한 활성화 확인)
  - `node tools/verify-cafe-theme-rewards.mjs` → `CAFE_THEME_REWARDS_OK themes=2 installs=13 rewards=6 base=3 thresholds=0.3/0.7/1`
  - `node tools/verify-drag-scroll.mjs` → `DRAG_SCROLL_OK horizontal=0->357 vertical=0->488`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트: 초기 카페 `1/3`, 확장 불가, 설치 후보 0, 콘솔 오류 없음.
  - 화면: `output/cafe-region-unlock/01-two-recipes-locked.png`, `02-three-recipes-ready.png`, `03-recipe-region-open.png`, `04-cafe-opened.png`.

## 2026-07-27 테마 해금형 수제 케이크 제작

- 카페의 케이크 진열대(시설 종류 18)를 누르면 수제 케이크 제작 화면이 열린다.
- 테마 파츠 보유율 30%/70%/100% 보상으로 획득한 시트·크림·토핑과 기본 재료를 실제 제작 선택지로 연결했다.
- 제작 순서는 `시트 맛 선택 → 크림 맛 선택 → 대표 토핑 선택 → 토핑 자유 배치 → 완성`이다.
- 레시피 판정에는 시트·크림·대표 토핑만 사용한다. 토핑 위치·개수·회전은 외형에만 반영되며 최대 12개까지 배치할 수 있다.
- 등록 조합 5종을 추가했다.
  - 기본 딸기 생크림, 통나무 테마 조합, 모던 테마 조합.
  - 서로 다른 테마 재료를 섞는 `호두 모카 케이크`, `메이플 딸기 케이크`.
- 등록되지 않은 조합도 `나만의 커스텀 케이크`로 완성되며 등록 조합보다 가격과 판매 수량이 낮다.
- 첫 제작은 하루 1회 무료, 이후에는 아이디어 5 또는 보석 1을 선택해 제작한다.
- 완성한 케이크는 3~5조각 한정 판매로 진열된다. 레스토랑 손님은 식사를 마칠 때 남은 한정 케이크를 우선 구매하고 음식값에 케이크 가격이 합산된다.
- 제작 결과, 발견한 레시피, 현재 진열 수량과 가격을 제작 화면과 `render_game_to_text`에 함께 표시한다.
- 카페 설치 지점 오버레이가 설치된 설비의 캔버스 클릭을 가로막던 문제를 수정했다.
- 저장 버전을 8로 올리고 이전 버전 저장 데이터에 케이크 제작 상태를 안전하게 보강한다.
- 검증 결과:
  - `node tools/verify-cake-workshop.mjs` → `CAKE_WORKSHOP_OK recipes=5 saleRemaining=4`
  - `node tools/verify-cafe-theme-rewards.mjs` → `CAFE_THEME_REWARDS_OK themes=2 installs=13 rewards=6 base=3 thresholds=0.3/0.7/1`
  - `node tools/verify-cafe-region-unlock.mjs` → `CAFE_REGION_UNLOCK_OK recipes=3 region=1`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-recipe-combinations.mjs` → `RECIPE_COMBINATIONS_OK single=1 middle=2 late=3`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - 공식 develop-web-game 클라이언트 상태·화면 캡처 완료, 신규 콘솔 오류 없음.
  - 화면: `output/cake-workshop/01-workshop-open.png`, `02-cross-theme-decoration.png`, `03-recipe-discovered.png`.
- 다음 검토 후보:
  - 케이크 조합 5종의 이름·가격·한정 수량 최종 밸런스.
  - 실제 기획에서 카페 손님 루프가 확정되면 레스토랑 식후 구매를 카페 손님 구매로 이동.

## 2026-07-27 카페 조기 개방 저장 호환 오류 수정

- 원인: 이전 저장을 불러올 때 `카페 파츠가 하나라도 있음`을 `카페 확장 완료`로 간주해 해금 조건을 우회했다.
- 카페 파츠 보유와 카페 확장 완료를 별도 상태로 분리했다.
- 이전 버전 저장은 파츠와 케이크 재료를 보존하지만 카페 공간은 다시 잠근다.
- 이제 저장 데이터와 무관하게 `레시피 3개 해금 → 카페 확장 버튼 직접 누르기`를 완료해야 카페가 열린다.
- 명시적으로 확장한 뒤에는 새 `expansionConfirmed` 값으로 개방 상태가 정상 유지된다.
- 검증:
  - 이전 버전에서 카페 파츠와 `unlocked=true`가 저장된 상태도 처음 불러오면 잠김.
  - 레시피 2개에서는 확장 불가, 3개에서는 확장 가능, 버튼 클릭 후에만 개방.
  - `CAFE_REGION_UNLOCK_OK recipes=3 region=1`
  - `CAKE_WORKSHOP_OK recipes=5 saleRemaining=4`
  - 공식 클라이언트 상태 `unlocked=false`, `expansionConfirmed=false`, `1/3`; 잠긴 카페 화면 확인.

## 2026-07-27 레스토랑 레시피 3개 전 카페 진입 차단

- 요구사항을 다시 명확히 반영했다: 지역 조건은 `레스토랑 레시피 발견 3개`이며 케이크 조합 발견 수는 포함하지 않는다.
- 레스토랑 레시피가 1~2개인 동안 카페 이동 버튼 자체를 비활성화해 카페 예정지 화면에도 들어갈 수 없게 했다.
- 3번째 레스토랑 레시피를 발견하면 카페 버튼이 `확장 가능`으로 활성화된다.
- 활성화된 카페 버튼을 누르면 확장 예정지와 무료 확장 버튼이 표시되고, 그 버튼을 직접 눌러야 실제 카페가 열린다.
- 상태 출력에 `discoveredRestaurantRecipeCount`를 추가해 카페 조건의 계산 근거를 분명히 했다.
- 검증:
  - 2개: 레스토랑 화면 유지, 카페 버튼 비활성, 배지 `2/3`.
  - 3개: 카페 버튼 활성, 배지 `확장 가능`, 확장 버튼 노출.
  - 케이크 제작 후에도 레스토랑 레시피 발견 수는 변하지 않음.
  - `CAFE_REGION_UNLOCK_OK recipes=3 region=1`
  - `CAKE_WORKSHOP_OK recipes=5 saleRemaining=4`
  - `PROGRESSION_LOOP_OK`
  - 공식 클라이언트 초기 상태: `mode=restaurant`, `discoveredRestaurantRecipeCount=1`, `expansionAvailable=false`.

## 2026-07-27 테마 병아리 정보와 도감 분리

- 테마 화면의 병아리 실물 아이콘, 이름, 선물 재료, 연결 레시피 미리보기를 제거했다.
- 테마 화면에는 30%/70%/100% 구간과 `새로운 병아리 등장` 사실만 표시한다.
- 달성한 구간도 실제 병아리 정보 대신 범용 병아리 표시와 `상세 정보는 도감에서 확인` 안내만 보여준다.
- 돌 테마 전체 설치 안내에서도 병아리 이름과 샌드위치 이름을 제거했다.
- 도감의 손님 카드를 2열 상세형으로 변경했다.
- 테마 등장 조건을 달성한 병아리는 아직 첫 방문 전이어도 도감에서 외형과 이름을 확인할 수 있다.
- 도감에 테마 출처·해금 구간·주/보조/희귀 선물 재료 이름·연결 레시피를 모아 표시한다.
- 아직 등장 조건을 달성하지 않은 병아리는 기존처럼 실루엣과 `???`만 표시한다.
- 검증:
  - `THEME_CODEX_SEPARATION_OK chicks=3`
  - `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - `DRAG_SCROLL_OK horizontal=0->357 vertical=0->506`
  - 테마 화면에 캠핑 병아리 이름·재료·레시피가 노출되지 않음.
  - 도감에 캠핑 병아리 3마리의 외형·이름·재료·레시피가 표시됨.
  - 공식 클라이언트 `currentScreen=theme`, 신규 콘솔 오류 없음.

## 2026-07-27 구역별 레시피·테마 메뉴 분리와 케이크 진입 개선

- 하단 레시피와 테마 메뉴를 현재 공간에 따라 완전히 분리했다.
- 레스토랑 화면:
  - `레시피`는 레스토랑 음식 제작·지역 해금만 표시한다.
  - `테마`는 돌~우주 점성술 레스토랑 테마만 표시한다.
- 카페 화면:
  - 하단 `레시피` 라벨이 `케이크`로 바뀌고 수제 케이크 조합·제작 화면을 연다.
  - 하단 `테마` 라벨이 `카페 테마`로 바뀌고 통나무·모던 카페 테마만 표시한다.
- 기존 레스토랑/카페 테마 전환 스위치는 제거했다. 다른 구역의 테마가 같은 화면에 섞이지 않는다.
- 케이크 진열대가 없을 때 카페의 `케이크` 메뉴에 제작 위치와 설치 방법을 안내한다.
- 안내의 `카페 테마에서 진열대 찾기` 버튼으로 카페 테마 화면에 바로 이동한다.
- 케이크 진열대를 설치하면 카페 필드 오른쪽에 `케이크 만들기` 버튼이 상시 표시된다.
- 진열대 직접 터치, 필드의 제작 버튼, 하단 `케이크` 메뉴가 모두 같은 제작 화면으로 연결된다.
- 설비 없이 저장 데이터를 조작해 제작하는 경로는 차단했다.
- 상태 출력에 `menuContext`, `visibleRecipeType`, `visibleThemeType`을 추가했다.
- 검증:
  - `AREA_CONTEXT_MENUS_OK restaurant=restaurant cafe=cake`
  - `CAKE_WORKSHOP_OK recipes=5 saleRemaining=4`
  - `CAFE_REGION_UNLOCK_OK recipes=3 region=1`
  - `THEME_CODEX_SEPARATION_OK chicks=3`
  - `DRAG_SCROLL_OK horizontal=0->357 vertical=0->506`
  - 공식 클라이언트: `mode=restaurant`, `menuContext=restaurant`, `visibleRecipeType=restaurant`, 신규 콘솔 오류 없음.

## 2026-07-27 방문 횟수별 재료 해금과 30% 단일 드랍

- 손님 병아리가 식사를 마칠 때 재료 드랍을 한 번만 판정하며, 전체 성공 확률을 30%로 변경했다.
- 드랍 성공 시 현재 해금된 재료 후보 중 하나만 골라 필드에 1개 떨어뜨린다. 여러 재료를 한꺼번에 주는 묶음 드랍은 제거했다.
- 기존 손님 등급 기준을 유지해 첫 방문부터 주 재료, 80회부터 보조 재료, 700회부터 희귀 재료가 드랍 후보에 추가된다.
- 20회와 250회 등급은 현재 손님 등급만 상승하며 새 재료 후보를 추가하지 않는다.
- 도감의 선물 재료에 해금 방문 횟수를 함께 표시한다.
- 상태 출력에 전체 확률, 성공 시 수량, 방문별 후보 슬롯을 `ingredientDropRule`로 추가했다.
- 검증:
  - 표본 120회씩: 첫 방문 구간 `31/120`, 80회 구간 `28/120`, 700회 구간 `40/120`.
  - 모든 성공 드랍이 필드 재료 1개이며 각 구간에서 잠기지 않은 재료가 나오지 않음을 확인.
  - `ALL_INGREDIENT_DROPS_OK`
  - `PROGRESSION_LOOP_OK`
  - `THEME_CODEX_SEPARATION_OK chicks=3`
  - `BALANCE_ITEMS_OK`
  - 공식 클라이언트 상태: `overallChance=0.3`, `itemCountOnSuccess=1`, 신규 콘솔 오류 없음.

## 2026-07-27 손님 재료 드랍 4회 성장과 수량 증가

- 최초 상태 뒤 네 번 성장하는 기존 손님 등급 `1 → 20 → 80 → 250 → 700회`를 재료 드랍에 다시 연결했다.
- 식사 완료 시 30% 확률 판정과 성공 시 재료 한 종류만 선택하는 규칙은 유지했다.
- 선택된 한 종류의 실제 드랍 수량을 등급별로 증가시켰다.
  - 1회: 주 재료 ×1
  - 20회: 주 재료 ×2
  - 80회: 주 재료 ×2 또는 보조 재료 ×1
  - 250회: 주 재료 ×3 또는 보조 재료 ×1
  - 700회: 주 재료 ×3 또는 보조 재료 ×1 또는 희귀 재료 ×1
- 필드 아이콘의 수량 배지와 획득 토스트에 `×2`, `×3`을 표시한다.
- 도감에는 주·보조·희귀 재료별 방문 횟수와 수량 변화가 표시된다.
- 상태 출력은 `ingredientTypesOnSuccess: 1`과 전체 등급별 수량표를 제공한다.
- 검증:
  - 등급별 120회 표본: `31/120`, `35/120`, `28/120`, `39/120`, `40/120`.
  - 모든 당첨 건이 재료 한 종류이며 각 등급의 정확한 수량만 드랍됨.
  - `INGREDIENT_DROP_30_PERCENT_QUANTITY_OK`
  - `BALANCE_ITEMS_OK`
  - `PROGRESSION_LOOP_OK`
  - `THEME_CODEX_SEPARATION_OK chicks=3`
  - `ALL_INGREDIENT_DROPS_OK`
  - 공식 클라이언트 상태와 도감 화면 확인, 신규 콘솔 오류 없음.

## 2026-07-27 주·보조 재료 최대 수량 조정

- 주 재료는 20회부터 최대 ×2이며 이후 단계에서도 ×2를 유지하도록 조정했다.
- 보조 재료는 80회부터 ×1, 마지막 700회 단계에서 ×2가 되도록 조정했다.
- 최종 수량표는 250회 `주×2/보조×1`, 700회 `주×2/보조×2/희귀×1`이다.
- 30% 당첨 확률과 당첨 시 재료 한 종류만 드랍하는 규칙은 그대로 유지했다.
- 검증:
  - `GUEST_GRADES_OK routes=45 sharedIngredients=38 dropChance=0.3 thresholds=1/20/80/250/700`
  - `INGREDIENT_DROP_30_PERCENT_QUANTITY_OK`
  - `THEME_CODEX_SEPARATION_OK chicks=3`
  - 필드에서 보조 재료 `×2` 배지 확인.
  - 공식 클라이언트 상태에서 700회 `primaryCount=2`, `secondaryCount=2`, `rareCount=1` 확인, 신규 콘솔 오류 없음.

## 2026-07-27 손님 재료 드랍 네 단계로 축소

- 중복되던 20회 단계를 제거하고 방문 조건을 `1 → 80 → 250 → 700회` 네 단계로 축소했다.
- 최종 조건:
  - 1회: 주 재료 ×1
  - 80회: 주 재료 ×2
  - 250회: 주 재료 ×2 또는 보조 재료 ×1
  - 700회: 주 재료 ×2 또는 보조 재료 ×2 또는 희귀 재료 ×1
- 도감의 수량 안내도 `주 1회×1→80회×2`, `보조 250회×1→700회×2`, `희귀 700회×1`로 정리했다.
- 30% 당첨 확률과 당첨 시 한 종류만 드랍하는 규칙은 유지했다.
- 검증:
  - `GUEST_GRADES_OK routes=45 sharedIngredients=38 dropChance=0.3 thresholds=1/80/250/700`
  - `INGREDIENT_DROP_30_PERCENT_QUANTITY_OK`
  - `BALANCE_ITEMS_OK`
  - `THEME_CODEX_SEPARATION_OK chicks=3`
  - 공식 클라이언트 상태에 네 단계만 출력되며 신규 콘솔 오류 없음.
