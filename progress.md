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

## 2026-07-28 식사 7초·연결 구역 이동·카페 손님 이용

- 레스토랑과 카페 병아리의 실제 취식 시간을 3.2초에서 7초로 늘렸다.
- 상단 레스토랑/카페 탭을 제거하고 현재 구역명과 2개 구역 위치 점으로 교체했다.
- 레스토랑 오른쪽과 카페 왼쪽에 구역 이동 화살표를 추가했다.
- 필드를 왼쪽으로 드래그하면 카페, 카페에서 오른쪽으로 드래그하면 레스토랑으로 이동한다.
- 드래그 중에는 현재 구역과 다음 구역을 한 캔버스에 나란히 그려 실제로 이어진 공간처럼 보이게 했다.
- 레시피 3개 전에는 카페 화살표가 `🔒 n/3`으로 잠기며 기존 카페 해금 조건은 유지된다.
- 카페에 카페 테이블과 카운터를 설치하면 자동 영업이 시작된다.
- 카페 병아리 흐름:
  - 출구 쪽에서 입장
  - 카운터에서 음료/케이크 주문
  - 빈 카페 테이블에 착석
  - 7초 동안 이용
  - 퇴식구를 거쳐 출구로 퇴장
  - 테이블에 카페 매출을 남기며 직접 눌러 회수
- 케이크가 진열 중이면 카페 손님이 우선 구매하고 한정 판매 수량과 매출에 반영된다.
- 상태 출력에 `worldNavigation`, `mealDurationSeconds`, `cafeGuests`, `cafePayments`, 카페 영업 준비/다음 방문 정보를 추가했다.
- 검증:
  - `AREA_SWIPE_AND_MEAL_TIME_OK duration=7 arrows=ok swipe=restaurant<->cafe`
  - `CAFE_GUESTS_OK autoVisit=1 cakeSale=1 payment=collected`
  - `CAKE_WORKSHOP_OK recipes=5 saleRemaining=4`
  - `CAFE_REGION_UNLOCK_OK recipes=3 region=1`
  - `AREA_CONTEXT_MENUS_OK restaurant=restaurant cafe=cake`
  - `PROGRESSION_LOOP_OK`
  - `FILE_OPEN_CORE_LOOP_OK`
  - `INGREDIENT_DROP_30_PERCENT_QUANTITY_OK`
  - 드래그 중 연결 화면, 카페 입장, 케이크 이용, 퇴식·매출 회수 화면을 직접 확인.
  - 공식 클라이언트 상태 `mealDurationSeconds=7`, 이동 방식 `edge-arrow/horizontal-drag`, 신규 콘솔 오류 없음.

## 2026-07-28 화살표 전용 구역 이동·레스토랑 손님의 카페 연계

- 카페 배경을 레스토랑과 같은 필드 배경으로 통일했다.
- 캔버스 가로 드래그 구역 이동을 제거하고 좌우 가장자리의 작은 화살표로만 이동하도록 변경했다.
- 홍보, 카페 확장, 케이크 버튼과 카페 설치 지점을 축소하고 긴 보조 설명을 제거했다.
- 카페 화면의 상태 카드는 테마 이름만 표시하며, 케이크 버튼은 설비와 겹치지 않는 상단 여백으로 이동했다.
- 카페의 10초 간격 독립 손님 생성을 제거했다.
- 카페 테이블과 카운터가 준비된 경우, 레스토랑 식사를 마친 손님에게 80% 확률로 카페 계속 이용 여부를 결정한다.
- 선택된 손님은 레스토랑 출구까지 이동한 후 동일한 손님 ID·외형 정보로 카페에 입장한다. 빈자리가 없으면 카페 대기열에서 기다린다.
- 레스토랑에서는 한정 케이크를 구매하지 않으며, 케이크 판매와 카페 매출은 실제 카페 이용 중에만 발생한다.
- 상태 출력의 구역 이동 방식은 `edge-arrow`만 제공하고, 카페 계속 이용 확률 `0.8`과 대기 인원을 추가했다.
- 검증:
  - `AREA_ARROW_AND_MEAL_TIME_OK duration=7 arrows=ok drag=disabled`
  - `CAFE_GUESTS_OK restaurantContinuation=80% cakeSale=1 independentVisitors=0`
  - `CAKE_WORKSHOP_OK recipes=5 saleRemaining=5`
  - `CAFE_REGION_UNLOCK_OK recipes=3 region=1`
  - `AREA_CONTEXT_MENUS_OK restaurant=restaurant cafe=cake`
  - `PROGRESSION_LOOP_OK`
  - `DRAG_SCROLL_OK horizontal=0->357 vertical=0->506`
  - `FILE_OPEN_CORE_LOOP_OK`
  - 레스토랑/카페 화면 캡처에서 동일 배경, 한 줄 기능 제목, 화살표·버튼·설비 비겹침을 확인했다.

## 2026-07-28 카페 설치·매출 회수 규칙 통일

- 카페 전용 HTML 설치 버튼을 제거하고 레스토랑과 같은 캔버스 설치 지점 연출을 사용하도록 변경했다.
- 두 구역 모두 맥동하는 `+`와 도토리 가격을 누른 뒤 동일한 설치 패널에서 확인한다.
- 카페 설비도 설치 완료 후 실제 설비가 나타나며 `설비명 설치 완료!` 토스트를 사용한다.
- 카페 매출을 손님마다 별도 도토리로 생성하지 않고 레스토랑처럼 좌석별로 합산한다.
- 같은 좌석에서 매출이 반복되면 도토리 모델 수와 총액이 한 더미에 누적되며 한 번의 클릭으로 모두 회수한다.
- 레스토랑과 카페가 동일한 도토리 더미 렌더링 함수를 공유하도록 정리했다.
- 검증:
  - `CAFE_REGION_UNLOCK_OK recipes=3 region=1 installFlow=shared`
  - `CAFE_GUESTS_OK restaurantContinuation=80% revenuePile=2 payment=singleCollect independentVisitors=0`
  - `AREA_CONTEXT_MENUS_OK restaurant=restaurant cafe=cake`
  - `PROGRESSION_LOOP_OK`
  - 공식 게임 클라이언트 상태 출력 정상, 콘솔 오류 없음.
  - 카페 설치 패널, 설치 완료 화면, 도토리 2개·250 합산 더미를 직접 확인했다.

## 2026-07-28 테마 병아리 미리보기·구매 진척도 UI

- 레스토랑 테마 화면에서 아직 등장하지 않은 병아리도 이름을 미리 확인할 수 있게 변경했다.
- 병아리의 선물 재료와 연결 레시피는 테마 화면에 노출하지 않고 도감에만 유지했다.
- 테마 파츠 구매 진척도를 한눈에 볼 수 있는 게이지를 추가했다.
  - 일반 테마: 병아리 등장 구간 `30% / 70% / 100%`
  - 돌 테마: `기본 / 100%`
  - 카페 테마: 케이크 재료 해금 구간 `30% 시트 / 70% 크림 / 100% 토핑`
- 잠긴 보상 카드도 이름을 읽을 수 있도록 대비를 높였다.
- 레시피 제작 규칙, 지역 해금 안내, 도감 사용법, 공연 기록 안내, 케이크 제작 기획 설명처럼 카드 내용과 중복되는 장문을 제거했다.
- 브라우저 제목의 `기획 검증 프로토타입` 표기도 제거했다.
- 검증:
  - `THEME_CODEX_SEPARATION_OK chicks=3`
  - 구매 전 이름 3개, 잠금 상태, `30% / 70% / 100%` 표시 확인
  - 구매 완료 후 등장 상태와 게이지 100% 표시 확인
  - `PROGRESSION_LOOP_OK`
  - `CAFE_THEME_REWARDS_OK themes=2 installs=13 rewards=6 base=3 thresholds=0.3/0.7/1`
  - `AREA_CONTEXT_MENUS_OK restaurant=restaurant cafe=cake`
  - `CAKE_WORKSHOP_OK recipes=5 saleRemaining=5`
  - 공식 게임 클라이언트 상태 출력 정상, 콘솔 오류 없음.

## 2026-07-28 임시 테마 가격 곡선 (a 단위 해석 정정)

- 유니티 원본 테이블은 수정하지 않고 프로토타입의 `src/game-config.js`와 로더에서 임시 가격표를 적용했다.
- 레스토랑 테마 파츠 가격:
  - 돌 테마: 무료
  - 나무 테마: 기존 반값 `1,300~2,250` 유지
  - 100으로 임시 입력돼 있던 3번 이후 테마는 같은 설비의 나무 가격을 기준으로 테마마다 10배
  - 3번 테마 `13,000~22,500`, 4번 `130,000~225,000`, 이후 같은 비율로 증가
  - 구매형이 아닌 전체 수집 보상 파츠는 0a 유지
- 카페 테마 파츠 가격:
  - 통나무 카페: 파츠당 `10a = 10,000`
  - 모던 카페: 파츠당 `30a = 30,000`
- 초기 도토리는 기존 플레이 흐름과 동일하게 150을 유지했다.
- `render_game_to_text`에 테마별 최소·최대 가격 범위와 카페별 `partPrice`를 추가했다.
- 검증:
  - `THEME_CHICK_MILESTONES_OK total=11 thresholds=4/8/11`
  - `CAFE_THEME_REWARDS_OK themes=2 installs=13 rewards=6 base=3 thresholds=0.3/0.7/1`
  - `PROGRESSION_LOOP_OK`
  - `CAFE_REGION_UNLOCK_OK recipes=3 region=1 installFlow=shared`
  - `AREA_CONTEXT_MENUS_OK restaurant=restaurant cafe=cake`
  - 기본 카페 설치 패널의 10a 표시·차감 확인
  - 모던 카페 구매 버튼의 30a 표시·차감 확인
  - 공식 게임 클라이언트 상태에서 초기 도토리 150a와 전체 가격 곡선 확인, 콘솔 오류 없음.

## 2026-07-29 카페 제거·병아리 재료 드랍 확률 8%

- 프로토타입을 레스토랑 전용으로 정리했다.
  - 카페 이동 화살표, 지역 확장, 카페 설비·테마, 카페 손님·매출, 수제 케이크 제작 UI와 실행 로직을 제거했다.
  - 카페·케이크 설정 데이터와 관련 전용 자동화 테스트를 제거했다.
  - 구버전 저장 데이터의 카페·케이크 필드는 불러올 때 폐기하고 다음 저장부터 다시 기록되지 않는다.
- Unity에서 복사한 `data/runtime-tables.js` 원본 스냅샷은 수정하지 않았다.
  - 프로토타입 데이터 로더가 모든 테이블에서 `areaType=2` 행을 걸러 `areaType=1` 레스토랑 데이터만 실행 상태에 전달한다.
- 모든 병아리의 공통 재료 드랍 확률을 `30%`에서 `8%`로 변경했다.
  - 성공 시 재료 한 종류만 필드에 생성되는 규칙과 방문 등급별 드랍 수량은 그대로 유지했다.
- 검증:
  - `RESTAURANT_ONLY_OK areaType=1 legacyCafeState=scrubbed`
  - `GUEST_GRADES_OK routes=45 sharedIngredients=38 dropChance=0.08 thresholds=1/80/250/700`
  - 600회 시드 표본: 첫 방문 `54/600`, 단골 `49/600`, VIP `52/600`, 최고의 단골 `63/600`
  - `BALANCE_ITEMS_OK`, `PROGRESSION_LOOP_OK`, `ALL_INGREDIENT_DROPS_OK`, `UNITY_FEATURES_OK`
  - 레시피 조합, 테마 병아리, 도감 분리, 드래그 스크롤, 1회 홍보 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 상태에서 `overallChance=0.08`, 레스토랑 전용 화면과 콘솔 오류 없음 확인
- 참고:
  - 과거 카페 기능을 검증하며 생성한 `output` 이미지와 복사된 미사용 카페 아이콘은 실행 데이터가 아니므로 보존했다.
## 2026-08-03 하단 메뉴 재구성·재료 보관함

- 사용자 요청에 따라 할 일·직원 시스템을 현재 프로토타입에서 비활성화했다.
  - 하단 진입 버튼을 제거하고 외부 호출도 차단했다.
  - 기존 저장 데이터와 구현 코드는 삭제하지 않고 `SYSTEM_ENABLED` 플래그 뒤에 보존했다. 복구 요청 시 진행 손실 없이 같은 기능을 다시 연결할 수 있다.
  - 직원의 자동 주문·조리·홍보 효과와 할 일 진행 집계도 비활성 상태에서는 작동하지 않는다.
- 하단 메뉴를 `테마 / 레시피 / 손님` 3개로 재구성했다.
  - 기존 우측 상단 도감 버튼은 제거하고 손님 도감 진입을 하단 `손님` 버튼으로 옮겼다.
  - `홍보하기`는 캔버스와 분리된 하단 조작부의 맨 오른쪽으로 이동했다.
- 레시피 화면을 `제작 / 레시피 / 재료 보관함` 카테고리로 분리했다.
  - 재료 보관함은 현재 획득 가능한 재료 종류, 개별 수량, 총수량을 표시한다.
  - 설치된 냉장고를 누르면 레시피 화면의 `재료 보관함` 탭이 바로 열린다.
  - 냉장고 설비 설명도 실제 터치 기능에 맞게 수정했다.
- 검증:
  - `node tools/verify-bottom-controls-and-inventory.mjs` → `BOTTOM_CONTROLS_INVENTORY_OK`
  - `node tools/verify-file-open.mjs` → `FILE_OPEN_CORE_LOOP_OK`
  - `node tools/verify-progression-loop.mjs` → `PROGRESSION_LOOP_OK`
  - `node tools/verify-drag-scroll.mjs` → `DRAG_SCROLL_OK`
  - `node tools/verify-restaurant-only.mjs` → `RESTAURANT_ONLY_OK`
  - `node tools/verify-unity-features.mjs` → `UNITY_FEATURES_OK`
  - 공식 develop-web-game 클라이언트 실행 및 화면·텍스트 상태 확인 완료.
  - 전체 화면: `output/bottom-controls-inventory/01-bottom-controls.png`
  - 냉장고 보관함: `output/bottom-controls-inventory/02-fridge-inventory.png`

## 2026-08-03 수동 레시피 조합·테마별 재료 재배치

- `C:\Users\Soyoon Bang\Desktop\테마-병아리.xlsx`의 두 번째 시트 `병아리-재료-레시피 (기획 중)`를 읽어 테마별 병아리와 재료 구성을 재정리했다.
  - 원본 엑셀과 Unity 프로젝트 파일은 수정하지 않았다.
  - 15개 테마에 서로 다른 손님 병아리 3마리씩, 총 45마리를 배치했다.
  - 돌 테마는 서로 겹치지 않는 `ABC / DEF / GHI` 재료군으로 시작한다.
  - 이후 테마는 이전 주·부·특별 재료를 교차 재사용하면서 테마당 신규 재료를 정확히 3개만 추가한다.
  - 나무 테마의 첫 교차 구조는 요청한 `BCH / JEK / CIL` 관계로 검증했다.
- 레시피 제작을 재료 선택형 조합 실험으로 변경했다.
  - 한 번에 최소 2개 이상의 재료를 직접 골라 정확한 조합을 찾아야 한다.
  - 조합 용량은 `2 + 발견 레시피 수 ÷ 2(내림)`으로 증가한다.
  - 발견하지 않은 레시피의 정답 조합은 목록에 미리 노출하지 않는다.
  - 같은 조합을 다시 맞추면 기존 레시피가 레벨업하고, 기존 단계별 추가 재료 비용도 적용된다.
- 레시피 5개 발견 뒤 `자동 요리 연구` 버튼이 해금된다.
  - 보유 재료로 발견 가능한 신규 레시피를 최우선으로 선택한다.
  - 신규 레시피가 없으면 제작 가능한 기존 레시피 중 레벨이 가장 낮은 것부터 업그레이드한다.
  - 계속 자동 실행되는 기능이 아니라 버튼을 누를 때마다 한 번만 연구한다.
- 병아리의 재료 드랍은 전체 방문당 8% 확률로 한 종류만 필드에 생성된다.
  - 해금된 슬롯 안에서 주재료 70%, 부재료 20%, 특별 재료 10% 가중치를 사용한다.
  - 방문 등급은 1회 `주1`, 80회 `주2`, 250회 `주2+부1`, 700회 `주2+부2+특별1`을 유지한다.
- 검증:
  - `RECIPE_LAB_THEME_SHEET_OK routes=45 capacity=2->4 auto=new-first/lowest-level`
  - `RECIPE_COMBINATIONS_OK minimum=2 growingCapacity=3 manualCombination=3`
  - `GUEST_GRADES_OK routes=45 introducedIngredients=51 dropChance=0.08 slotWeights=70/20/10`
  - 600회 시드 표본에서 슬롯 비중 `주 66.7% / 부 22.2% / 특별 11.1%`
  - 하단 메뉴·보관함, 파일 직접 열기, 레스토랑 전용, 드래그 스크롤, 테마/도감 분리, Unity 기능 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 레시피 화면 진입, 조합 용량 2, 자동 연구 잠금, 슬롯 확률 및 콘솔 오류 없음 확인
  - 수동 조합 화면: `output/recipe-lab-theme-sheet/01-manual-combination-ready.png`
  - 자동 연구 화면: `output/recipe-lab-theme-sheet/02-auto-new-recipe.png`

## 2026-08-03 보유 재료 중심 레시피 발견

- 현재 설정 재료 수를 다시 확인했다.
  - `GAME_INGREDIENTS` 등록 재료: 78종
  - 테마 병아리 드랍 및 레시피에 실제 연결된 재료: 51종
  - 나머지 27종은 설정에만 남은 미사용 재료다.
- 샐러드 조합에서 산딸기(블루베리 아이콘)를 제거했다.
  - 샐러드 Lv.1 → Lv.2는 `나뭇잎 2개`로 업그레이드된다.
  - 이후 레벨부터는 나뭇잎 요구량이 단계적으로 증가한다.
- 레시피 발견 조건을 병아리/테마 해금과 분리했다.
  - 병아리 해금은 새로운 재료 공급처를 여는 역할만 담당한다.
  - 수동 조합과 자동 요리 연구는 전체 레시피 조합을 대상으로 보유 재료가 맞는지 검사한다.
  - 아직 해당 테마나 병아리가 잠겨 있어도 필요한 재료를 가지고 있으면 레시피를 발견할 수 있다.
  - 제작 재료 선택 목록도 해금 병아리 목록이 아니라 실제 보관함의 보유 재료를 기준으로 표시한다.
- 레시피 제작 카드에서 병아리 아이콘과 테마/병아리 이름을 제거하고 `재료 조합 → 레시피` 관계만 보이도록 정리했다.
- 검증:
  - `OWNED_INGREDIENT_DISCOVERY_OK configured=78 active=51 salad=leafx2 futureRecipe=10042`
  - `RECIPE_COMBINATIONS_OK salad=leafx2 growingCapacity=3 manualCombination=3`
  - `RECIPE_LAB_THEME_SHEET_OK routes=45 capacity=2->4 auto=new-first/lowest-level`
  - 초기 상태에서 우주 테마와 병아리가 잠겨 있어도 보유한 조합 재료만으로 우주 테마 연계 레시피 발견 확인
  - 하단 메뉴/재료 보관함 및 레스토랑 전용 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `searchScope=all-recipes-by-owned-ingredients`, 샐러드 요구량 2개, 콘솔 오류 없음 확인
  - 샐러드 조합 화면: `output/owned-ingredient-discovery/01-salad-two-leaves.png`
  - 미해금 테마 레시피 발견 화면: `output/owned-ingredient-discovery/02-future-recipe-by-inventory.png`

## 2026-08-03 손님 도감 UI 정리·방문 3단계

- 손님 45마리의 긴 정보를 카드마다 반복하던 도감 UI를 전면 정리했다.
  - 상단 가로 손님 목록에서 한 마리를 선택하고, 아래에는 선택한 손님 한 마리의 상세 정보만 표시한다.
  - 상세 정보는 등장 테마/조건, 방문 등급, 드랍 재료만 남겼다.
  - 레시피가 병아리 해금과 분리된 현재 구조에 맞춰 `연결 레시피` 표시는 제거했다.
  - 잠긴 손님, 선택 상태, 현재 방문 단계와 해금된 재료를 시각적으로 구분했다.
- 방문 등급을 3단계로 단순화했다.
  - 첫 방문: 주재료 후보 해금
  - 80회: 부재료 후보 해금
  - 300회: 특별 재료 후보 해금
- 드랍에 성공했을 때의 실제 수량은 방문 단계와 관계없이 항상 선택된 재료 1개다.
  - 방문 단계는 드랍 후보 종류만 늘린다.
  - 전체 드랍 성공 확률 8%와 주/부/특별 가중치 70%/20%/10%는 유지한다.
- 검증:
  - `CUSTOMER_CODEX_UI_OK roster=45 detail=1 grades=1/80/300 dropQuantity=1`
  - `GUEST_GRADES_OK routes=45 introducedIngredients=51 dropChance=0.08 slotWeights=70/20/10 thresholds=1/80/300`
  - 600회 시드 표본에서 첫 방문·80회·300회 모두 드랍 한 번당 수량 1개 확인
  - 테마/도감 정보 분리, 레시피 연구, 재료 보관함, 레스토랑 전용 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 도감 진입, 3단계 데이터, 드랍 수량 설정 및 콘솔 오류 없음 확인
  - 새 도감 화면: `output/customer-codex-clean-ui/01-clean-customer-profile.png`

## 2026-08-04 재료 드랍 10%·보관함 10×10 제한

- 병아리 재료 드랍 성공 확률을 8%에서 10%로 올렸다.
- 재료 보관함을 10칸으로 제한했다.
  - 재료 한 종류가 한 칸을 사용한다.
  - 한 칸에는 같은 재료를 최대 10개까지 보관할 수 있다.
  - 전체 이론상 최대 보관량은 10종 100개다.
- 보관함이 가득 찬 경우의 수령 처리를 추가했다.
  - 같은 재료가 10개면 해당 재료를 더 주울 수 없다.
  - 서로 다른 재료 10종을 보관 중이면 새로운 종류를 주울 수 없다.
  - 수령하지 못한 재료는 필드에 그대로 남고, 보관함을 비운 뒤 다시 누를 수 있다.
  - 기존 저장 데이터가 한도를 넘으면 로드 시 10종·종류별 10개로 정규화한다.
- 재료 보관함 UI를 실제 10칸 그리드로 변경했다.
  - 사용 칸 `n/10`, 전체 수량 `n/100`, 개별 수량 `n/10`을 표시한다.
  - 빈 칸과 가득 찬 칸을 별도 스타일로 구분한다.
- 검증:
  - `INGREDIENT_STORAGE_LIMITS_OK drop=10% slots=10 stack=10 fullDropsRemain=true`
  - `GUEST_GRADES_OK routes=45 introducedIngredients=51 dropChance=0.1 slotWeights=70/20/10 thresholds=1/80/300`
  - `INGREDIENT_DROP_10_PERCENT_QUANTITY_OK` 600회 시드 표본 첫 방문 65회, 80회 64회, 300회 56회 드랍
  - 레시피 조합, 보관함/냉장고, 보유 재료 발견, 손님 도감 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `dropChance=0.1`, `slotLimit=10`, `stackLimit=10`, 콘솔 오류 없음 확인
  - 보관함 화면: `output/ingredient-storage-limits/01-ten-slot-storage.png`

## 2026-08-04 레시피 레벨업 가격 보너스 10%

- 동일 레시피를 다시 제작해 레벨업할 때 판매 가격 상승량을 레벨당 5%에서 10%로 변경했다.
- 실제 손님 결제, 설비가 부족한 예외 결제, 보유 레시피 카드, 토스트, `render_game_to_text` 가격을 같은 공통 설정으로 통일했다.
- 레시피 발견 수에 따른 별도 전체 수익 보너스(레시피 1개 초과당 5%)는 이번 변경 대상이 아니므로 유지했다.
- 예시: 기본 가격 40인 샐러드는 Lv.1 40 → Lv.2 44 → Lv.3 48이다.
- 검증:
  - `OWNED_INGREDIENT_DISCOVERY_OK configured=78 active=51 salad=leafx2 priceBonus=10% futureRecipe=10042`
  - Lv.2 샐러드의 실제 결제 금액도 44로 적용되는 것을 확인
  - 레시피 조합 및 레시피 연구/테마 시트 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `recipeLevelPriceBonus=0.1`, 콘솔 오류 없음 확인
  - 화면 확인: `output/owned-ingredient-discovery/02-salad-level-2-price.png`

## 2026-08-04 레시피 고정 조합 비용·돌 테마 병아리 3마리

- 레시피 레벨이 오를 때마다 필요 재료 총량이 1개씩 증가하던 로직을 제거했다.
- 이제 각 레시피는 발견할 때 사용한 조합과 동일한 종류·개수로 계속 업그레이드한다.
  - 샐러드는 모든 레벨에서 나뭇잎 2개다.
  - 나뭇잎 3개를 보유하면 한 번 업그레이드하고 1개가 남는다.
  - Lv.2 → Lv.3도 나뭇잎 2개만 사용하며 판매 가격은 기존 규칙대로 48이 된다.
- 돌 테마 병아리를 총 3마리로 변경했다.
  - 시작: 기본 병아리
  - 돌 테마 설비 70%: 공룡 병아리
  - 돌 테마 설비 100%: 알껍질 병아리
- 테마 진척 게이지, 병아리 카드, 손님 도감 해금 문구도 `기본/70%/100%` 조건과 일치하도록 수정했다.
- 검증:
  - `OWNED_INGREDIENT_DISCOVERY_OK configured=78 active=51 salad=leafx2 fixedUpgradeCost=2 priceBonus=10% futureRecipe=10042`
  - `THEME_CHICK_MILESTONES_OK stone=1/2/3 campingTotal=11 thresholds=4/8/11`
  - 레시피 조합 및 자동 요리 연구 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `saladCost=2`, `upgradeRule=fixed-per-recipe`, 콘솔 오류 없음 확인
  - 화면 확인: `output/owned-ingredient-discovery/03-salad-level-3-fixed-cost.png`, `output/theme-chick-milestones-stone-3/00d-stone-three-chicks-complete.png`

## 2026-08-04 재료 중심의 상식적인 레시피 45종 재구성

- 테마 이름과 기존 음식명 목록을 조합해 레시피를 자동 생성하던 방식을 제거했다.
- 45개 레시피의 음식명, 재료 조합, 아이콘 기준을 각각 직접 정의했다.
  - 샌드위치: 빵 + 나뭇잎
  - 야채볶음밥: 쌀 + 식용유 + 모둠 채소
  - 돈까스: 돼지고기 + 빵가루 + 식용유
  - 토마토 파스타: 파스타면 + 토마토 + 마늘
  - 초밥: 쌀 + 생선 + 식초
  - 핫도그: 빵 + 소시지 + 케첩
- `돌 샌드위치`, `목욕탕 샌드위치`, `우주 점성술 핫도그`처럼 테마명이 붙은 음식 이름을 모두 없앴다.
- 병아리 드랍 재료군도 요리에 쓸 수 있는 식재료 위주로 재배치했다.
  - 활성 드랍 재료 51종과 레시피 사용 재료 51종이 정확히 일치한다.
  - 드랍되지만 레시피에 사용되지 않는 재료는 없다.
  - 모든 레시피 이름과 조합은 서로 고유하다.
- 진행 흐름은 `샐러드 → 버섯전/샌드위치 발견 → 조합 용량 3칸 → 볶음밥 등 3재료 레시피 발견`으로 확인했다.
- 검증:
  - `RECIPE_COMBINATIONS_OK salad=leafx2 sandwich=bread+leaf friedRice=rice+oil+veg uniqueConcepts=45`
  - `OWNED_INGREDIENT_DISCOVERY_OK configured=78 active=51 salad=leafx2 fixedUpgradeCost=2 priceBonus=10% futureRecipe=10042`
  - 레시피 수동 조합, 자동 연구, 돌 테마 병아리 3마리, 10% 단일 재료 드랍 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 샐러드/샌드위치 조합과 고정 업그레이드 비용 확인, 콘솔 오류 없음
  - 화면 확인: `output/recipe-lab-sensible-recipes/01-manual-combination-ready.png`, `output/owned-ingredient-discovery-sensible/04-future-recipe-by-inventory.png`

## 2026-08-04 원본 레시피 40종 복구·해바라기 씨앗 파이 수정

- 직전 재구성에서 원본 레시피 이름까지 임의 교체한 문제를 바로잡았다.
- `data/Recipe.json`과 기존 `RECIPE_NAMES`에 있는 원본 40종 이름, 전용 아이콘, 가격·조리시간 기반 데이터를 모두 다시 보존했다.
- 45개 진행 슬롯 중 나머지 5개만 추가 레시피로 구성했다.
  - 버섯전, 콘수프, 햄 샌드위치, 트러플 크림 파스타, 아보카도 샐러드
- 원본 레시피는 이름에 맞는 재료 조합으로 다시 연결했다.
  - 해바라기 씨앗 파이: 해바라기씨 + 밀가루 + 버터
  - 볶음밥: 쌀 + 식용유 + 모둠 채소
  - 샌드위치: 빵 + 나뭇잎
  - 돈까스: 돼지고기 + 빵가루 + 식용유
- 활성 드랍 재료 51종과 레시피 사용 재료 51종은 계속 정확히 일치하며, 조합 중복도 없다.
- 검증:
  - 원본 40종 누락 0개, 전체 45종 이름/조합 모두 고유
  - `RECIPE_COMBINATIONS_OK originals=40 sunflowerPie=seed+flour+butter sandwich=bread+leaf friedRice=rice+oil+veg`
  - 수동 조합, 자동 연구, 고정 업그레이드 비용, 돌 테마 병아리, 10% 단일 드랍 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 해바라기 씨앗 파이 조합과 전체 레시피 45종 확인, 콘솔 오류 없음
  - 화면 확인: `output/recipe-combinations-sensible/03-sunflower-seed-pie-ready.png`

## 2026-08-04 도마·보울 레시피 조합 UI와 발견 연출

- 네모난 조합 슬롯 UI를 제거하고 나무 도마 위의 실제 보울 형태로 제작 화면을 교체했다.
- 재료 버튼을 누르면 해당 재료가 위에서 보울 안으로 떨어지는 애니메이션을 추가했다.
- 보울 안의 재료를 누르면 다시 뺄 수 있고, 수용량은 슬롯 대신 보울 아래의 작은 점으로 표시한다.
- 제작 버튼을 `🥄 보울 섞기`로 변경하고 재료 선택 영역을 `재료 넣기`로 분리했다.
- 새 레시피를 발견하면 화면 전체에 다음 축하 연출이 나타난다.
  - 회전 광선, 반짝이, 완성 요리 아이콘 등장 애니메이션
  - `새 레시피 발견!`과 완성 음식명 표시
  - `짜잔!` 버튼 또는 3.6초 후 닫기
- 기존 레시피 업그레이드는 발견 연출을 반복하지 않고 기존 가격 상승 토스트만 유지한다.
- `render_game_to_text`에 `mixingPresentation=cutting-board-and-bowl`과 현재 발견 연출 상태를 추가했다.
- 검증:
  - 도마·보울 노출, 기존 슬롯 UI 제거, 보울 안 재료 3개 배치 자동 검사 통과
  - 볶음밥 신규 발견 시 축하 연출과 완성 아이콘·음식명 노출 확인
  - 수동 조합, 자동 연구, 고정 업그레이드, 병아리 해금 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 새 조합 표현 상태와 콘솔 오류 없음 확인
  - 화면 확인: `output/recipe-combinations-sensible/01-three-ingredient-ready.png`, `output/recipe-combinations-sensible/02-three-ingredient-crafted.png`

## 2026-08-04 미발견 레시피 목록과 근접 조합 힌트

- 제작 화면 아래에 발견 가능한 레시피 45종을 전부 목록으로 표시했다.
- 미발견 레시피는 음식명과 아이콘을 숨기고 `???`와 필요한 재료 칸 수만 표시한다.
- 같은 재료 수의 조합에서 한 칸만 틀렸을 때 가장 가까운 미발견 레시피 하나를 선택한다.
  - 2재료 레시피는 1개 이상, 3재료 레시피는 2개 이상 일치해야 한다.
  - 선택한 틀린 재료는 카드에 표시하지 않고, 맞은 재료만 해당 `???` 카드에 공개한다.
  - 이미 공개한 힌트는 저장되며 다른 시도에서 맞힌 재료와 누적된다.
- 레시피를 완성하면 같은 카드가 음식명, 아이콘, 전체 재료 조합을 보여주는 발견 카드로 전환된다.
- 검증:
  - 전체 카드 45개, 초기 미발견 44개, 발견 1개 확인
  - `빵 + 달걀` 오답에서 샌드위치 카드에 `빵`만 공개되고 `달걀`은 노출되지 않음
  - 새로고침 뒤 힌트 유지 및 `빵 + 나뭇잎` 완성 후 샌드위치 카드 공개 확인
  - 수동 조합, 자동 연구, 재료 기반 발견, 보관함 제한 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 상태에서 `mysteryRecipeCount=44`, 힌트 규칙과 콘솔 오류 없음 확인
  - 화면 확인: `output/recipe-hints/01-partial-hint.png`, `output/recipe-hints/02-discovered-after-hint.png`

## 2026-08-04 초반 저가 레시피 5종 추가

- 기존 병아리 45마리와 연결된 레시피를 삭제하거나 교체하지 않고, 병아리 해금과 무관한 초반 발견 레시피 5종을 추가했다.
  - 버터 토스트: 빵 + 버터 / 35원
  - 토마토 샌드위치: 빵 + 토마토 / 40원
  - 달걀 샌드위치: 빵 + 달걀 / 42원
  - 토마토 달걀볶음: 토마토 + 달걀 / 38원
  - 버터빵: 밀가루 + 달걀 + 버터 / 50원
- 전체 레시피는 45종에서 50종으로 증가했으며, 테마별 병아리는 계속 3마리씩 총 45마리를 유지한다.
- 1~2테마의 최고 단골 이전 재료 9종만으로 발견 가능한 레시피는 3종에서 8종으로 증가했다.
- 신규 레시피도 `???` 목록, 근접 조합 힌트, 수동 발견, 자동 연구, 레벨업 시스템에 동일하게 연결했다.
- 검증:
  - 초반 재료 9종 / 초반 제작 가능 레시피 8종 / 전체 레시피 50종 자동 검사 통과
  - 중복 재료 조합 0개, 신규 레시피 가격 35~50원 확인
  - `빵 + 버터` 수동 조합으로 버터 토스트 발견·가격·발견 연출 확인
  - 레시피 힌트, 원본 40종 조합, 테마당 병아리 3마리, 45마리 드랍 구조 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `catalogTotal=50`, `mysteryRecipeCount=49`, 콘솔 오류 없음 확인
  - 화면 확인: `output/early-recipes/01-butter-toast-discovered.png`

## 2026-08-04 재료 드랍률·등급 비율·보조재료 해금 완화

- 병아리 한 마리의 재료 드랍 성공 확률을 10%에서 15%로 높였다.
- 드랍 성공 후 재료 슬롯 가중치를 주재료 50%, 보조재료 30%, 특별재료 20%로 변경했다.
- 손님 방문 등급과 재료 후보 해금 기준을 다음과 같이 변경했다.
  - 1회: 주재료
  - 40회: 주재료 + 보조재료
  - 300회: 주재료 + 보조재료 + 특별재료
- 손님 도감의 단계 표시, 진행 게이지, 다음 단계 문구와 각 재료 확률 표시도 1/40/300 및 50/30/20에 맞췄다.
- 한 번의 성공에서 재료 한 종류만 1개 드랍되는 기존 규칙은 유지했다.
- 검증:
  - 고정 시드 600회 표본에서 1회 97개, 40회 82개, 300회 86개 드랍으로 15% 범위 확인
  - 1회에는 주재료만, 40회에는 보조재료까지, 300회에는 특별재료까지 포함되는 것 확인
  - 최고 단계 슬롯 표본 비율 주 47.3% / 보조 26.4% / 특별 26.4%로 표본 허용 범위 통과
  - 손님 도감에서 1회/40회/300회와 50%/30%/20% 표시 확인
  - 보관함 10칸·칸당 10개 및 단일 재료 드랍 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 상태에서 `overallChance=0.15`, `slotChances=0.5/0.3/0.2`, `gradeThresholds=1/40/300`, 콘솔 오류 없음 확인
  - 화면 확인: `output/customer-codex-clean-ui/01-clean-customer-profile.png`

## 2026-08-04 합산 재료 보관 용량과 보석 확장

- 기존 `재료 종류 10칸 × 종류별 10개` 보관 방식을 제거하고, 모든 재료 개수를 합산하는 단일 용량 방식으로 변경했다.
- 새 게임의 재료 보관함 기본 용량은 총 20칸이다. 재료 한 개가 종류와 관계없이 한 칸을 사용한다.
- 재료 보관함에서 보석 10개를 사용하면 최대 용량이 5칸씩 영구 증가한다.
- 보관함 UI에 현재 사용량/최대 용량, 채움 게이지, 남은 칸 수, `보석 10 +5칸` 버튼을 추가했다.
- 보석이 10개 미만이면 확장 버튼이 비활성화된다.
- 보관함이 가득 차면 필드 재료는 사라지지 않고 그대로 남으며, 확장 후 다시 주울 수 있다.
- 종류별 보관 상한은 없으며 재료 카드에는 현재 보유 개수만 표시한다.
- 기존 저장 데이터는 재료를 버리지 않고, 현재 총보유량을 수용할 수 있는 5칸 단위 용량으로 자동 이전한다.
- 검증:
  - 초기 20칸, 보석 10개 차감, 25칸 확장, 남은 5칸 표시 확인
  - 20/20 상태에서 필드 재료 유지 및 확장 후 21/25로 정상 수집 확인
  - 보석 소진 후 확장 버튼 비활성화 확인
  - 기존 총 26개 저장 데이터가 손실 없이 30칸 용량으로 이전되는 것 확인
  - 냉장고에서 보관함 열기, 레시피 제작·힌트·재료 차감 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 상태에서 `capacity=20`, `expansionGemCost=10`, `expansionAmount=5`, 콘솔 오류 없음 확인
  - 화면 확인: `output/ingredient-storage-limits/01-full-20-slot-storage.png`, `output/ingredient-storage-limits/02-expanded-25-slot-storage.png`

## 2026-08-04 요리 연구 로딩과 괴식 실패 결과

- 수동 조합과 자동 요리 연구 모두 결과가 즉시 나오지 않고 2.4초 동안 `요리 연구 중...` 연출과 진행 게이지를 거치도록 통일했다.
- 연구 버튼을 누르는 순간 조합에 사용한 재료가 차감되며, 결과가 실패해도 재료를 돌려주지 않는다.
- 등록되지 않은 수동 조합은 새 레시피를 추가하지 않고 `괴식` 결과 팝업을 표시한다.
- 괴식은 프로젝트 전용 신규 투명 PNG 아이콘 `assets/ui/recipe/icon_recipe_weird.png`을 제작해 적용했다.
- 실패 조합이 기존 비공개 레시피와 한 재료 차이라면 기존 규칙대로 맞은 재료 힌트는 남는다.
- 자동 연구는 기존의 `신규 레시피 우선 → 기존 최저 레벨 우선` 대상 선정 규칙을 유지하면서 동일한 로딩 연출과 즉시 재료 차감을 사용한다.
- 상태 출력과 저장 호환 지표에 현재 연구 진행률, 연구 시도 횟수, 괴식 실패 횟수를 추가했다.
- 검증:
  - 빵 + 쌀 실패 조합에서 재료 즉시 0개, 51% 로딩 게이지, 괴식 결과, 샌드위치의 빵 힌트 공개 확인
  - 레시피 5개 보유 후 자동 연구가 빵 + 나뭇잎을 즉시 차감하고 2.4초 뒤 신규 샌드위치를 우선 발견하는 것 확인
  - 레시피 힌트·초반 레시피·보유 재료 탐색·3재료 조합·자동 연구 우선순위 회귀 테스트 통과
  - 합산 재료 보관함 및 하단 메뉴/냉장고 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `currentScreen=recipe`, 연구 상태 필드 및 신규 지표 노출, 콘솔 오류 없음 확인
  - 화면 확인: `output/recipe-research-and-weird-dish/01-manual-research-loading.png`, `02-weird-dish-result.png`, `03-auto-research-success.png`

## 2026-08-04 재료 수요·공급 편차 완화

- 활성 재료 51종의 레시피 사용 횟수와 병아리 드랍 슬롯 가중치를 함께 계산해 재료 공급표를 재배치했다.
- 테마마다 신규 재료 3종이 추가되고 병아리마다 주·보조·특별 재료 1종씩을 갖는 구조는 유지했다.
- 후속 테마에서는 이미 등장한 재료만 재사용하며, 달걀·쌀·빵·밀가루·육수 등 사용처가 많은 재료가 후반 병아리의 주·보조 재료로 다시 나오도록 했다.
- 사용처가 적은 특별 재료가 여러 병아리에게 반복 배치되던 구조를 줄였다.
- 최고 단골 단계를 제외한 초반 1~2테마의 재료 9종과 제작 가능 레시피 8종은 그대로 유지했다.
- 남는 재료의 자연스러운 소비처로 다음 8개 레시피를 추가했다.
  - 마늘 버섯볶음, 양배추 돼지고기볶음, 콘치즈, 씨앗 샐러드
  - 당근 크림수프, 아보카도 에그, 과일 우유, 매콤 치즈 감자
- 전체 레시피는 50종에서 58종으로 증가했고, 레시피 사용처가 1개뿐인 활성 재료는 21종에서 12종으로 감소했다.
- 레시피 사용 횟수 대비 드랍 슬롯 공급 가중치 편차는 약 26배에서 2.5배로 감소했다.
- 자동 요리 연구는 `신규 우선 → 최저 레벨 우선` 규칙 뒤에 `같은 레벨이면 보유량이 많은 재료를 소비하는 조합 우선` 규칙을 추가했다.
- 검증:
  - 신규 8개 레시피 조합 중복 없음, 51개 활성 재료 전부 소비처 존재 확인
  - 콘치즈 수동 연구에서 옥수수·치즈·버터 차감, 로딩 게이지, 신규 발견 연출 확인
  - 같은 레벨의 버터 토스트와 토마토 샌드위치 중 토마토 재고가 많을 때 토마토 샌드위치를 자동 선택하는 것 확인
  - 초반 레시피, 비공개 힌트, 3재료 조합, 보유 재료 탐색, 괴식 실패, 보관함 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `catalogTotal=58`, 자동 연구 우선순위 상태, 콘솔 오류 없음 확인
  - 화면 확인: `output/ingredient-demand-balance/01-surplus-recipe-research.png`, `02-corn-cheese-discovered.png`, `03-surplus-auto-research.png`

## 2026-08-04 예상 발견 시점 기준 레시피 정렬

- 레시피 제작 목록을 데이터 등록 순서가 아니라 필요한 재료를 가장 먼저 획득할 수 있는 시점 순으로 정렬했다.
- 정렬 점수는 테마 순서, 같은 테마의 병아리 등장 진척도, 주재료/보조재료/특별재료 방문 해금 단계를 함께 사용한다.
- 이미 발견한 레시피 여부에 따라 카드가 움직이지 않는 고정 순서라서 연구 전후에도 위치를 기억할 수 있다.
- 첫 8개 순서는 `샐러드 → 버섯전 → 샌드위치 → 토마토 샌드위치 → 달걀 샌드위치 → 토마토 달걀볶음 → 버터 토스트 → 버터빵`이다.
- 비슷한 실패 조합에서 힌트를 공개할 후보가 여러 개일 때도 같은 예상 발견 순서를 사용한다.
- `render_game_to_text`에 `catalogSort`와 전체 `catalogOrder`를 추가했다.
- 검증:
  - UI의 첫 8개 카드와 상태 출력 순서 일치 확인
  - 토마토 샌드위치 발견 전후에도 NO.04 위치가 유지되는 것 확인
  - 초반 레시피, 힌트, 수요·공급 밸런스, 괴식 및 자동 연구 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `catalogTotal=58`, 첫 순서 `1,10001,2,20002,20003,20004,20001,20005`, 콘솔 오류 없음 확인
  - 화면 확인: `output/recipe-discovery-order/01-earliest-recipes-first.png`, `02-order-kept-after-discovery.png`

## 2026-08-04 초반 양상추 소비처와 밀가루 과잉 수정

- 기본 병아리의 보조재료인 양상추가 후반 레시피에만 사용되던 연결 오류를 수정했다.
- `나뭇잎 + 양상추`로 발견하는 저가 레시피 `새싹 샐러드`를 추가했다. 가격은 32원이다.
- 새싹 샐러드는 예상 발견 순서 NO.02에 배치되어 양상추를 처음 얻는 즉시 조합 후보로 확인할 수 있다.
- 기본 샐러드의 `나뭇잎 2개` 조합은 유지했다.
- 첫 테마의 밀가루가 주재료 50%, 버섯이 보조재료 30%여서 1:1 버섯전 제작 후 밀가루가 남던 구조를 수정했다.
- 해당 병아리의 드랍 순서를 `버섯 주재료 50% / 밀가루 보조재료 30% / 고기 특별재료 20%`로 변경했다.
- 전체 레시피는 59종, 초반 1~2테마에서 최고 단골 단계를 제외하고 만들 수 있는 레시피는 9종이다.
- 검증:
  - 나뭇잎 + 양상추 연구 시작 시 재료 즉시 차감, 로딩 게이지, 새싹 샐러드 발견 연출 확인
  - 레시피 정렬 첫 순서 `샐러드 → 새싹 샐러드 → 버섯전 → 샌드위치` 확인
  - 수요·공급 편차 3.0배 이내, 힌트·괴식·자동 연구·테마 재료 구조 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 `catalogTotal=59`, 첫 ID `1,20014,10001,2,20002`, 콘솔 오류 없음 확인
  - 화면 확인: `output/early-lettuce-and-flour-balance/01-lettuce-research.png`, `02-sprout-salad-discovered.png`

## 2026-08-04 레스토랑 테마 가격 2배 곡선

- 나무 테마 이후 레스토랑 테마 파츠 가격 증가 배율을 단계당 10배에서 2배로 낮췄다.
- 나무 테마의 기존 가격은 유지하며 초록 줄무늬부터 이전 테마 가격의 2배씩 증가한다.
- 대표 가격 범위:
  - 나무 테마: 1,300~2,250
  - 초록 줄무늬 테마: 2,600~4,500
  - 블루화이트 테마: 5,200~9,000
  - 우주 점성술 테마: 10,649,600~18,432,000
- 검증:
  - 테마 2~15의 모든 설비 파츠가 동일 설비의 이전 테마 대비 정확히 2배인지 확인
  - 초록 줄무늬 테마 UI에서 `2.6a`, `2.8a`, `3.6a` 등 변경 가격 표시 확인
  - 테마 병아리 30/70/100% 해금 및 손님 도감 분리 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 상태에서 나무 `1300~2250`, 초록 줄무늬 `2600~4500`, 블루화이트 `5200~9000`, 콘솔 오류 없음 확인
  - 화면 확인: `output/theme-price-2x/01-green-stripe-2x-prices.png`

## 2026-08-04 한 재료 일치 레시피 힌트

- 실패한 조합도 동일한 재료 수의 미발견 레시피와 재료가 하나 이상 일치하면 힌트를 얻도록 완화했다.
- 후보가 여러 개면 가장 많이 일치한 레시피를 우선하고, 동률이면 기존 예상 발견 순서를 사용해 한 레시피만 공개한다.
- 힌트를 얻은 미발견 카드는 `???` 대신 레시피 이름을 표시하고, 맞은 재료는 정확한 아이콘·이름으로 공개한다.
- 남은 정답은 실제 재료명을 감추고 `초록색 채소`, `든든한 곡물 재료`, `고소한 유제품` 같은 표현형 힌트와 `~가 더 필요할 것 같아요` 문장으로 안내한다.
- 현재 레시피에 쓰이는 재료 51종 모두에 힌트 분류가 연결되어 있다.
- 예시 검증: `나뭇잎 + 쌀` 실패 시 `새싹 샐러드 / 나뭇잎 / 초록색 채소가 더 필요할 것 같아요`만 표시하고 정답 `양상추`와 오답 `쌀`은 노출하지 않는다.
- 힌트는 저장 후 재접속해도 유지되며, 정확한 조합을 완성하면 기존 레시피 발견 카드로 정상 전환된다.
- 괴식 생성 및 재료 소비, 연구 2.4초 로딩, 새싹 샐러드 발견, 레시피 정렬 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 새 `hintRule`, 레시피 59종, 콘솔 오류 없음 확인.
- 화면 확인: `output/one-match-recipe-clues/01-sprout-salad-clue.png`.
- TODO: 플레이 피드백에 따라 힌트 표현을 더 좁게 쪼갤 수 있으나, 현재는 정답을 직접 알려주지 않는 중간 난이도로 설정했다.

## 2026-08-04 테마 가격 10배 후 2배 곡선 정정

- 이전의 전 구간 2배 가격 곡선을 사용자 의도에 맞게 정정했다.
- 나무 테마 가격 `1,300~2,250`은 그대로 유지한다.
- 초록 줄무늬 테마는 나무 테마의 10배인 `13,000~22,500`으로 설정했다.
- 블루화이트 테마부터는 직전 테마의 2배씩 증가하며 첫 범위는 `26,000~45,000`이다.
- 모든 레스토랑 테마 설비 종류별로 `나무→초록 줄무늬 10배`, 이후 `직전 테마 대비 2배`인지 검사했다.
- 초록 줄무늬 테마 UI에서 `13a`, `14a`, `18a`, `20a` 가격 표시를 확인했다.
- 테마 병아리 30/70/100% 해금과 레시피 힌트 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트 상태에서 나무 `1300~2250`, 초록 줄무늬 `13000~22500`, 블루화이트 `26000~45000`, 콘솔 오류 없음 확인.
- 화면 확인: `output/theme-price-hybrid/01-green-stripe-10x-prices.png`.

## 2026-08-04 자동 연구 무작위 괴식 폴백

- 자동 요리 연구가 제작 가능한 신규·기존 레시피를 찾지 못해도 멈추지 않도록 변경했다.
- 이 경우 보관함의 재료를 무작위로 섞고, 현재 보울 용량까지 담아 즉시 소비한 뒤 기존 2.4초 연구 연출을 시작한다.
- 유효한 레시피가 없는 폴백 연구 결과는 괴식이며 실패 횟수와 연구 기록도 기존 수동 실패와 동일하게 남는다.
- 재료가 2개 미만일 때만 시작하지 않고 `자동 연구에는 재료가 2개 이상 필요해요.`를 표시한다.
- 기존 자동 연구 우선순위인 `신규 레시피 → 가장 낮은 레벨 → 재고 압력`은 그대로 유지했다.
- 검증에서 보유 재료 6개 중 보울 용량 5개가 무작위로 소비되고, 연구 로딩 51%를 거쳐 괴식 연출로 끝나는 것을 확인했다.
- 레시피 연구, 자동 우선순위, 재료 수요 밸런스, 힌트 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트 상태에 `random-ingredients-up-to-bowl-capacity-then-weird-dish` 규칙이 출력되고 콘솔 오류가 없음을 확인했다.
- 화면 확인: `output/recipe-research-and-weird-dish/04-auto-random-research-loading.png`, `05-auto-random-weird-dish.png`.

## 2026-08-04 2~5재료 레시피 확장

- 보울 용량은 증가하지만 모든 레시피가 최대 3재료이던 구조를 수정했다.
- 전체 레시피를 59종에서 64종으로 늘렸고 재료 수 분포는 `2재료 21종 / 3재료 24종 / 4재료 11종 / 5재료 8종`이다.
- 보울 용량은 레시피 발견 수에 따라 2→3→4→5칸으로 증가하고, 실제 최대 레시피가 5재료이므로 5칸에서 멈춘다.
- 초반 1~2테마 재료로 만들 수 있는 레시피를 9종에서 14종으로 늘렸다.
- 추가한 초반 레시피는 `양상추 샌드위치`, `버섯 토스트`, `달걀밥`, `버터 라이스`, `토마토 리조또`다.
- 볶음밥·김밥·피자·파스타 등은 4재료, 햄버거·비빔밥·타코·라멘·스테이크 등은 5재료의 상식적인 조합으로 확장했다.
- 후반에도 황제 버거·과일 가족 모임·스튜·구름빵·트러플 크림 파스타·아보카도 샐러드를 4~5재료로 확장했다.
- 51종 재료의 수급 대비 사용 편차는 기존 기준인 최대 3.0배를 유지하고, 중복 조합은 0개다.
- 4칸 볶음밥과 5칸 스테이크를 수동으로 담아 연구·소비·발견 연출까지 검증했다.
- 초반 레시피, 발견 순서, 힌트, 자동 연구, 괴식, 재료 밸런스 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 `catalogTotal=64`, 재료 수 분포 `21/24/11/8`, 콘솔 오류 없음 확인.
- 화면 확인: `output/recipe-combinations-sensible/01-four-ingredient-ready.png`, `04-five-ingredient-steak-ready.png`, `05-five-ingredient-steak-discovered.png`.

## 2026-08-04 초록색 병아리 나뭇잎 수급 보강

- 초중반 나뭇잎 수급을 위해 초록 줄무늬 테마의 초록색 병아리 3종에 나뭇잎 드랍을 연결했다.
- 아보카도 병아리는 `나뭇잎 주재료 / 식용유 보조재료 / 쌀 특별재료`로 변경해 첫 방문부터 나뭇잎을 획득할 수 있다.
- 양배추 병아리는 `감자 주재료 / 나뭇잎 보조재료 / 치즈 특별재료`로 변경해 40회 단골부터 나뭇잎을 획득할 수 있다.
- 선인장 병아리는 `토마토 주재료 / 나뭇잎 보조재료 / 소시지 특별재료`로 변경해 40회 단골부터 나뭇잎을 획득할 수 있다.
- 전체 재료 드랍 성공률 15%, 성공 시 한 재료만 드랍, 슬롯 비율 50/30/20은 유지했다.
- 51종 재료의 수급 대비 사용 편차는 최대 3.0배로 기존 기준을 유지한다.
- 손님 도감에서 양배추 병아리 40회 나뭇잎 활성화와 아보카도 병아리 첫 방문 나뭇잎 활성화를 확인했다.
- 손님 등급, 재료 수요 밸런스, 테마 신규 재료 3종 구조, 초반 레시피 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 드랍률 15%, 성공 시 1종 드랍, 레시피 64종과 콘솔 오류 없음 확인.
- 화면 확인: `output/green-chick-leaf-drops/01-cabbage-chick-leaf-drop.png`, `02-avocado-chick-primary-leaf.png`.

## 2026-08-04 레시피 레벨업 가격 연출

- 기존 레시피를 다시 제작해 레벨이 오를 때 별도의 레벨업 카드가 표시되도록 추가했다.
- 신규 발견보다 밋밋하게 보이도록 회전 광선·별 파티클·강한 팝 애니메이션을 제거하고 작은 크림색 카드와 짧은 상승 애니메이션만 사용한다.
- 카드에 레시피 이름, 이전/신규 레벨, 이전/신규 판매 가격, 실제 상승 금액, 접시당 추가 수익을 함께 표시한다.
- 예시로 샐러드 Lv.1→Lv.2는 `40 → 44`, `+4원 상승`, `한 접시마다 4원 더`로 표시된다.
- 가격은 고정 문구가 아니라 반올림된 실제 레벨 가격 차이를 계산해 표시하므로 레시피·레벨별 상승액과 일치한다.
- 수동 조합과 자동 요리 연구 업그레이드 모두 같은 연출을 사용하며 자동 여부도 텍스트 상태에 기록한다.
- 신규 레시피 발견은 기존의 밝은 광선·짜잔 연출을 그대로 유지하고 괴식 연출도 변경하지 않았다.
- 수동 샐러드 업그레이드, 자동 토마토 샌드위치 업그레이드, 4/5재료 신규 발견, 자동 괴식 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 레벨 가격 보너스 10%, 레시피 64종과 콘솔 오류 없음 확인.
- 화면 확인: `output/owned-ingredient-discovery-sensible/02-salad-levelup-price-reveal.png`, `output/ingredient-demand-balance/03-surplus-auto-research.png`.

## 2026-08-04 레스토랑 판매가 곱연산 통일 및 초반 가격 정리

- 실제 유니티 `CustomerPriceHelper`와 `AbilityMgr`를 확인해 판매가를 `레시피 레벨 가격 × RestaurantPriceUp × 만족 배율 × 공연 버프` 순서의 곱연산으로 통일했다.
- `RestaurantPriceUp`은 유니티와 동일하게 현재 적용 중인 외형만이 아니라 구매·해금한 레스토랑 테마 설비 효과를 모두 누적한다.
- 만족 손님, 일반 손님, 달래지 못한 불만 손님 모두 같은 가격 계산 함수를 사용하도록 결제 경로를 합쳤다.
- 공식에 없던 `보유 레시피 수당 전체 수익 +5%` 효과와 UI 문구를 삭제했다.
- 초반 1~2테마 재료로 제작 가능한 14종을 조사했다. 2재료 레시피는 32~43원, 3재료 레시피는 50원으로 정리되어 있다.
- 버섯전만 아이콘 원본 레시피 가격 360원을 잘못 상속해 단독 이상치였으므로 38원으로 조정했다.
- 6개 레시피 보유 상태에서 `44 × 1.1 × 1.5 × 1.2 = 87원`, 불만 상태는 `44 × 1.1 × 1 × 1.2 = 58원` 결제를 확인해 보유 개수 보너스가 섞이지 않음을 검증했다.
- 초반 가격, 레시피 레벨 가격, 레시피 발견 순서, 테마 가격, 테마/도감 분리 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 새 계산식과 기본 배율 상태를 확인했고 콘솔 오류가 없었다.
- 화면 확인: `output/restaurant-price-formula/01-multiplied-happy-payment.png`, `02-owned-recipes-no-collection-bonus.png`, `official-client/shot-0.png`.

## 2026-08-04 팁 최종 판매가 기준 10% 적용

- 팁이 최종 판매가가 아니라 `recipe.foodPrice × CommonCustomer.tipRatio`로 계산되던 문제를 수정했다.
- 이제 팁 발생 여부는 기존 규칙을 유지하되, 발생 금액은 손님 종류와 무관하게 `최종 결제 가격 × 10%`로 계산한다.
- 최종 판매가에는 레시피 레벨, 누적 RestaurantPriceUp, 만족 배율, 공연 버프가 모두 반영되므로 팁에도 해당 효과가 자연스럽게 반영된다.
- 정수 재화는 기존과 동일하게 반올림하며, 최종 결제 87원에서 팁 9원이 팁박스에 쌓이는 것을 확인했다.
- 만족 결제·불만 결제 및 레시피 레벨 가격 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 `tipRule: final-meal-price / 0.1`과 콘솔 오류 없음 확인.
- 화면 확인: `output/restaurant-price-formula/01-multiplied-happy-payment.png`.
