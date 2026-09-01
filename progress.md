Original prompt: 핵심 플레이 연구 파일에 있는 게임을 리소스만 남기고 리셋하는데 다른 콘텐츠는 다 빼고 홍보를 눌러서 병아리 손님 오고 음식 주고 가는 기본 시스템만 남겨놔 (만족하는 것도 빼버려)

## 2026-08-27 냉장고 재료 상세·폐기

- 냉장고 재료 카드를 터치 가능한 버튼으로 바꾸고, 재료 분류·설명·대회 선호 심사위원·드랍 병아리를 확인하는 상세 팝업을 추가했다.
- 대회 분류는 채소/고소한 재료/곡물·주식/고기·해산물/향신료·허브/과일·단맛/새콤한 재료로 정리하고 실제 대회 선호 판정과 같은 데이터를 사용한다.
- 폐기 수량을 `< 1 >` 형태로 1개부터 현재 보유량까지 조절할 수 있으며, 최종 차감 전에 되돌릴 수 없다는 경고 확인창을 한 번 더 표시한다.
- 폐기로 보유량이 줄면 보울에 미리 담긴 동일 재료도 남은 보유량을 넘지 않도록 함께 정리한다.
- 실제 화면에서 나뭇잎 10개 중 3개 폐기 시 냉장고 사용량이 `12/20 → 9/20`, 보유량이 `10 → 7`로 감소하는 것을 확인했다. 취소 시에는 차감되지 않았고 전량 폐기 시 카드가 제거됐다.
- 물 상세에서는 `조리 보조`, 대회 직접 선호 없음, `싱크대에서 시간 경과 후 확정 획득` 정보가 표시되는 것을 확인했다.
- 회귀 검사: `INGREDIENT_STORAGE_EXPANSION_OK`, `BOTTOM_CONTROLS_INVENTORY_OK`, 공식 게임 클라이언트 부팅 및 콘솔 오류 없음.
- 검증 화면: `output/fridge-discard/01-ingredient-detail.png`, `02-discard-warning.png`, `03-discarded.png`.

## 2026-08-27 뷔페 최고가 요리 자동 배치

- 사용 가능한 모든 진열대를 현재 발견한 요리의 레벨 반영 가격이 높은 순서대로 한 번에 채우는 `비싼 요리 자동 배치` 버튼을 추가했다.
- 동률이면 레시피 ID가 빠른 요리를 먼저 배치하며, 잠긴 진열대와 발견하지 않은 요리는 대상에서 제외한다.
- 자동 배치 직후 저장, 분당 수익 갱신, 토스트 안내가 함께 실행된다.
- 8개 요리·4개 진열대 테스트에서 기존 `+23/분`이 최고가 4종 자동 배치 후 `+41/분`으로 즉시 갱신됐다.
- 새로고침 후에도 `상큼 나뭇잎 샐러드 / 도토리묵 / 고기쌈 / 병아리콩 가득` 배치가 유지되는 것을 확인했다.
- 검증 화면: `output/buffet-auto-placement/01-before.png`, `02-after.png`, `03-persisted.png`.

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

## 2026-08-04 특별 재료 해금 150회 완화

- 후반 병아리의 특별 재료 수급 부담을 낮추기 위해 최고의 단골 조건을 방문 300회에서 150회로 낮췄다.
- 손님 단계는 `첫 방문 1회: 주재료 / 단골 40회: 보조재료 / 최고의 단골 150회: 특별 재료`가 된다.
- 실제 드랍 후보 판정, 손님 도감 단계 게이지, 다음 단계 안내, `render_game_to_text`가 모두 공통 `GUEST_GRADES` 값을 사용한다.
- 150회 손님이 주·보조·특별 재료 3종을 모두 드랍 후보로 갖고, 성공 시 기존대로 그중 한 종류만 50/30/20 비율로 선택되는 것을 확인했다.
- 손님 등급, 15% 드랍 확률, 도감 UI 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 단계값 `1/40/150`과 콘솔 오류 없음 확인.
- 화면 확인: `output/customer-codex-clean-ui/01-clean-customer-profile.png`.

## 2026-08-05 극초반 기본 재료 및 괴식 보호

- 새 게임 시작 시 `나뭇잎 1개 + 양상추 1개`를 기본 지급하도록 변경했다. 두 재료로 첫 신규 레시피인 새싹 샐러드를 바로 발견할 수 있다.
- 기본 재료는 저장 데이터에 지급 완료 상태를 함께 기록해 새로고침할 때 중복 지급되지 않는다.
- 기존 저장 데이터는 발견 레시피가 기본 샐러드 1종뿐인 경우에만 기본 재료를 한 번 보충하고, 이미 진행된 저장에는 추가 지급하지 않는다.
- 신규 레시피를 하나도 발견하지 않은 상태에서 수동 조합에 실패하면 연구 연출은 유지하되 사용 재료를 전부 반환한다.
- 보호 중인 실패는 괴식 연출·괴식 기록·실패 횟수에 포함하지 않으며, 기존 조건에 맞는 조합이면 힌트는 정상적으로 남긴다.
- 첫 신규 레시피 발견 후 보호가 즉시 종료되어 이후 실패는 기존대로 재료를 소비하고 괴식이 된다.
- 설치 순서, 손님 초대, 힌트 등장 조건 자체는 변경하지 않았다.
- 시작 재료 지급/중복 방지, 보호 실패 환급, 새싹 샐러드 발견, 보호 종료 후 괴식, 재료 보관함과 기존 연구 흐름 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 시작 재료 2개, 보호 상태 활성화, 콘솔 오류 없음 확인.
- 화면 확인: `output/starter-recipe-protection/01-starter-ingredients.png`, `02-first-failure-refunded.png`, `03-first-new-recipe.png`, `04-normal-weird-dish-after-discovery.png`.

## 2026-08-05 첫 실패 재료 반환 철회

- 실패 시 재료를 잃는 규칙을 처음부터 학습해야 한다는 피드백에 따라 첫 신규 레시피 전의 재료 반환 예외를 제거했다.
- 기본 지급되는 `나뭇잎 1개 + 양상추 1개`는 유지한다.
- 첫 시도라도 잘못 조합하면 연구에 사용한 재료가 사라지고 괴식 연출·실패 횟수·연구 기록이 정상적으로 남는다.
- 실패 조합에 맞는 기존 힌트가 있으면 괴식과 함께 힌트도 계속 발견된다.
- 새싹 샐러드를 정상 발견하는 흐름과 이후 괴식, 자동 연구 괴식, 보관함 회귀 테스트를 통과했다.
- 공식 `develop-web-game` 클라이언트에서 시작 재료 2개와 콘솔 오류 없음 확인.
- 화면 확인: `output/starter-recipe-learning/01-starter-ingredients.png`, `02-first-failure-consumes.png`, `03-first-new-recipe.png`, `04-normal-weird-dish-after-discovery.png`.

## 2026-08-05 단계별 다중 레시피 힌트

- 실패 조합의 힌트 공개 기준을 재료 칸 수에 따라 `2개 중 1개 / 3개 중 2개 / 4개 중 2개 / 5개 중 3개` 일치로 변경했다.
- 재료 종류가 아니라 중복을 포함한 실제 재료 칸 수로 일치 여부를 계산한다.
- 한 번의 조합이 기준을 만족하는 미발견 레시피가 여러 개라면 가장 가까운 하나만 고르지 않고 조건을 만족한 레시피를 모두 공개한다.
- 예를 들어 `나뭇잎 + 쌀` 실패 조합은 두 재료 중 하나를 포함하는 2재료 레시피 힌트 6개를 동시에 공개한다.
- 각 레시피는 이전 힌트와 새로 맞힌 재료 칸을 누적한다. 이미 공개한 재료 칸만 다시 맞힌 경우 저장 정보와 힌트 알림을 갱신하지 않는다.
- 5재료 햄버거는 `빵+소고기+치즈`로 최초 공개된 뒤 `빵+소고기+토마토`를 시도하면 토마토만 추가 공개되고, 같은 시도를 반복하면 추가 힌트 알림이 나오지 않는다.
- 힌트가 여러 개여도 실패 연구는 기존 규칙대로 괴식이 되고 사용한 재료를 모두 소비한다.
- 5재료 힌트 카드에서 슬롯이 가로로 잘리던 문제를 수정해 여러 줄로 자연스럽게 배치한다.
- 검증:
  - `node tools/verify-progressive-multi-recipe-hints.mjs` → `PROGRESSIVE_MULTI_RECIPE_HINTS_OK firstMulti=6 thresholds=1/2/2/3 progressiveBurger=4 repeatSilent=true`
  - 기존 단일 재료 힌트, 힌트 저장/완성, 괴식/자동 연구, 첫 재료 학습 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트의 `render_game_to_text`에서 다중 공개와 기준값 `1/2/2/3`, 콘솔 오류 없음 확인
- 화면 확인: `output/progressive-multi-recipe-hints/01-progressive-multi-hints.png`, `output/official-progressive-multi-hints/shot-0.png`.

## 2026-08-05 설비 연동 레시피·재료 드랍 튜토리얼

- 레시피 시스템의 해금 조건을 `도마 테이블(시설 타입 8) 설치 완료`로 변경했다.
- 설치 전 하단 레시피 버튼은 채도가 낮아지고 자물쇠가 표시된다. 버튼을 누르면 메뉴가 열리지 않고 주인공 요리사 병아리가 필요한 설비를 알려준다.
- 도마 테이블 설치 직후 레시피 버튼이 활성화되고 `이제 새로운 레시피를 연구해 봐요` 대사가 표시된다.
- 해당 대사를 누르면 다음 단계인 냉장고 설치 안내로 자연스럽게 이어진다.
- 손님의 재료 드랍 판정은 `냉장고(시설 타입 6) 설치 완료` 전에는 실행하지 않는다. 드랍 시도 횟수와 확률 판정도 발생하지 않는다.
- 냉장고 설치 직후 `이제 손님에게서 재료를 얻을 수 있어요` 대사가 표시되고, 이후 식사를 마친 손님부터 기존 15% 드랍 판정을 실행한다.
- 새 게임에는 짧은 시작 대사를 표시하고, 기존 저장 데이터에는 시작 대사를 강제로 다시 띄우지 않는다. 해금 대사 진행 상태는 저장된다.
- 말풍선은 화면의 요리사 병아리를 가리키며 `눌러서 계속`으로 닫거나 다음 대사로 진행한다. 도마·냉장고 설치 토스트와 중복되지 않게 정리했다.
- `render_game_to_text`에 레시피/드랍 해금 여부, 해금 설비, 현재 튜토리얼 대사를 추가했다.
- 검증:
  - `node tools/verify-facility-tutorial-unlocks.mjs` → `FACILITY_TUTORIAL_UNLOCKS_OK recipe=countertop drops=fridge dialogue=chef beforeDropAttempts=0 afterDropAttempts=1`
  - 냉장고 설치 후 600회씩 3구간 드랍 표본에서 기존 15% 확률과 50/30/20 슬롯 규칙 유지 확인
  - 직접 열기 핵심 영업, 하단 메뉴/냉장고 보관함, 레시피 힌트·괴식·기본 재료 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 잠긴 레시피 화면 유지, 도마/냉장고 해금 상태, 콘솔 오류 없음 확인
- 화면 확인: `output/facility-tutorial-unlocks/01-recipe-locked-dialogue.png`, `02-countertop-recipe-unlocked.png`, `03-fridge-next-dialogue.png`, `04-fridge-drop-unlocked.png`.

## 2026-08-05 메인 영업 토스트 정리

- 반복 영업 중 화면 변화와 HUD로 충분히 확인할 수 있는 토스트를 제거했다.
- 토스트 없이 처리되는 반복 행동은 `일반 손님 도착 / 주문 접수 / 음식 전달 / 재료 직접 수집 / 도토리 직접 회수 / 팁 직접 회수` 6종이다.
- 신규 레시피 발견은 이미 전용 짜잔 연출이 있으므로 중복으로 표시되던 완성 토스트를 제거했다. 레벨업도 기존 전용 가격 상승 카드만 유지한다.
- 손님을 직접 달랜 직후의 성공 토스트도 제거하고 손님 상태 변화와 결제 생성으로 피드백을 통일했다.
- 계속 유지하는 중요 토스트는 `희귀 재료 필드 드랍 / 재료 보관함 가득 참 / 재화 부족 / 손님 불만 및 화난 이탈 / 특별 손님·도둑 / 설비·테마·보관함 해금과 구매 / 레시피 실패 힌트`다.
- `render_game_to_text`에 현재 토스트 표시 여부와 반복 무음 이벤트 목록을 추가했다.
- 검증:
  - `node tools/verify-important-toast-policy.mjs` → `IMPORTANT_TOAST_POLICY_OK routine=6-silent important=ingredient-drop-visible`
  - 손님 도착부터 주문·조리·식사·도토리 회수까지 전체 루프에서 토스트가 한 번도 나타나지 않음을 확인했다.
  - 냉장고 해금 후 재료 드랍이 실제 발생하면 `기본 병아리가 나뭇잎을 떨어뜨렸어요` 중요 토스트가 남는 것을 확인했다.
  - 직접 열기 핵심 영업, 설비 튜토리얼, 다중 레시피 힌트, 재료 보관함 가득 참/확장 회귀 테스트 통과.
  - 공식 `develop-web-game` 클라이언트에서 반복 무음 정책과 콘솔 오류 없음 확인.
- 화면 확인: `output/important-toast-policy/01-routine-service-no-toast.png`, `02-important-drop-toast.png`, `output/official-important-toast-policy/shot-0.png`.

## 2026-08-05 신규 손님 첫 방문 강조 토스트

- 해금된 일반 손님이 식당에 실제로 처음 등장하는 순간에만 신규 손님 전용 강조 토스트를 표시한다.
- 강조 토스트는 일반 검은 토스트와 다른 금색 카드 형태이며 손님 아이콘, `새로운 손님 첫 방문!`, 손님 이름, `손님 도감에 등록됐어요`, `NEW` 배지를 함께 표시한다.
- 테마 화면에서 이름을 미리 확인한 시점이 아니라 손님 도감의 방문 기록이 처음 생성되는 실제 방문 시점을 기준으로 한다.
- 같은 손님이 두 번째부터 방문할 때는 앞서 정리한 정책대로 도착 토스트를 표시하지 않는다.
- 기존 저장에서 이미 도감에 등록된 손님은 다시 신규 손님 토스트를 띄우지 않는다.
- 일반 토스트가 다음에 표시될 때는 신규 손님 전용 클래스와 내용이 초기화되어 다른 알림 스타일에 영향을 주지 않는다.
- `render_game_to_text.toast.variant`로 현재 토스트가 `first-guest`인지 확인할 수 있다.
- 검증:
  - `node tools/verify-first-guest-toast.mjs` → `FIRST_GUEST_TOAST_OK first=highlighted repeat=silent icon=base-chick`
  - `node tools/verify-important-toast-policy.mjs` → 반복 방문·주문·음식 전달 무음 및 중요 재료 드랍 토스트 유지
  - 직접 열기 핵심 영업, 손님 도감 45종/등급 UI, 설비 해금 튜토리얼 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 토스트 상태 출력과 콘솔 오류 없음 확인
- 화면 확인: `output/first-guest-toast/01-first-guest-highlight.png`, `03-repeat-guest-silent.png`, `output/official-first-guest-toast/shot-0.png`.

## 2026-08-05 보석 기반 보울 용량 확장

- 레시피 발견 수에 따라 보울 용량이 자동으로 늘어나던 규칙을 제거했다.
- 새 게임은 보울 2칸으로 시작하고, 레시피 제작 화면의 `보울 확장`에서 보석 10개를 사용해 1칸씩 늘릴 수 있다.
- 현재 레시피 최대 조합 수에 맞춰 보울 최대 용량은 5칸이며, 최대치에서는 버튼이 `최대 용량`으로 바뀐다.
- 레시피를 5개 이상 발견해도 보울은 자동 확장되지 않고, 자동 요리 연구 역시 현재 구매한 보울 용량만 사용한다.
- 저장 버전을 12로 올리고 보울 용량을 저장한다. 이전 버전 저장은 기존 레시피 수로 이미 열렸던 용량을 계산해 보존한 뒤 새 규칙으로 이관한다.
- `render_game_to_text`에 초기/현재/최대 용량과 보석 비용, `gem-upgrade-only` 성장 규칙을 추가했다.
- 검증: `node tools/verify-gem-bowl-capacity.mjs` → `GEM_BOWL_CAPACITY_OK initial=2 cost=10 increment=1 max=5 recipesDoNotGrow=true persistence=true legacy=preserved`.
- 2칸·5칸 보울 화면 확인: `output/gem-bowl-capacity/01-two-slot-bowl.png`, `02-five-slot-bowl.png`.

## 2026-08-05 신규 병아리 전용 알림 분리

- 신규 병아리 첫 방문 카드를 일반 토스트 DOM과 완전히 분리했다.
- 일반 토스트는 기존 상단 중앙 위치를 유지하고, 신규 병아리 카드는 더 아래의 오른쪽 상단 영역에서 4초간 독립적으로 표시된다.
- 테마 구매 등 다른 알림이 동시에 발생해도 두 알림이 함께 남으며 서로의 표시 시간을 덮어쓰지 않는다.
- 신규 병아리가 연속으로 처음 방문하면 전용 카드끼리만 순서대로 표시한다. 반복 방문은 계속 무음이다.
- `render_game_to_text.newGuestAlert`로 전용 알림의 표시 여부, 내용, 대기 수를 확인할 수 있다.
- 검증: `node tools/verify-first-guest-toast.mjs` → `FIRST_GUEST_TOAST_OK first=separate regular=simultaneous repeat=silent icon=base-chick`.
- 동시 표시 화면 확인: `output/first-guest-toast/02-simultaneous-separate-alerts.png`.

## 2026-08-05 원하는 손님 초대 · 특별 홍보

- 특별 홍보는 레시피 5개 전에는 버튼 자체가 노출되지 않는다.
- 레시피 5개를 발견하면 주인공 요리사 병아리의 `특별 홍보` 튜토리얼 대사가 예약된다. 대사를 직접 넘긴 뒤에만 홍보하기 위에 작은 특별 홍보 버튼이 생긴다.
- 특별 홍보 재료 선택창에는 현재 테마 진척도로 해금된 병아리와 각 병아리의 현재 방문 등급에서 이미 열린 주/보조/특별 재료만 표시한다. 잠긴 병아리와 아직 방문 등급이 부족한 재료는 노출하지 않는다.
- 재료명 또는 손님 이름으로 검색할 수 있고, 각 재료에 대응하는 해금 손님 종류 수도 표시한다. 재료 증가에 대비해 3열 스크롤 목록으로 구성했다.
- 재료를 선택하면 가능한 좌석을 해당 재료 손님으로 즉시 채우고 최소 3명을 초대 대기열에 넣는다. 활성 중 일반 홍보로 추가된 손님도 같은 재료 대상만 고른다.
- 초대 대기열에는 선택 재료를 함께 저장해 1분 종료 직전에 초대한 손님도 다른 손님으로 바뀌지 않는다. 특별 손님/도둑은 대상 홍보 중 출현 후보에서 제외한다.
- 효과는 60초이며 특별 홍보 버튼에 재료 아이콘과 `1:00` 실시간 카운트다운을 표시한다. 종료 후 `재사용 0:30` 쿨타임을 표시하고 30초가 지나면 다시 사용할 수 있다.
- 활성/쿨타임은 저장되고, 게임을 닫아둔 실제 시간도 다음 로드에서 차감한다. 저장 버전은 13으로 올렸다.
- `render_game_to_text.specialPromotion`에 해금 조건, 튜토리얼 완료 여부, 대상 재료, 남은 시간, 쿨타임, 선택 가능한 재료/손님 목록을 추가했다.
- 검증:
  - `node tools/verify-special-promotion.mjs` → `SPECIAL_PROMOTION_OK recipes=5 tutorial=required target=달걀 duration=60 cooldown=30 filter=unlocked-only`
  - 직접 열기 핵심 영업, 설비 튜토리얼, 신규 손님 전용 알림, 레시피 조합, 보울 확장, 중요 토스트 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 초기 비노출 상태와 상태 출력, 콘솔 오류 없음 확인
- 화면 확인: `output/special-promotion/01-five-recipes-tutorial.png`, `02-ingredient-search.png`, `03-active-target-promotion.png`, `04-cooldown.png`.
- 향후 재료가 훨씬 많아질 경우 최근 선택/즐겨찾기 상단 고정 탭을 추가할 수 있다. 현재 프로토타입은 이름·손님 검색으로 먼저 대응한다.

## 2026-08-05 특별 홍보 튜토리얼 노출 수정

- 실제 다섯 번째 레시피 발견 흐름을 재현해, 튜토리얼 상태는 생성되지만 레시피 메뉴가 계속 열려 있어 주인공 말풍선을 가리는 문제를 확인했다.
- 이제 다섯 번째 레시피 발견 연출의 `짜잔!`을 누르거나 연출이 자동 종료되면 레시피 메뉴도 함께 닫히고 레스토랑 화면에서 특별 홍보 튜토리얼이 즉시 표시된다.
- 대사를 누르기 전까지 특별 홍보 버튼은 계속 숨겨지고, 대사를 확인한 뒤에만 버튼이 나타나는 기존 해금 조건은 유지한다.
- 60초 효과와 30초 쿨타임의 부동소수점 잔여값도 0으로 정리해 카운트다운 경계에서 버튼이 한 프레임 늦게 바뀌는 문제를 함께 수정했다.
- `tools/verify-special-promotion.mjs`를 저장 데이터 직접 주입 방식에서 실제 `4개 보유 → 수동 조합으로 5번째 발견 → 발견 연출 닫기 → 메뉴 자동 종료 → 말풍선 노출` 흐름으로 강화했다.
- 검증: 특별 홍보 전체 흐름, 직접 열기 영업, 기존 설비 튜토리얼, 2~5재료 레시피 조합, 중요 토스트 회귀 테스트 통과. 공식 클라이언트 콘솔 오류 없음.
- 화면 확인: `output/special-promotion/01-five-recipes-tutorial.png`.

## 2026-08-06 재료별 드랍 손님 확인 팝업

- 특별 홍보 재료를 눌러도 즉시 홍보가 시작되지 않고, 작은 재료 출처 팝업이 먼저 열린다.
- 팝업에는 재료 보유량, 해당 재료를 드랍하는 해금 손님의 실제 아이콘과 이름, 주/보조/특별 재료 구분, 드랍 성공 시 슬롯 비율을 표시한다.
- 방문 등급이 부족한 슬롯도 출처로는 보여주되 `40회 방문 시` 또는 `150회 방문 시`로 잠금 조건을 표시한다. 실제 특별 홍보 대상에는 지금 획득 가능한 손님만 계속 포함한다.
- 팝업의 `이 재료로 홍보`를 눌러야 기존 60초 특별 홍보가 시작된다. 바깥 영역/닫기 버튼 및 검색어 변경 시 상세 팝업이 닫힌다.
- `render_game_to_text.specialPromotion.detail`에 선택한 재료와 출처 손님 상태를 추가했다.
- 검증: `node tools/verify-special-promotion.mjs` → `SPECIAL_PROMOTION_OK recipes=5 tutorial=required target=당근 source-popup=1 duration=60 cooldown=30 filter=unlocked-only`.
- 화면 확인: `output/special-promotion/03-carrot-source-popup.png`. 현재 데이터에서 당근은 해금된 화분 병아리의 주재료로 표시된다.
- 공식 `develop-web-game` 클라이언트도 실행해 초기 게임 상태 출력과 캔버스 렌더링을 확인했다. 새 브라우저 콘솔 오류는 없었다.

## 2026-08-06 테스트용 디버그 팝업

- 오른쪽 상단 초기화 버튼 바로 아래에 작은 `DEBUG` 버튼을 추가했다. 누르면 일반 플레이를 가리지 않는 작은 테스트 도구 팝업이 열린다.
- `초기 설비 전체 설치`는 현재 레스토랑의 초기 설치 대상 19개를 비용 없이 한 번에 설치한다. 이미 설치된 설비는 중복되지 않으며 도마 테이블·냉장고를 포함한 관련 시스템도 즉시 사용할 수 있다.
- 재화 종류(도토리·아이디어·보석·스티커)와 원하는 양을 직접 입력해 추가할 수 있다. 0 이하/잘못된 입력은 거부하고, 결과는 즉시 HUD와 저장 데이터에 반영된다.
- 디버그 적용 결과는 재접속 후에도 유지된다. 게임 초기화 시 디버그 팝업은 닫힌 상태로 돌아간다.
- `render_game_to_text.debug`에 팝업 표시 여부와 설치 완료 수, 지원 재화 목록을 추가했다.
- 검증: `node tools/verify-debug-panel.mjs` → `DEBUG_PANEL_OK install=19/19 acorns=+12345 ideas=+321 gems=+17 stickers=+9 persisted=yes`.
- 특별 홍보 전체 흐름 회귀 테스트도 통과했다. 공식 `develop-web-game` 클라이언트에서 DEBUG 버튼 클릭 및 `panelVisible: true` 상태를 확인했다.
- 화면 확인: `output/debug-panel/01-debug-panel.png`, `02-resources-and-install-all.png`.

## 2026-08-06 상단 아이디어 재화 표시 제거

- 상단 HUD의 아이디어 아이콘과 수량 표시를 제거해 도토리와 보석만 남겼다.
- 기존 저장 데이터의 아이디어 값은 호환성을 위해 보존하며, 화면 요소를 참조하던 HUD 갱신 코드만 함께 제거했다.
- 검증: 디버그 팝업 전체 설치·재화 추가·재접속 유지 테스트 통과. 상단 두 재화와 DEBUG 버튼 배치를 `output/debug-panel/01-debug-panel.png`에서 확인했다.
- 공식 `develop-web-game` 클라이언트로 초기 상태와 콘솔 오류 없음도 재확인했다.

## 2026-08-06 레시피 발견 동기 가격 재조정

- 샐러드 40원을 기준으로 초반 발견 레시피 15개의 가격을 직접 재조정했다: 새싹 샐러드 45, 버섯전 48, 샌드위치 52, 양상추 샌드위치 50, 버섯 토스트 52, 토마토 샌드위치 54, 달걀 샌드위치 56, 토마토 달걀볶음 56, 버터 토스트 60, 버터빵 72, 달걀밥 65, 버터 라이스 68, 토마토 리조또 78, 스마일 계란후라이 80.
- 지정 가격이 없는 나머지 레시피에는 `필요 재료의 최초 획득 단계 + 조합 재료 수` 기반 최소 가격을 적용한다. 기존 가격이 최소 가격보다 높으면 기존 값을 유지한다.
- 2재료 가격 하한은 획득 단계에 따라 40 → 45 → 55 → 65 → 80 → 95원으로 상승하고, 3번째 재료부터 재료 하나당 12원을 더한 뒤 5원 단위로 올림한다. 후반부는 테마 진행에 따라 하한이 추가 상승한다.
- 기본 데이터와 직접 ID가 겹치는 샐러드·샌드위치도 프로토타입 지정 가격을 우선하도록 `getRecipe` 가격 결정 방식을 정리했다.
- 레벨업 +10%, RestaurantPriceUp, 만족도, 공연 버프, 최종 가격 기준 팁 계산은 기존대로 유지한다.
- 검증:
  - `node tools/verify-recipe-price-progression.mjs` → `RECIPE_PRICE_PROGRESSION_OK early=15 floorFailures=0 salad=40 next=45 smile=80`
  - 초반 14종 가격, 발견 순서, 2~5재료 조합, 최종 판매가·팁 공식 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 실행 및 콘솔 오류 없음 확인
- 화면 확인: `output/recipe-price-progression/01-balanced-early-prices.png`.

## 2026-08-06 특수 손님 확장

- 테이블과 조리 설비가 설치되어 영업이 가능해진 뒤 플레이 시간 2분마다 도둑·재료 상인·바람의 요정·재료 교환상 중 한 명이 필드에 등장한다. 같은 종류가 바로 연속으로 나오지 않게 했다.
- 도둑은 기존처럼 접근 중 잡으면 훔친 팁을 되찾으며, 나머지 특수 손님은 필드에서 직접 눌러 30초 안에 상호작용한다.
- 재료 상인은 현재 해금된 손님에게서 실제로 획득 가능한 재료 중 최대 3종을 무작위로 골라 1~2개씩 판매한다. 보관 한도와 도토리 부족을 검사하고, 구매한 품목은 판매 완료로 표시한다.
- 바람의 요정은 60초 동안 전체 손님의 재료 드랍 확률을 15%에서 30%로 2배 올린다. 상단 별도 배지에 남은 시간을 표시하며, 재접속 시에도 실제 경과 시간을 차감한다.
- 재료 교환상은 보유 재료 2개와 다른 재료 1개를 교환한다. 15% 확률로 아직 현재 손님 구성에서는 획득할 수 없는 미래 재료를 제안하며, 이 경우 전용 희귀 제안 안내를 표시한다.
- 일반 홍보 손님 후보에서는 특수 손님을 제거해 2분 주기 시스템으로만 등장하게 했다.
- DEBUG 팝업에서 네 종류를 선택해 즉시 등장시키는 테스트 기능을 추가했다.
- `render_game_to_text`에 특수 손님 주기·다음 등장 시간·요정 배율/남은 시간·미획득 재료 제안 확률·현재 손님/거래 상태를 추가했다.
- 검증:
  - `node tools/verify-special-visitors.mjs` → `SPECIAL_VISITORS_OK interval=120 merchant=unlocked-only fairy=15%->30% tradeFuture=15% thief=catchable`
  - 재료 드랍 15%, 특별 홍보, 디버그 저장 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트로 캔버스·상태 출력·콘솔 오류 없음 확인
- 화면 확인: `output/special-visitors/01-material-merchant.png`, `02-wind-fairy-buff.png`, `03-future-material-trade.png`.

## 2026-08-06 특수 손님 설명 팝업 통일

- 모든 특수 손님은 필드에서 눌렀을 때 같은 전용 안내 팝업을 연다. 팝업에는 실제 병아리 아이콘, 손님 이름, 역할 설명, 효과/거래 내용과 행동 버튼을 표시한다.
- 도둑은 클릭 즉시 잡히지 않고 `팁을 훔치는 손님`이라는 설명을 확인한 뒤 `도둑 잡기`를 눌러야 잡힌다.
- 바람의 요정은 `1분간 15% → 30%` 효과를 확인한 뒤 `도움 받기`를 눌러야 드랍 확률 2배 효과가 시작된다.
- 재료 상인과 교환상도 각각 무작위 재료 판매, 재료 2개 → 1개 교환이라는 역할을 팝업 첫 문장에 명시했다.
- 팝업이 열리면 도착 토스트를 닫아 같은 안내가 두 위치에 겹치지 않게 했다. 닫기 버튼을 누르면 효과나 거래 없이 특수 손님이 떠난다.
- 팝업을 연 상태로 재접속해도 특수 손님이 상호작용 상태에 갇히지 않고 다시 기다리도록 저장 복구를 보완했다.
- `render_game_to_text.specialVisitor`에 현재 팝업 제목과 설명을 추가했다.
- 검증: 특수 손님 전체 흐름, 재료 드랍 15%, 특별 홍보, 디버그 기능 회귀 테스트 통과. 공식 `develop-web-game` 클라이언트의 캔버스·상태 출력·콘솔 오류 없음 확인.
- 화면 확인: `output/special-visitors/02-wind-fairy-popup.png`, `04-thief-popup.png`.

## 2026-08-06 재료 상인 가격·도착 상호작용 조정

- 기존 재료 상인 가격이 개당 15원부터 시작해 샐러드 1회 판매가 40원보다도 낮았던 문제를 수정했다.
- 재료의 가장 빠른 획득 단계로 개당 가격을 계산한다. 1테마 기본 120원, 2테마 300원, 3테마 1,200원이며 4테마부터 테마가 하나 늦어질 때마다 2배가 된다.
- 같은 테마 안에서도 늦게 열리는 손님/방문 단계 재료는 단계당 8%가 붙고, 최종 개당 가격은 10원 단위로 반올림한다. 초반 실제 상품은 나뭇잎 120원, 버섯 140원, 밀가루 160원 수준으로 확인했다.
- 수량 2개 상품은 개당 가격의 정확히 2배를 받고, 상품 카드에 `보유 수량 · 개당 가격`을 표시한다. 저장되어 있던 기존 상인의 15원 상품도 불러올 때 새 가격으로 다시 계산한다.
- 도둑을 제외한 재료 상인·바람의 요정·재료 교환상은 `approaching` 이동 중 필드 터치를 무시한다. 목적지에 도착해 `waiting` 상태가 된 뒤에만 상호작용 표시와 팝업이 활성화된다.
- 도둑은 예외로 이동 중에도 계속 터치해서 잡을 수 있다.
- `render_game_to_text`에 상인의 단계별 가격 규칙과 각 특수 손님의 현재 필드 상호작용 가능 여부를 추가했다.
- 검증: `SPECIAL_VISITORS_OK interval=120 merchant=progression-priced-arrival-only fairy=15%->30% tradeFuture=15% thief=catchable-in-motion`. 재료 드랍, 특별 홍보, 디버그 회귀 테스트도 통과했다.
- 화면 확인: `output/special-visitors/01-material-merchant.png`.

## 2026-08-06 레시피 가격 연동 조리 시간

- 프로토타입 레시피가 재사용한 유니티 아이콘의 원본 `cookTime`을 그대로 물려받던 문제를 제거했다. 예를 들어 48원짜리 버섯전이 원본 360원 음식의 21초 조리 시간을 사용하고 있었다.
- 이제 레벨 1 기본 조리 시간은 현재 기본 판매가로 계산한다: `2초 + 기본 판매가 ÷ 20`, 0.5초 단위 반올림, 최소 4초·최대 24초.
- 샐러드 40원은 4초, 버섯전 48원은 4.5초, 80원 요리는 6초, 최고가 455원 요리는 24초가 된다. 64개 레시피 전체에서 가격이 오르는데 기본 조리 시간이 감소하는 역전이 없음을 검사했다.
- 레벨업 가격 +10%와 기존 등급별 조리 단축은 성장 보상으로 유지했다. 즉 같은 레시피를 강화하면 더 비싸게 팔면서 더 빨리 조리된다.
- 레시피 보유 목록에 `현재 가격 · 조리 시간`을 함께 표시하고, 다음 줄에 레벨업 가격 증가와 조리 단축을 명시했다.
- 저장 당시 진행 중이던 요리는 새 조리 시간으로 변환하되 기존 진행률을 그대로 보존한다.
- `render_game_to_text.recipes`에 조리 시간 공식과 보유 레시피별 기본 가격·기본/현재 조리 시간을 추가했다.
- 검증:
  - `COOKING_PRICE_BALANCE_OK recipes=64 salad=40/4s mushroom=48/4.5s highest=455/24s`
  - 레시피 가격 진행, 최종 판매가·팁 공식, 1회 홍보 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트에서 조리 공식 상태와 캔버스, 콘솔 오류 없음 확인
- 화면 확인: `output/cooking-price-balance/01-price-linked-times.png`.

## 2026-08-06 야외 뷔페 방치 공간

- 발견한 레시피가 8개가 되면 주인공 요리사 병아리의 `야외 뷔페` 안내 대화가 먼저 등장한다. 대화를 확인한 뒤에만 레스토랑 오른쪽 이동 화살표와 뷔페 공간이 해금된다.
- 레스토랑과 동일한 야외 배경을 이어 쓰는 별도 공간을 추가했다. 화살표로만 왕복하며, 뷔페 화면에서는 홍보 버튼을 숨겨 공간 기능과 겹치지 않게 했다.
- 뷔페에는 2개의 진열대를 두었다. 발견한 레시피를 직접 선택해 올릴 수 있고, 같은 레시피를 두 진열대에 중복 진열할 수는 없다.
- 각 진열 레시피는 현재 레벨 판매가의 10%를 분당 기본 수익으로 만든다. 발견 레시피가 8개를 넘을 때마다 전체 뷔페 수익에 1% 수집 보너스가 붙는다.
- 수익은 1분마다 뷔페 계산대에 쌓이며 계산대를 눌러 도토리로 정산한다. 오프라인 보상은 마지막 저장 이후 최대 2시간, 1분 단위로 계산하고 별도 정산 팝업에서 받는다.
- 식사를 마친 일반 손님은 보통 50%, 만족 손님은 80% 확률로 뷔페를 이어서 방문한다. 진열대를 구경한 뒤 보통 25%, 만족 손님은 55% 확률로 해당 레시피 현재 가격의 25%를 추가 지불한다.
- `render_game_to_text.buffet`에 해금 조건, 지역, 진열 레시피/분당 수익, 수집 보너스, 다음 정산 시간, 계산대 금액, 오프라인 정산, 방문 손님 상태와 확률 규칙을 추가했다.
- 검증:
  - `node tools/verify-outdoor-buffet.mjs` → `OUTDOOR_BUFFET_OK recipes=8 stands=2 perMinute=9 offline=1080 visitorPurchase=yes`
  - 조리 시간·특수 손님·디버그·1회 홍보 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 실행, 상태 출력 및 콘솔 오류 없음 확인
- 화면 확인: `output/outdoor-buffet/01-eight-recipes-story.png`, `02-empty-buffet.png`, `03-recipe-displays.png`, `04-offline-reward.png`, `05-post-meal-visitor.png`.
- 추후 검토: 실제 밸런스 플레이 결과에 따라 진열 레시피별 10% 분당 수익, 손님 추가 구매 확률, 2시간 오프라인 상한을 조정할 수 있다.

## 2026-08-06 야외 뷔페 진열대 단계 확장

- 뷔페 최초 해금 시 진열대를 2개에서 4개로 늘렸다. 레시피 8개를 발견한 시점부터 보유 레시피의 절반을 바로 진열할 수 있다.
- 이후 발견 레시피 12·16·20·24개 달성 시 진열대가 한 칸씩 자동 확장되어 최대 8칸이 된다. 해금 규칙은 `8개=4칸 → 12개=5칸 → 16개=6칸 → 20개=7칸 → 24개=8칸`이다.
- 확장 전 진열했던 레시피는 그대로 유지된다. 새 레시피 발견으로 진열대가 늘어나는 경우 레시피 발견 연출에 `뷔페 진열대 +1` 정보를 함께 표시한다.
- 뷔페 간판에 현재 진열 칸 수와 다음 확장 조건을 표시하고, 진열대 선택 메뉴에도 다음 레시피 목표를 표시한다.
- 4칸은 넓은 2×2 배치, 5~6칸은 3열 배치, 7~8칸은 3단 배치로 자동 재정렬한다. 계산대와 요리사 병아리도 진열대와 겹치지 않도록 이동했다.
- 방치 수익·오프라인 보상은 현재 해금되어 실제로 진열 가능한 칸만 계산한다.
- 검증:
  - `node tools/verify-outdoor-buffet.mjs` → `OUTDOOR_BUFFET_OK recipes=8->24 stands=4->8 perMinute=80 offline=9600 visitorPurchase=yes`
  - 64개 레시피 조합, 특수 손님, 조리 시간, 1회 홍보 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 실행 및 콘솔 오류 없음 확인
- 화면 확인: `output/outdoor-buffet/02-empty-buffet.png`, `03-recipe-displays.png`, `04-max-expansion.png`, `06-post-meal-visitor.png`.

## 2026-08-06 재료 획득 DEBUG

- DEBUG 팝업에 `재료 획득` 도구를 추가했다. 프로토타입에서 사용하는 재료 78종을 이름과 이모지로 선택하고 원하는 수량을 직접 입력할 수 있다.
- 테스트 수량이 현재 재료 보관함 한도를 넘으면 DEBUG에서만 보관함 용량을 해당 총량까지 자동 확장한다. 테스트 재료와 확장된 용량은 저장된다.
- 검증: `DEBUG_PANEL_OK install=19/19 acorns=+12345 ideas=+321 gems=+17 stickers=+9 ingredient=truffle+27 persisted=yes`.
- 화면 확인: `output/debug-panel/01-debug-panel.png`.

## 2026-08-06 요리 대회 콘텐츠

- 발견 레시피 6개 달성 시 주인공 요리사 병아리의 안내 대화 후 메인 화면 왼쪽에 `요리 대회` 버튼이 열린다.
- 대회에서는 발견한 기존 레시피 1개와 보유한 추가 재료 1개를 선택한다. 출품한 추가 재료는 실제로 1개 소비된다.
- 대회마다 취향이 다른 심사위원 3명이 등장한다. 기존 레시피에 선호 재료가 포함되면 +8점, 추가 재료가 심사위원 취향과 맞으면 +14점으로 더 크게 반영한다. 레시피 레벨·현재 가격·0~8점의 소량 변동도 최종 점수에 포함한다.
- 출품 후 2.8초 동안 별도 심사 연출이 진행되고, 결과에서 1~3등·총점·심사위원별 반응·상금을 확인한다. 모든 등수에 상금이 있으며 1등만 다음 대회 자격으로 기록된다.
- 대회 단계:
  - 동네 새싹 요리대회: 레시피 6개, 1등 상금 800
  - 숲속 요리축제: 레시피 12개 + 새싹 대회 1등, 1등 상금 5,000
  - 왕국 미식대회: 레시피 20개 + 숲속 축제 1등, 1등 상금 25,000
  - 별빛 그랑프리: 레시피 32개 + 왕국 대회 1등, 1등 상금 120,000
- 현지 날짜 기준 하루 첫 참가 1회는 무료다. 같은 날 추가 참가는 매회 보석 10개를 소비하며 횟수 제한 없이 테스트할 수 있다.
- 대회 진행·등수·누적 1등·일일 참가 횟수·최근 결과를 저장한다. `render_game_to_text.contest`에도 해금 조건, 대회별 참가 조건, 심사위원 힌트, 선택 조합, 심사 상태와 결과를 제공한다.
- 검증:
  - `COOKING_CONTEST_OK unlock=6 daily=1 free extra=10gems tierGate=recipe+previous-win firstPrize=800`
  - 재료 DEBUG, 야외 뷔페, 특별 홍보, 특수 손님, 64개 레시피 조합, 조리 시간, 일반 홍보 회귀 테스트 통과
  - 공식 `develop-web-game` 클라이언트 실행, 상태 출력 및 콘솔 오류 없음 확인
- 화면 확인: `output/cooking-contest/01b-contest-button.png`, `02-entry-selection.png`, `03-judging.png`, `04-first-place.png`, `05-next-tier.png`.
- 추후 검토: 실제 플레이 결과에 따라 각 대회의 1등 기준 점수와 상금, 추가 참가 보석 비용을 조정할 수 있다.

## 2026-08-06 DEBUG 나뭇잎 노출 수정

- 재료 78종이 ID 순서로 표시되어 나뭇잎이 39번째에 묻혀 있던 문제를 수정했다.
- DEBUG 재료 선택기에 `자주 쓰는 재료` 그룹을 만들고 나뭇잎을 첫 번째 기본 선택값으로 고정했다. 나머지 재료는 `전체 재료` 그룹에 기존 순서대로 유지한다.
- 검증: `DEBUG_PANEL_OK ... ingredient=leaf+27 persisted=yes`. 나뭇잎 27개 추가, 보관함 자동 확장, 재접속 저장을 확인했다.

## 2026-08-06 식당 노하우 마인드맵

- RPG식 `스킬` 대신 식당 운영 경험을 뜻하는 `식당 노하우`로 이름을 정하고, 하단 메뉴를 `테마 → 레시피 → 손님 → 노하우` 순서의 4개 버튼으로 확장했다. 유니티에서 복사해 둔 책 아이콘과 요리사 병아리 리소스를 메뉴에 사용했다.
- 레시피 연구 성공·괴식 모두 20 경험치, 손님 음식 조리 완료마다 5 경험치를 얻는다. 100 경험치마다 노하우 포인트 1개가 생기며 초과 경험치는 다음 게이지로 이어진다.
- 9개 노드를 선으로 연결한 드래그 가능 마인드맵을 추가했다. 선행 조건, 현재/다음 효과, 레벨, 1~3 포인트 비용, 습득 가능/잠김/완료 상태를 한 화면에서 확인한다.
- 자동 운영 가지: `척척 회수`는 레벨에 따라 5/3/1초마다 필드 재료·테이블 도토리·팁을 회수하고, `주문 척척`은 4/2.5/1초 대기 후 주문을 자동 접수하며, `입소문`은 30/15초마다 자동 홍보한다.
- 성장 가지: `단골의 선물`은 재료 드랍 확률을 레벨당 +3%p, `손에 익은 요리`는 조리 시간을 레벨당 -5%, `빠른 실험`은 연구 시간을 레벨당 -15%, `든든한 준비`는 뷔페 오프라인 상한을 레벨당 +1시간, `승부 요령`은 대회 상금을 레벨당 +10% 높인다.
- 저장 버전을 17로 올리고 기존 저장은 노하우 초기 상태로 안전하게 마이그레이션한다. 진행 경험치, 포인트, 노드 레벨, 자동화 타이머와 실제 효과를 저장한다.
- 검증:
  - `RESTAURANT_KNOWHOW_OK xp=research20/meal5 nodes=9 auto=collect+order+promotion drop=18% offline=3h contest=x1.1`
  - 하단 메뉴·괴식 연구·15% 기본 드랍·1회 홍보·조리 시간·최종 가격·특수 손님·대회·뷔페 회귀 테스트 통과
  - 공식 웹게임 Playwright 클라이언트 실행 및 상태 출력·스크린샷·콘솔 오류 없음 확인
- 화면 확인: `output/restaurant-knowhow/01-knowhow-map.png`, `02-upgraded-branches.png`, `03-automation-running.png`.

## 2026-08-06 노하우 마인드맵 위치 유지

- 노하우 노드를 선택하거나 레벨업해 상세 카드가 다시 그려질 때 마인드맵이 좌측 상단으로 돌아가던 문제를 수정했다.
- 다시 그리기 직전 마인드맵의 가로·세로 스크롤 값을 기억하고 새 화면에 즉시 복원한다. 메뉴를 닫았다 다시 열어도 현재 실행 중에는 마지막으로 보던 위치를 유지한다.
- 전용 테스트에서 `(190, 175)` 위치로 이동한 뒤 `든든한 준비` 노드를 선택해도 두 좌표가 그대로 유지되는 것을 확인했다. 전체 식당 노하우 테스트와 공식 웹게임 클라이언트 검증도 통과했다.

## 2026-08-07 노하우 마인드맵 트리 재배치

- 참고 이미지처럼 큰 설명 카드가 흩어진 형태 대신 72px 정사각형 아이콘 노드가 위에서 아래로 퍼지는 트리 구조로 재배치했다.
- 최상단 `식당 노하우`에서 첫 줄의 `자동 운영 / 재료 수급 / 요리 성장` 가지가 갈라지고, 다음 단계 노드는 각 가지 아래에 같은 간격으로 정렬된다.
- 대각선이 겹치던 연결선을 직각 꺾임 선으로 변경하고, 습득한 경로만 노란색으로 강조했다. 잠김·습득 가능·완료 상태 색상과 선택 상세 정보는 유지했다.
- 맵 높이를 470px로 늘려 9개 노드를 거의 한 화면에서 확인할 수 있게 했다. 노드 선택·레벨업 후 스크롤 위치 유지 기능도 그대로 동작한다.
- `RESTAURANT_KNOWHOW_OK` 전용 테스트, 위치 보존 검증, 공식 웹게임 클라이언트 및 콘솔 오류 검사를 통과했다. 화면 확인: `output/restaurant-knowhow/01-knowhow-map.png`.

## 2026-08-07 식당 노하우 장기 성장 구조

- 9개 다단계 노하우를 27개의 1회성 노하우로 교체했다. 모든 노드는 `미습득 → 습득 완료`만 가지며 같은 버튼을 반복 강화하지 않는다.
- 마인드맵은 한 화면 폭 안에 `자동 운영 / 재료 수급 / 요리 성장` 세 열이 함께 보이고, 각 열이 아래로 길게 이어지는 구조다. 자동 운영과 재료 수급은 각 7단계, 요리 성장은 12단계다.
- 자동 운영: 자동 회수 8→4→2초, 자동 주문 5→2초, 자동 홍보 45→25초.
- 재료 수급: 드랍 확률 +2%p/+2%p/+3%p, 보관함 +5/+5칸, 재료 상인 가격 -10%/-10%.
- 요리 성장: 조리 시간 -3%/-4%/-5%, 연구 시간 -10%씩 3회, 오프라인 보상 +1시간씩 2회, 대회 상금 +10%씩 2회, 뷔페 수익 +10%씩 2회.
- 손님 음식 조리 경험치를 +5에서 +1로 낮췄다. 포인트 요구 경험치는 `100 → 125 → 150 → 175…`처럼 획득 포인트마다 25씩 계속 증가한다. 연구 성공·괴식 경험치는 +20을 유지한다.
- 저장 버전을 18로 올렸다. 버전 17의 기존 다단계 노하우는 대응하는 1회성 노드와 새 선행 경로로 자동 변환되며 투자 효과를 잃지 않는다.
- 검증: `RESTAURANT_KNOWHOW_OK xp=research20/meal1 nodes=27 auto=collect+order+promotion drop=22% offline=4h contest=x1.2`. 100→125→150 경험치 증가, 전 노드 최대 1회, 저장 마이그레이션, 스크롤 위치 유지, 보관함·조리·드랍·상인·뷔페·대회 회귀 테스트와 공식 웹게임 클라이언트 검증을 통과했다.
- 화면 확인: `output/restaurant-knowhow/01-knowhow-map.png`, `01b-scroll-preserved.png`, `02-upgraded-branches.png`, `03b-automation-running.png`.

## 2026-08-07 재료 자동 정리·추가 드랍·팁 박스

- 식당 노하우를 38개의 1회성 노드로 세분화했다. 재료 수급 가지에는 `가끔 한 줌 더` 10단계를 추가해 단계마다 손님이 같은 재료를 1개 더 떨어뜨릴 확률이 0.5%p씩, 총 5%p 증가한다.
- 자동 운영을 각각 독립된 기능으로 분리했다. `도토리 정산`은 30초마다 테이블 결제 1건, `재료 정리`는 30초마다 필드 재료 1개를 회수한다. 뷔페 정산, 주문 접수, 실망 손님 달래기, 자동 홍보도 별도 노드로 길게 이어진다.
- 자동 정산은 팁 박스를 절대 회수하지 않는다. 팁 박스를 직접 누르면 전용 팝업에서 현재 팁과 용량을 확인하고 회수할 수 있다.
- 실망한 손님을 제외한 모든 손님은 최종 결제액의 10%를 팁으로 남긴다. 팁 박스 기본 용량은 500이며, 보석 10개로 용량을 500씩 확장한다.
- 저장 버전을 19로 올리고 기존 자동 회수 타이머와 노하우 투자를 새 분리형 구조로 이전한다.
- 검증: `RESTAURANT_KNOWHOW_OK ... nodes=38`, `TIPBOX_SYSTEM_OK ...`, `RESTAURANT_PRICE_FORMULA_OK ...` 통과. 화면 확인: `output/restaurant-knowhow/01-knowhow-map.png`, `output/tipbox-system/01-tipbox-popup.png`.

## 2026-08-07 자동 운영 성장 단계 확장

- 자동 운영 가지를 8개에서 18개의 1회성 노드로 늘리고 전체 노하우를 48개로 확장했다.
- 도토리 자동 정산, 필드 재료 자동 획득, 자동 홍보는 각각 `30초 → 20초 → 10초`로 성장한다. 각 실행은 한 번에 대상 1개만 처리한다.
- 뷔페 자동 정산은 `60초 → 40초 → 20초`, 자동 주문과 실망 손님 달래기는 `5초 → 2초 → 1초`로 성장한다.
- 저장 버전을 20으로 올렸다. 버전 19에서 이미 습득한 자동화는 기존 속도와 기능을 그대로 보존하며 새 속도 단계는 무료로 지급하지 않는다.
- 검증에서 각 30/20/10초 단계 값을 개별 확인했다. 최대 단계에서는 9초 동안 실행되지 않고 10초가 지난 뒤 도토리 1건·재료 1개·홍보 1회만 실행되는 것을 확인했다.
- `RESTAURANT_KNOWHOW_OK ... nodes=48 auto=payment10s+ingredient10s+promotion10s`, 팁 박스, 하단 UI, 통합 식당 회귀 테스트와 공식 웹게임 클라이언트 검증을 통과했다. 화면 확인: `output/restaurant-knowhow/01-knowhow-map.png`.

## 2026-08-07 팁 박스 필드 표시 겹침 수정

- 화면 오른쪽의 팁 박스 수치가 지역 이동 화살표에 가려지던 문제를 수정했다.
- 74px 배지를 팁 박스 가운데에 두던 배치에서, 팁 박스 왼쪽의 104px 배지로 이동했다.
- 메인 화면 표시도 현재 팁만 보여주던 방식에서 `현재 팁 / 최대 용량`으로 변경해 팝업을 열지 않아도 용량을 확인할 수 있다.
- `450 / 500` 배지의 오른쪽 끝이 화살표 영역보다 왼쪽에 있는지 자동 검증했다. 팁 박스 팝업·보석 확장·직접 회수 테스트와 공식 웹게임 클라이언트도 통과했다.
- 화면 확인: `output/tipbox-system/00-tipbox-field-badge.png`.

## 2026-08-07 화면 이동 화살표 위치 조정

- 팁 배지를 설비에서 떼어 왼쪽으로 옮긴 이전 수정을 재조정했다. `현재 팁 / 최대 용량` 배지는 다시 팁 박스 바로 위 중앙에 붙였다.
- 충돌 원인이던 화면 이동 화살표를 화면 높이 45%에서 72%로 내려 오른쪽 하단의 빈 공간에 배치했다. 뷔페 화면의 복귀 화살표도 같은 높이를 사용한다.
- 팁 배지와 화살표의 실제 DOM/캔버스 영역이 겹치지 않는지 검사하고, 이동한 화살표로 `레스토랑 → 뷔페 → 레스토랑` 전환이 모두 동작하는지 확인했다.
- 팁 팝업·용량 확장·회수, 하단 UI, 공식 웹게임 클라이언트 검증을 통과했다. 화면 확인: `output/tipbox-system/00-tipbox-field-badge.png`.

## 2026-08-10 테마 UI 개편 및 검토

- 제공된 유니티 참고 화면을 기준으로 테마 UI를 `대표 테마 아이콘 → 선택 테마 → 5열 파츠 그리드` 구조로 개편했다.
- 파츠 기본 카드는 수익 설명을 제거하고 가격, `보유 중`, `적용 중` 상태만 표시한다. 파츠를 눌렀을 때만 수익 효과, 누적 수익, 가격과 구매·적용 버튼이 상세 팝업에 나타난다.
- 실제 프로젝트에 복사된 테마 파츠 아이콘을 사용하며 유니티 원본 파일은 수정하지 않았다.
- 참고 화면과 비교해 카드 밀도를 4열에서 5열로 조정하고, 테마 화면의 굵은 스크롤바를 숨기고, 보유·적용 텍스트 대비를 높였다.
- 상세 팝업을 연 채 다른 하단 메뉴로 이동했다 돌아오면 이전 팝업이 다시 나타나던 상태 오류를 수정했다. 상세 팝업이 열리면 닫기 버튼에 초점을 주고, 닫은 뒤에는 원래 파츠 카드로 초점을 돌린다.
- 인앱 브라우저에서 `테마 선택 → 파츠 상세 → 구매·적용 → 보유 상태 → 다른 메뉴 이동 → 테마 복귀` 흐름을 검증했고 콘솔 경고·오류는 없었다.
- 검토 자료: `output/theme-ui-audit-20260810/`, `design-qa.md`.

## 2026-08-10 돌 테마 구매형 시작 구조

- 필드의 `+` 설치 지점과 별도 설치 팝업을 제거했다. 새 게임은 아무 설비와 테마 파츠도 보유하지 않은 상태로 시작한다.
- 돌 테마 파츠를 구매하면 해당 설비 종류가 즉시 설치되고 돌 파츠가 적용된다. 한 파츠에 연결된 기존 복수 설비 데이터(테이블·조리기구·울타리)는 함께 설치된다.
- 돌 파츠 가격은 해당 종류의 첫 설치 가격을 사용해 초기 150도토리로 조명 10, 테이블 15, 조리기구 25의 시작 흐름을 유지했다. 별도 설치 데이터가 없는 나무·바닥은 10도토리로 설정했다.
- 도마 테이블과 냉장고 구매가 각각 레시피 연구와 재료 드랍을 해금하며, 관련 튜토리얼과 잠금 문구도 돌 테마 구매 기준으로 변경했다.
- 버전 21로 저장 데이터를 이전한다. 기존 저장에서 이미 보유한 돌 파츠는 연결된 설비를 자동 설치해 진행이 막히지 않도록 보존한다.
- 디버그의 `초기 설비 전체 설치`는 `돌 테마 전체 구매·설치`로 변경했다.
- 검증: `STONE_THEME_INSTALLATION_OK parts=13 facilities=18`, `THEME_UI_REDESIGN_OK`, `DEBUG_PANEL_OK install=18/18` 통과. 공식 웹게임 클라이언트에서 새 게임이 빈 필드와 150도토리로 시작하는 상태를 확인했다. 화면 확인: `output/stone-theme-installation/`.

## 2026-08-10 테마 하단 시트 압축

- 테마 메뉴만 전체 화면 팝업 대신 캔버스 높이 54% 지점에서 열리는 하단 시트로 변경했다. 상단 54%에는 레스토랑과 주인공, 구매 직후 설치되는 설비가 계속 보인다.
- 헤더, 테마 탭, 병아리 안내, 진척도, 파츠 카드를 축소해 돌 테마 파츠 13개가 기본 화면에서 모두 보이도록 압축했다.
- 파츠 상세 팝업도 하단 시트 높이에 맞게 축소했으며 수익, 가격, 구매·설치 버튼은 그대로 유지했다.
- 검증: `THEME_HALF_SHEET_OK start=0.54 height=0.46 parts=13 tableInstances=4` 통과. 테이블 구매 후 시트를 닫지 않아도 상단 레스토랑에 설치된 테이블이 보이는 것을 확인했다. 공식 웹게임 클라이언트와 콘솔 오류 검사도 통과했다. 화면 확인: `output/theme-half-sheet/`.

## 2026-08-10 테마 하단 시트 가독성 재조정

- 사용자 피드백에 따라 파츠 13개를 한 화면에 억지로 넣던 초소형 배치를 폐기했다.
- 하단 시트는 화면 52% 지점부터 열리도록 유지하면서 카드 높이를 73px, 아이콘을 43px, 가격·상태 글씨를 10px로 확대했다. 화면에는 약 두 줄을 선명하게 표시하고 나머지는 세로 스크롤로 확인한다.
- 테마 이름, 보유 수, 병아리 이름, 진척도 글씨도 함께 확대했다. 상세 팝업은 메뉴 전체 화면을 기준으로 배치해 커진 글씨와 구매 버튼이 하단에서 잘리지 않는다.
- 검증에서 실제 계산 글꼴 10px, 카드 높이 73px, 아이콘 43px 이상을 확인했다. `THEME_HALF_SHEET_OK start=0.52 height=0.48 parts=13 tableInstances=4` 통과.

## 2026-08-10 병아리 등장 조건 구매 개수화

- 퍼센트 기반 병아리 등장 조건을 삭제하고 실제 테마 파츠 구매 개수로 변경했다.
- 일반 테마는 `4개 → 첫 번째`, `8개 → 두 번째`, `11개 → 세 번째` 병아리가 등장한다. 돌 테마는 기본 병아리가 처음부터 등장하고 `10개 → 공룡 병아리`, `13개 → 알껍질 병아리`가 등장한다.
- 수집 보상 파츠가 포함된 테마도 보상 파츠를 진척도로 세지 않고 실제 구매 가능한 11개 파츠만 계산한다.
- 테마 UI에 각 병아리 이름과 `4개 구매`, `8개 구매`, `11개 구매` 조건을 개별 칸으로 표시하고, 헤더도 `현재 구매 수 / 전체 구매 수`로 변경했다. 게이지의 `%` 표시는 모두 구매 개수로 교체했다.
- 손님 도감의 등장 조건과 신규 병아리 토스트도 동일한 구매 개수 기준으로 변경했다.
- 검증: `THEME_CHICK_PURCHASE_COUNTS_OK stone=0/10/13 standard=4/8/11`, `THEME_CHICK_MILESTONES_OK stone=0/10/13 campingTotal=11 purchases=4/8/11`, `THEME_CODEX_SEPARATION_OK chicks=3` 통과. 화면 확인: `output/theme-chick-purchase-counts/`.

## 2026-08-10 테마 파츠 정리 및 병아리 목표 강조

- 테마 구매 데이터에서 나무·배경(바닥) 파츠를 제외해 모든 테마를 실제 구매 가능한 설비 11종으로 통일했다. 저장 데이터에 남아 있는 해당 파츠도 로드 시 테마 보유·적용·진척도에서 제외된다.
- 돌 테마 병아리 등장 조건은 11종 기준으로 `기본 → 8개 구매 → 11개 구매`, 일반 테마는 `4개 → 8개 → 11개`를 사용한다.
- 테마 상단의 병아리 목표 카드마다 실제 손님 아이콘을 크게 표시하고, 이름과 정확한 구매 조건을 함께 배치했다. 미해금 병아리도 다음 목표를 알 수 있도록 아이콘과 이름을 미리 보여준다.
- 검증: `STONE_THEME_INSTALLATION_OK parts=11 facilities=18`, `THEME_HALF_SHEET_OK ... parts=11`, `THEME_CHICK_PURCHASE_COUNTS_OK stone=0/8/11 standard=4/8/11 icons=3`, `THEME_CHICK_MILESTONES_OK stone=0/8/11 ...`, `THEME_CODEX_SEPARATION_OK chicks=3` 통과. 공식 웹게임 클라이언트에서도 테마 파츠 11개와 콘솔 오류 없음 확인. 화면 확인: `output/theme-chick-purchase-counts/01-explicit-4-8-11-requirements.png`.

## 2026-08-10 묶음 설비와 병아리 진행 단위 구분

- 테이블·조리기구는 한 파츠 구매로 필드에 각각 4개가 일괄 설치되므로, 병아리 진행 단위를 개별 가구 수가 아닌 `보유한 테마 파츠 종류 수`로 명시했다.
- 테마 헤더는 `파츠 0 / 11종`, 병아리 카드는 `파츠 4종 보유`, 게이지는 `4종 / 8종 / 11종`으로 표시한다. 도감 등장 조건과 해금 토스트도 같은 표현을 사용한다.
- 테이블 4개 설치 후 진행도 1종, 조리기구 4개 추가 설치 후 누적 2종인지 검증에 추가했다. 병아리 해금 수치는 돌 `기본/8종/11종`, 일반 `4종/8종/11종`을 유지한다.

## 2026-08-10 개별 설비 설치 시스템 복구

- 개편된 테마 하단 UI는 유지하고, 돌 테마 파츠 구매가 같은 종류의 설비를 한꺼번에 설치하던 동작을 제거했다.
- 새 게임은 설비가 없는 상태에서 시작하며 필드의 `+` 설치 지점과 전용 설치 팝업으로 돌아간다. 설치 후보는 기존 순서대로 최대 2개가 표시되고, 비용을 지불할 때 선택한 설비 인스턴스 1개만 설치된다.
- 돌 테마는 기본 외형으로 보유·적용되지만 실제 설비 설치와는 분리된다. 테이블·조리기구는 각각 4개를 따로 설치하며, 첫 테이블 설치 후 나머지 3개가 자동 설치되지 않는다.
- 도마 테이블과 냉장고의 레시피·재료 드랍 해금, 튜토리얼 문구, 임무 문구, 공연 잠금 문구를 다시 실제 설비 설치 기준으로 연결했다.
- 돌 테마 병아리 진척도는 설치된 개별 수량을 부풀리지 않고 `서로 다른 설비 종류`를 기준으로 `기본/8종/11종`을 사용한다. 일반 테마는 기존 파츠 보유 종류 기준을 유지한다.
- 저장 버전을 22로 올렸다. 기존 저장의 설치 완료 설비는 철거하지 않으며, 새 게임 또는 초기화 후 개별 설치 흐름을 확인할 수 있다.
- 검증: `INDIVIDUAL_INSTALLATION_OK partial=lighting1+tables2+stove1 total=19 stoneTypes=11`, `THEME_HALF_SHEET_OK ... installationSeparate=yes`, `THEME_UI_REDESIGN_OK`, `THEME_CHICK_MILESTONES_OK`, `THEME_CODEX_SEPARATION_OK`, `DEBUG_PANEL_OK install=19/19`, `UNITY_FEATURES_OK` 통과. 공식 웹게임 클라이언트에서도 초기 후보 `조명/테이블`, 설치 0개, 콘솔 오류 없음을 확인했다. 화면 확인: `output/individual-installation/`.

## 2026-08-10 테마 병아리 진행 표시 압축

- 테마 상단의 병아리 이름·조건 카드 3개를 제거하고, 하나의 얇은 진척도 바에 병아리 아이콘 3개만 배치했다.
- 조건을 달성하지 못한 병아리는 회색으로 표시하고, 해당 설비 설치/테마 파츠 보유 조건을 달성하는 즉시 원래 색으로 전환한다.
- 정확한 병아리 이름과 등장 조건은 아이콘의 접근성 라벨과 툴팁에 보존해 화면 밀도를 낮추면서도 조건 데이터는 유지했다.

## 2026-08-10 테마 전체 구매 효과

- 모든 테마의 전체 구매 효과를 `메뉴 가격 +20% 상승`으로 통일했다. 일반 테마는 구매 가능한 파츠 11종을 모두 보유하면, 기본 돌 테마는 설비 11종을 모두 설치하면 효과가 활성화된다.
- 완성된 테마 하나당 20%가 레스토랑 가격 배율에 가산되며, 여러 테마를 완성하면 효과도 누적된다.
- 테마 UI의 병아리 진척도 바로 아래에 전체 구매 효과를 한 줄로 표시한다. 미완성은 잠금 아이콘과 회색 문구, 완성은 체크 아이콘과 초록색 문구로 구분한다.

## 2026-08-10 병아리 해금 조건 카드 복구

- 구매 진척도와 해금 수치의 관계가 모호했던 가로 게이지를 제거했다.
- 병아리마다 작은 카드를 하나씩 배치하고 아이콘 옆에 `현재/조건` 숫자만 표시한다. 완료된 조건의 현재 수치는 조건값에서 멈춰 `4/4`, `8/8`처럼 읽힌다.
- 미해금 카드는 회색, 해금 카드는 원래 아이콘 색과 노란 배경으로 구분하며 이름과 정확한 조건은 접근성 라벨에만 유지한다.

## 2026-08-10 11단계 병아리 해금 트랙

- 병아리 카드 3개를 다시 제거하고 참고 이미지와 같은 `1~11` 단계형 트랙으로 변경했다.
- 현재 보유/설치 수까지의 선과 숫자 노드는 연두색, 이후 단계는 짙은 갈색으로 표시하며 우측 위에 `현재 / 11`을 표시한다.
- 일반 테마는 4·8·11단계, 돌 테마는 기본 병아리를 1단계 위치에 두고 8·11단계에 실제 병아리 아이콘을 배치한다. 미해금 아이콘도 색상은 유지하고 테두리만 갈색으로 구분한다.

## 2026-08-12 싱크대 물 획득과 레시피 하단 패널

- 설치된 싱크대를 직접 터치하면 20% 확률로 `물` 재료 1개를 보관함에 넣는다. 빠른 연타 수급을 막기 위해 시도 후 8초 재사용 대기를 적용했고, 보관함이 가득 차면 시도와 대기시간 모두 소비하지 않는다.
- 설치된 도마 테이블을 터치하면 레시피의 `제작` 탭이 바로 열린다. 냉장고 터치 시 재료 보관함 탭이 열리는 기존 동작은 유지한다.
- 레시피 화면을 전체 팝업에서 상단 식당이 38% 보이는 62% 높이 하단 패널로 변경했다. 제목·탭 간격은 읽을 수 있는 크기를 유지하면서 패널용으로 압축했다.
- 저장 데이터에 싱크대 시도·획득 횟수와 다음 사용 가능 시점을 호환 방식으로 추가하고, `render_game_to_text`에 싱크대/도마 상호작용과 레시피 패널 규격을 노출했다.
- 검증: `SINK_WATER_RECIPE_SHEET_OK chance=20% cooldown=8s start=0.38 height=0.62 water=1`, `FACILITY_TUTORIAL_UNLOCKS_OK`, `THEME_HALF_SHEET_OK`, `RECIPE_LAB_THEME_SHEET_OK` 통과. 공식 웹게임 클라이언트 실행과 콘솔 오류 없음도 확인했다. 화면 확인: `output/sink-water-and-recipe-sheet/01-countertop-recipe-sheet.png`.
- TODO: 싱크대 물 획득 확률이나 재사용 대기 시간이 실제 플레이에서 답답하면 수치만 조정할 수 있다.

## 2026-08-12 레시피 보울 영역 압축

- 62% 높이 레시피 하단 패널 전용으로 도마와 보울의 세로 크기를 줄이고, 제목·보울 확장·재료 선택 영역의 여백도 함께 정리했다.
- 패널을 처음 열었을 때 스크롤 위치 0에서 `보울 섞기`와 `자동 연구` 버튼이 모두 하단 내비게이션 위에 보이도록 맞췄다. 일반 전체 화면용 보울 스타일은 변경하지 않았다.
- 검증: `SINK_WATER_RECIPE_SHEET_OK ... actions=visible`, `RECIPE_LAB_THEME_SHEET_OK` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/sink-water-and-recipe-sheet/01-countertop-recipe-sheet.png`.

## 2026-08-12 보울 재료 선택 팝업과 요리 연구 명칭

- 요리 연구 메인 패널에서 재료 목록을 제거하고 보울 자체를 진입 버튼으로 변경했다. 보울을 누르면 별도 `재료 넣기` 팝업이 열리며, 선택 재료·현재/최대 용량·보유 재료·남은 수량을 한 화면에서 확인한다.
- 팝업 안에서 같은 재료를 여러 번 담거나 선택 재료를 눌러 뺄 수 있고, `담기 완료` 또는 배경/닫기 버튼으로 메인 연구 화면에 돌아온다. 선택할 때 팝업이 재등장하는 것처럼 흔들리지 않도록 반복 애니메이션도 제거했다.
- 하단 내비게이션, 패널 제목, 탭, 튜토리얼, 발견/레벨업 연출, 대회·뷔페 조건 등 실제 노출 문구의 `레시피` 명칭을 `요리 연구`, `요리`, `발견한 요리`로 통일했다. 내부 코드와 데이터의 recipe 식별자는 호환성을 위해 유지한다.
- 검증: `SINK_WATER_RECIPE_SHEET_OK ... picker=popup naming=요리연구`, `RECIPE_LAB_THEME_SHEET_OK`, `RECIPE_RESEARCH_WEIRD_DISH_OK`, `FACILITY_TUTORIAL_UNLOCKS_OK` 통과. 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/sink-water-and-recipe-sheet/02-bowl-ingredient-popup.png`.

## 2026-08-12 테마 구매 팝업 닫기와 발견한 요리 수동 레벨업

- 테마 파츠 구매 성공 시 파츠 상세 구매 팝업만 즉시 닫고, 테마 하단 패널과 현재 테마 탭·스크롤은 유지하도록 변경했다. 구매한 카드는 패널에서 바로 `적용 중` 상태로 갱신된다.
- `발견한 요리` 카드에 고정 레벨업 재료와 `보유/필요` 수량을 추가했다. 모든 재료가 충분하면 `레벨업` 버튼이 활성화되고, 누르면 보울 재조합 없이 즉시 재료를 소비하여 1레벨 상승한다.
- 수동 즉시 레벨업도 요리 연구 횟수와 노하우 경험치에 포함하며 기존의 간결한 레벨업·가격 상승 연출을 사용한다. 재료 부족 또는 최대 레벨에서는 버튼이 비활성화된다.
- 검증: `MANUAL_DISH_UPGRADE_OK level=2 ingredients=2->0 price=40->44`, `THEME_UI_REDESIGN_OK ... purchased=2001`, `SINK_WATER_RECIPE_SHEET_OK`, `RECIPE_RESEARCH_WEIRD_DISH_OK`, `THEME_HALF_SHEET_OK` 통과. 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/manual-dish-upgrade/01-upgrade-ready.png`, `02-upgrade-complete.png`.

## 2026-08-12 발견·레벨업 목록 통합

- `발견한 요리` 탭과 별도 카드 렌더링을 제거하고 요리 연구 탭을 `연구 / 재료 보관함` 두 개로 축소했다.
- 연구 화면 아래 `발견 가능한 요리` 목록을 단일 목록으로 사용한다. 미발견 요리는 기존의 비공개·힌트 카드로, 발견한 요리는 넓은 상세 카드로 표시된다.
- 발견된 카드에 현재/최대 레벨, 가격, 다음 레벨 가격 상승률, 재료별 보유/필요 수량, 도감 보상, 즉시 레벨업 버튼을 모두 통합했다. 발견 카드만 한 줄 전체 너비를 사용해 조작 버튼과 수치 가독성을 확보했다.
- 검증: `MANUAL_DISH_UPGRADE_OK mergedCatalog=yes tabs=2 level=2 ingredients=2->0 price=40->44`, `RECIPE_LAB_THEME_SHEET_OK`, `RECIPE_RESEARCH_WEIRD_DISH_OK`, `THEME_UI_REDESIGN_OK` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/manual-dish-upgrade/01-upgrade-ready.png`.

## 2026-08-12 요리 목록 카드 규격 통일

- 발견 카드는 전체 너비, 미발견 카드는 2열이던 혼합 구조를 제거하고 모든 카드를 단일 열 전체 너비로 통일했다.
- 발견·힌트·완전 비공개 상태에 상관없이 카드 규격을 `426×112px`로 고정하고 아이콘 영역, 내부 여백, 제목 위치를 같은 기준선에 맞췄다.
- 힌트가 많아도 카드 높이가 늘어나지 않도록 힌트 문구 영역을 제한하고, 발견 카드의 레벨업 버튼은 동일한 우측 열에 정렬했다.
- 검증: `MANUAL_DISH_UPGRADE_OK mergedCatalog=yes cards=426x112`, `RECIPE_HINTS_OK catalog=64`, `RECIPE_LAB_THEME_SHEET_OK` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/manual-dish-upgrade/01b-uniform-discovered-hinted-mystery-cards.png`.

## 2026-08-12 주문 말풍선 터치 우선순위

- 필드 터치 판정에서 주문 대기 손님의 말풍선과 실망 말풍선을 팁박스 설비보다 먼저 검사하도록 순서를 변경했다.
- 주문 말풍선과 팁박스 터치 영역이 겹쳐도 주문 접수가 먼저 실행되고 팁박스 팝업은 열리지 않는다. 말풍선이 없는 위치에서 팁박스를 누르는 기존 동작은 유지한다.
- 검증: 팁박스 중심 좌표와 주문 말풍선을 의도적으로 겹친 상태에서 `ORDER_BUBBLE_PRIORITY_OK overlap=tipbox-center orders=0->1 tipboxPanel=closed`, 기존 `TIPBOX_SYSTEM_OK` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/order-bubble-priority/01-overlapping-order-bubble.png`, `02-order-taken-tipbox-closed.png`.

## 2026-08-12 팁 회수 후 팝업 자동 닫기

- 팁박스 팝업에서 실제 팁을 회수하면 도토리 반영과 저장 직후 팁박스 팝업이 자동으로 닫히도록 변경했다.
- 팁박스 터치 진입, 보석 용량 확장, 손님 주문 말풍선 우선순위는 그대로 유지한다.
- 검증: `TIPBOX_SYSTEM_OK popup=touch-only closeAfterClaim=yes`, `ORDER_BUBBLE_PRIORITY_OK ... tipboxPanel=closed` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인.

## 2026-08-12 하단 패널 바깥 영역 터치 닫기

- 테마와 요리 연구 하단 패널이 열린 상태에서 패널 바깥의 상단 식당 영역을 터치하면 닫기 버튼 없이 패널이 닫히도록 변경했다.
- 바깥 터치는 패널 닫기에만 소비하므로, 같은 위치에 손님·설비·설치 후보가 있어도 뒤쪽 필드 상호작용이 함께 실행되지 않는다. 하단 내비게이션을 눌러 다른 메뉴로 전환하는 기존 흐름은 유지한다.
- 검증: `BOTTOM_SHEET_OUTSIDE_DISMISS_OK theme=yes cookingResearch=yes fieldActionSuppressed=yes`, 기존 `THEME_HALF_SHEET_OK`, `SINK_WATER_RECIPE_SHEET_OK` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/bottom-sheet-outside-dismiss/`.

## 2026-08-12 요리 레벨 제한 제거

- 요리 데이터에 남아 있는 `maxLevel` 값과 무관하게 발견한 요리를 재료가 있는 동안 계속 레벨업할 수 있도록 수동·자동 연구 후보 판정의 상한 조건을 모두 제거했다.
- 요리 카드에서 `Lv.현재/최대`와 `최대 레벨` 상태를 제거하고 `Lv.현재`만 표시한다. 재료가 충분하면 레벨과 관계없이 항상 `레벨업` 버튼이 활성화된다.
- 과거 상한이었던 Lv.20 상태도 자동 연구 후보에 포함되고, 수동 레벨업으로 Lv.21 이상 성장하며 기존 가격 +10% 규칙과 연출을 그대로 사용한다.
- 검증: `MANUAL_DISH_UPGRADE_OK unlimited=yes ... level=20->21 ingredients=2->0 price=116->120`, `RECIPE_RESEARCH_WEIRD_DISH_OK` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/manual-dish-upgrade/`.

## 2026-08-12 노하우 교차 성장 구조

- 한 효과의 I·II·III를 연속으로 끝내야 다음 종류를 배울 수 있던 선행 조건을 제거하고, 세 갈래 모두 서로 다른 효과가 번갈아 등장하도록 순서와 마인드맵 좌표를 재배치했다.
- 자동 운영은 `도토리 정산 I → 재료 정리 I → 홍보 I → 주문 I → 정산 II…`, 재료 수급은 `드랍 확률 → 추가 드랍 → 보관함 → 드랍 확률…`, 요리 성장은 `조리 → 연구 → 오프라인 → 조리 → 대회…` 순으로 진행된다.
- 기존 노하우 ID, 포인트 비용, 효과 수치와 저장 데이터는 유지한다. 이미 습득한 노하우도 회수되거나 초기화되지 않는다.
- `render_game_to_text`에 `progressionPattern`과 세 갈래의 실제 순서를 추가해 선행 조건을 자동 검증할 수 있게 했다.
- 검증: `BALANCED_KNOWHOW_OK branches=3 automation=payment>ingredient>promotion>order growth=cooking>research>offline`, `RESTAURANT_KNOWHOW_OK ... nodes=48 ...` 통과. 공식 웹게임 클라이언트 실행 및 콘솔 오류 없음 확인. 화면: `output/balanced-knowhow-progression/`.

## 2026-08-13 레시피 시스템 UX 점검 (코드 변경 없음)

- 요리 연구 진입부터 재료 선택, 수동 연구, 신규 발견, 괴식·힌트, 레벨업, 자동 연구까지 현재 브라우저 상태에서 점검하고 `output/recipe-system-audit-2026-08-13/`에 화면과 메모를 저장했다.
- 핵심 조합과 성공·실패 피드백은 정상 작동하며 브라우저 콘솔 오류도 없었다.
- 다음 우선순위 후보는 레벨업 팝업 하단 버튼 가림, 64개 목록 필터 부재, 보울 용량 잠금 안내 부재, 5·6개 요리 해금 안내 충돌, 자동 연구의 희귀 재료 보호 부재, 스크롤 위치에 따른 연구 연출 잘림이다.

## 2026-08-13 재료 넣기 팝업 보울 용량 표시

- 재료 넣기 팝업의 작은 `0/2` 텍스트만으로 용량을 판단하던 구조를 보완해 `보울 용량`, 현재/최대 개수, 남은 칸 또는 `가득 참` 상태를 한 줄로 표시한다.
- 선택 영역을 실제 보울 용량만큼의 슬롯으로 구성했다. 빈 슬롯은 번호와 `빈 칸`으로 보이고, 재료를 넣으면 해당 슬롯이 재료 카드로 바뀌며 누르면 다시 뺄 수 있다.
- 빈 상태 `0/2 · 남은 2칸`, 한 개 선택 `1/2 · 남은 1칸`, 가득 찬 상태 `2/2 · 가득 참`과 추가 재료 비활성화를 자동 검증했다.
- 검증: `SINK_WATER_RECIPE_SHEET_OK`, `RECIPE_LAB_THEME_SHEET_OK` 통과 및 공식 웹게임 클라이언트 콘솔 오류 없음 확인. 화면: `output/sink-water-and-recipe-sheet/02a-bowl-capacity-empty.png`, `02b-bowl-capacity-one-left.png`, `02c-bowl-capacity-full.png`.

## 2026-08-13 싱크대 물 확정 획득

- 싱크대를 눌렀을 때 물을 확률로 주던 방식을 제거하고, 설치 후 8초가 지나면 다음 터치에서 물 1개를 반드시 획득하도록 변경했다.
- 준비 전 터치에는 남은 시간을 안내하며 획득 시도나 재료가 소모되지 않는다. 물을 받으면 곧바로 다음 8초 타이머가 시작된다.
- 싱크대 위의 작은 상태 표시를 준비 중에는 남은 초, 준비 완료 시에는 물방울 아이콘으로 표시해 획득 가능 시점을 필드에서 확인할 수 있게 했다.
- 검증: 준비 전 차단, 8초 후 확정 획득, 즉시 재획득 차단, 다음 8초 후 두 번째 확정 획득을 확인했다. `SINK_WATER_RECIPE_SHEET_OK guaranteed=yes cooldown=8s repeated=2`, `FACILITY_TUTORIAL_UNLOCKS_OK` 통과 및 공식 웹게임 클라이언트 실행 오류 없음 확인. 화면: `output/sink-water-and-recipe-sheet/00-sink-water-ready.png`.

## 2026-08-13 유니티 UI 스프라이트 재동기화

- 유니티 원본 `C:\Users\Soyoon Bang\Documents\projectchick\Assets\98_UI\Sprite`는 읽기만 하고, 웹 표시용 이미지 630개를 프로젝트 `assets/ui`에 복사했다. `.meta`, 프리팹과 유니티 원본 파일은 건드리지 않았다.
- 실제 Git 변경 기준으로 기존 이미지 105개가 최신 원본으로 교체되고 새 이미지 133개가 추가되었다. 원본과 프로젝트 복사본 630개의 SHA-256을 비교해 누락 0개, 불일치 0개를 확인했다.
- 신규 병아리 아이콘 `icon_chick_046.png`~`icon_chick_050.png` 5개를 추가하고, 향후 고객 데이터가 1046~1050을 참조하면 즉시 표시할 수 있도록 병아리 아이콘 지원 범위를 50까지 확장했다.
- 현재 최신 `tables_chick/json/Customer.json`은 특수 손님 2명과 일반 손님 45명까지만 정의하므로, 신규 아이콘 5개에는 이름·테마·재료를 임의로 연결하지 않았다. 해당 데이터가 갱신되면 별도 반영이 필요하다.
- 검증: 신규 아이콘 5개 HTTP 200, `CUSTOMER_CODEX_UI_OK roster=45 detail=1 grades=1/40/150 dropQuantity=1`, 공식 develop-web-game 클라이언트 콘솔 오류 없음. 상태 출력에서 `assetLibrary.chickIconRange=[1,50]` 확인. 화면: `output/unity-ui-sprite-sync/official-final/shot-0.png`.

## 2026-08-14 손님 재료 2종 구조

- 45마리 손님의 드랍 후보를 `기본 재료 1종 + 고유 특별 재료 1종`으로 축소했다. 기본 재료는 나뭇잎·쌀·빵·버터·밀가루·양파·우유·설탕·소금·기름·토마토·마늘의 12종을 여러 손님이 공유한다.
- 특별 재료는 45마리 전체에서 중복되지 않도록 배치했다. 현재 발견 가능한 모든 레시피 재료는 새 손님 드랍표에서도 계속 획득 가능하다. 아보카도·양배추·선인장 병아리는 나뭇잎을 공통 기본 재료로 유지한다.
- 방문 단계는 3단계를 유지하되 `첫 방문: 기본 1개`, `40회: 기본 2개`, `150회: 기본 2개/특별 1개`로 변경했다. 성공한 드랍에서는 항상 한 종류만 나오며, 150회 이후 선택 비율은 기본 80%/특별 20%다. 전체 드랍 성공률은 기존 15%를 유지한다.
- 손님 도감과 특별 홍보 재료 출처를 2종 구조에 맞춰 `기본/특별`로 정리하고, 상태 출력과 회귀 검증도 새 필드(`baseCount`, `specialCount`)로 교체했다.
- 검증: `GUEST_GRADES_OK routes=45 baseTypes=12 uniqueSpecials=45`, `INGREDIENT_DROP_15_PERCENT_QUANTITY_OK`, `CUSTOMER_CODEX_UI_OK ... rewards=base+unique-special`, `GREEN_CHICK_LEAF_DROPS_OK`, `RECIPE_LAB_THEME_SHEET_OK`, `SPECIAL_PROMOTION_OK` 통과. 공식 develop-web-game 클라이언트 실행과 화면 확인 완료. 화면: `output/customer-codex-clean-ui/01-clean-customer-profile.png`, `output/two-ingredient-smoke/shot-0.png`.

## 2026-08-14 재료 드랍의 방문 횟수 의존 제거

- 바로 위의 방문 단계별 재료 해금·수량 증가는 사용자 요청에 따라 폐기했다. 첫 방문부터 모든 병아리가 기본 재료와 고유 특별 재료를 모두 드랍 후보로 가진다.
- 전체 드랍 성공률은 15%를 유지하며, 성공 시 한 종류 1개만 나온다. 재료 선택 비율은 기본 70% / 특별 30%로 변경했다. 1회·40회·150회 방문 상태에서 로직과 확률이 모두 동일하다.
- 40회·150회 단골 단계는 손님 도감의 만남 기록으로만 유지하며 재료 드랍에는 영향을 주지 않는다. 도감 재료 행도 두 종류 모두 `처음부터 · 1개`로 표시한다.
- 특별 홍보에서도 두 재료 모두 첫 방문부터 출처로 인정되며, 레시피 발견 순서 계산에서 특별 재료의 방문 지연값을 제거했다.
- 검증: `GUEST_DROPS_OK ... slotWeights=70/30 visitIndependent=yes`, `INGREDIENT_DROP_VISIT_INDEPENDENT_OK`, `CUSTOMER_CODEX_UI_OK ... visitIndependent=yes`, `GREEN_CHICK_LEAF_DROPS_OK`, `RECIPE_LAB_THEME_SHEET_OK`, `SPECIAL_PROMOTION_OK`, `INGREDIENT_DEMAND_BALANCE_OK` 통과. 공식 웹게임 클라이언트 콘솔 오류 없음 및 도감 화면 확인 완료. 화면: `output/customer-codex-clean-ui/01-clean-customer-profile.png`, `output/guest-drops-70-30-smoke/shot-0.png`.

## 2026-08-14 초반 레시피 역산 재료 재배치

- 앞서 만든 2종 드랍표의 초반 배치가 레시피 해금 흐름을 충분히 고려하지 못해 돌·나무·초록 줄무늬 테마의 9마리를 레시피 조합 기준으로 다시 배치했다.
- 돌 테마는 `기본 병아리: 나뭇잎+토마토`, `공룡 병아리: 밀가루+버섯`, `알껍질 병아리: 빵+달걀`이다. 등장 순서대로 누적 발견 가능 요리가 1→2→7개가 되어, 돌 테마 완료 즉시 자동 요리 연구의 5개 조건을 넘는다.
- 나무 테마는 `도토리: 버터+도토리`, `난쟁이: 돼지고기+육수`, `광부: 쌀+트러플`로 조정해 누적 9→10→13개가 된다. 초록 줄무늬는 `아보카도: 나뭇잎+아보카도`, `양배추: 나뭇잎+양배추`, `선인장: 면+고추`로 조정해 누적 14→15→16개가 된다.
- 초반 9마리는 새 병아리가 한 마리 등장할 때마다 최소 한 가지 이상 실제 제작 가능한 새 조합이 추가된다. 전체 45마리의 특별 재료 중복 금지, 모든 레시피 재료 획득 가능, 전체 드랍 15%와 기본 70%/특별 30% 규칙은 유지했다.
- 검증: `GUEST_DROPS_OK ... earlyRecipes=7/13/16 milestones=1/2/7/9/10/13/14/15/16`, `INGREDIENT_DROP_VISIT_INDEPENDENT_OK`, `CUSTOMER_CODEX_UI_OK ... stonePairs=leaf+tomato/flour+mushroom/bread+egg`, `GREEN_CHICK_EARLY_RECIPE_DROPS_OK`, `RECIPE_LAB_THEME_SHEET_OK`, `SPECIAL_PROMOTION_OK`, `INGREDIENT_DEMAND_BALANCE_OK` 통과. 공식 웹게임 클라이언트 콘솔 오류 없음. 화면: `output/customer-codex-clean-ui/02-stone-eggshell-early-pair.png`, `output/early-recipe-aligned-drops-smoke/shot-0.png`.

## 2026-08-14 보울 팝업 내부 즉시 섞기

- 요리 연구 본 화면에 있던 별도 `보울 섞기` 버튼을 제거했다. 이제 보울을 눌러 연 재료 선택 팝업 안에서 재료 선택부터 연구 시작까지 완료한다.
- 팝업 하단 버튼은 재료 0~1개일 때 `재료를 2개 이상 담아주세요`로 비활성화되고, 2개 이상이면 `바로 섞기 · 현재/용량`으로 활성화된다.
- `바로 섞기`를 누르면 선택 팝업이 즉시 닫히고 재료가 소비되며 요리 연구 로딩 연출로 전환된다. 신규 발견, 기존 요리 레벨업, 괴식과 힌트 규칙은 그대로 유지한다.
- `render_game_to_text`에 `ingredientSelection=\"tap-bowl-popup-mix-inside\"`, `outsideMixButton=false`를 추가해 UI 흐름을 검증할 수 있게 했다.
- 검증: `SINK_WATER_RECIPE_SHEET_OK ... mix=inside-popup`, `RECIPE_LAB_THEME_SHEET_OK`, `RECIPE_RESEARCH_WEIRD_DISH_OK`, `SPECIAL_PROMOTION_OK`, `INGREDIENT_DEMAND_BALANCE_OK` 통과. 공식 웹게임 클라이언트 콘솔 오류 없음. 화면: `output/sink-water-and-recipe-sheet/02c-bowl-capacity-full.png`, `02d-popup-mix-started.png`, `output/bowl-popup-mix-smoke/shot-0.png`.

## 2026-08-14 물 활용 요리 8종 확장

- 싱크대에서 확정 획득하는 물이 다양한 단계에서 소비되도록 요리 8종을 추가했다.
  - 2재료: 쌀죽(물+쌀), 삶은 달걀(물+달걀)
  - 3재료: 맑은 국수(물+면+소금), 토마토 수프(물+토마토+양파), 감자 수프(물+감자+우유), 채소죽(물+쌀+모둠 채소), 두부 장국(물+두부+간장)
  - 4재료: 양배추 피클(물+양배추+식초+설탕)
- 전체 발견 가능 요리는 64종에서 72종, 물을 쓰는 요리는 2종에서 10종으로 늘어났다.
- 모든 72개 재료 조합이 중복되지 않음을 확인했다.
- `verify-water-recipes.mjs`에서 쌀죽과 양배추 피클을 실제 보울 UI로 조합해 신규 발견 연출까지 확인했다.
- 재료 수요 균형 및 초반 요리 회귀 검사를 72개 기준으로 갱신하고 통과했다.
- 공식 `develop-web-game` 클라이언트에서 `catalogTotal=72`, `mysteryRecipeCount=71`, 콘솔 오류 없음과 초기 화면 렌더링을 확인했다.

## 2026-08-14 냉장고 명칭·주인공 설비 이동

- 사용자에게 보이는 `재료 보관함` 명칭을 `냉장고`로 통일했다. 요리 연구의 두 탭은 `연구 / 냉장고`이며 냉장고 탭에서는 패널 제목도 `냉장고`로 바뀐다. 용량·빈 상태·가득 참·확장 안내와 노하우 효과도 냉장고 표현을 사용한다.
- 요리 연구 패널을 열면 주인공 요리사 병아리가 도마 테이블 앞으로 부드럽게 이동한다. 냉장고 탭으로 바꾸면 냉장고 앞으로 이동하고, 패널 닫기·다른 화면 전환 시 기존 위치 `(400,330)`으로 복귀한다.
- 필드 상단 설비 배치를 `싱크대 x=178 / 도마 테이블 x=274 / 냉장고 x=370` 순으로 변경했다. 싱크대 물 획득과 도마 테이블 연구 진입의 터치 위치도 함께 교환했다.
- `render_game_to_text`에 주인공 현재·목표 위치, 활성 설비와 이동 여부 및 세 설비 좌표를 추가했다.
- 검증: `CHEF_STATION_NAVIGATION_OK`, `SINK_WATER_RECIPE_SHEET_OK`, `BOTTOM_CONTROLS_INVENTORY_OK`, `INGREDIENT_STORAGE_EXPANSION_OK`, `BOTTOM_SHEET_OUTSIDE_DISMISS_OK`, `FACILITY_TUTORIAL_UNLOCKS_OK`, `WATER_RECIPES_OK` 통과.
- 공식 `develop-web-game` 클라이언트에서 전체 설비 설치 후 연구 탭 진입, 주인공 도마 테이블 도착 `(274,248)`, 새 설비 배치와 콘솔 오류 없음 확인.

## 2026-08-25 기획 엑셀 레시피·병아리 재료 동기화

- 바탕화면 `테마-병아리.xlsx`의 `레시피(기획)` 예시 2~55번을 적용하고, 기존 시작 음식인 샐러드를 포함해 발견 가능한 요리를 55종으로 재구성했다. 레시피 이름과 2~5개 재료 조합은 기획 시트 순서를 그대로 사용한다.
- `병아리-재료(기획)` 기준으로 26개 테마·78마리 병아리를 연결했다. 각 병아리는 시트에 적힌 재료 1~2종을 처음부터 드랍하며, 2종이면 기본 70%/특별 30%, 1종이면 해당 재료 100%로 선택된다. 전체 손님 재료 드랍 성공률 15%와 성공 시 한 종류 1개 규칙은 유지한다.
- 기존 15개 테마 뒤에 한식당·채소밭·패스트푸드·양반집·톨게이트·학교·오락실·버섯 늪·해적선·바닷속·무덤 테마를 추가했다. 엑셀 병아리 이미지를 유니티 UI 원본과 대조해 `icon_chick_001`~`108`을 프로젝트에 복사했으며 유니티 원본은 수정하지 않았다.
- 같은 재료가 반복되는 레시피는 요구량을 재료별로 합산하도록 수정했다. 샐러드의 나뭇잎 2개, 병아리콩 가득의 병아리콩 3개처럼 UI 표시·제작 가능 판정·실제 소비량이 모두 일치한다.
- 기획 시트의 오므라이스는 케첩을 요구하지만 병아리 재료 시트에는 케첩 드랍처가 없다. 엑셀 데이터를 임의 변경하지 않고 기존 특수 교환상의 미획득 재료 제안 경로로 획득 가능하게 유지했다.
- 검증: `verify-planning-workbook-sync.mjs`에서 테마 26·병아리 78·레시피 55·중복 조합 0·병아리 아이콘 누락 0 확인. `PLANNING_RECIPE_UI_OK recipes=55 owned=55 icons=ok`, `THEME_UI_REDESIGN_OK tabs=26`, `MANUAL_DISH_UPGRADE_OK`, `BOTTOM_CONTROLS_INVENTORY_OK` 통과. 공식 웹게임 클라이언트에서 초기 화면·상태 출력과 콘솔 오류 없음 확인.

## 2026-08-25 기획 시트 기준 테마·병아리 순서 재정렬

- `병아리-재료(기획)`의 5~30행을 기준으로 테마 ID를 시트 위→아래 순서로 다시 배치했다. 주요 변경 구간은 `벚꽃 6 → 한식당 7 → 채소밭 8 → 블루 땡땡이 9 → 병아리 10 → 식빵 11 → 이태리 12 → 캠핑 13`이며, 후반은 `바닷속 23 → 연금술 24 → 우주 점성술 25 → 무덤 26` 순이다.
- 각 테마의 병아리도 시트 F/H/J열의 좌→우 순서로 재배치하고, 같은 위치의 G/I/K열 재료가 따라가도록 78마리 전체를 동기화했다. 테마 순서 변경에 따라 레시피 발견 정렬에서 사용하는 재료 등장 단계도 새 기획 순서를 반영한다.
- 엑셀의 이미지 앵커 78개를 유니티 `icon_chick_###` 원본과 다시 대조했다. 유니티 `Sprite/Chick` PNG 110개와 `Sprite/Facility` PNG 295개를 프로젝트 복사본에 동기화했으며 원본은 읽기만 했다. 복사 후 SHA-256 불일치는 각각 0개다.
- 테마 제목 조합 시 `한식당 식당`으로 보이던 중복 표현은 `한식당`으로 정리했다.
- 검증: `verify-planning-workbook-sync.mjs`에서 테마·병아리·재료의 전체 순서를 고정 기대값과 대조했다. `PLANNING_THEME_ORDER_UI_OK themes=26 chicks=78 samples=6/7/24 icons=ok`, `THEME_UI_REDESIGN_OK`, `PLANNING_RECIPE_UI_OK` 통과. 벚꽃·한식당·연금술 테마 화면을 직접 확인했고 공식 웹게임 클라이언트 초기 렌더링과 콘솔 오류 없음도 재확인했다.

## 2026-08-25 삶은 병아리콩 기본 요리 전환

- 기획 레시피에 임의로 섞여 있던 기존 샐러드를 완전히 제거했다. `레시피(기획)`의 2~55번만 남기고 게임 내부 ID를 1~54로 빈 번호 없이 다시 부여했다.
- 예전 레시피 ID용으로 남아 있던 가격 보정표도 제거했다. 기본 요리의 35원 고정값을 제외하면 기획 시트에 적힌 가격을 그대로 사용한다.
- 새 게임의 기본 보유 요리는 `삶은 병아리콩` Lv.1이며 기본 판매가는 35원이다. 시작 재료는 나뭇잎 2개에서 `물 1개 + 병아리콩 1개`로 교체했다.
- 아직 요리 연구나 재료 획득을 하지 않은 기존 초기 저장은 버전 23 마이그레이션에서 나뭇잎 시작 재료를 물과 병아리콩으로 자동 교체한다. 이미 진행한 저장의 냉장고 재료는 건드리지 않는다.
- 물은 싱크대에서 초반부터 얻는 재료이므로 레시피 발견 순서 계산에서도 0단계로 처리했다. 덕분에 삶은 병아리콩이 요리 연구 목록의 첫 번째 카드로 표시된다.
- 시작 재료로 삶은 병아리콩을 즉시 수동 레벨업하면 물과 병아리콩이 각각 1개씩 소비되고 Lv.2, 가격 39원으로 정상 상승한다.
- 검증: `CHICKPEA_STARTER_OK recipes=54 base=삶은병아리콩 ingredients=병아리콩1+물1 upgrade=1->2`, `PLANNING_RECIPE_UI_OK recipes=54`, `PLANNING_THEME_ORDER_UI_OK`, `BOTTOM_CONTROLS_INVENTORY_OK` 통과. 공식 웹게임 클라이언트 상태에서도 `catalog=54`, `owned=1`, `basePrice=35`, 시작 재료 두 종류를 확인했으며 콘솔 오류는 없었다.

## 2026-08-25 엑셀 기준 레시피 표시 순서 고정

- 요리 연구 카드에 적용되던 재료 등장 단계·재료 수 기반 재정렬을 제거했다. 이제 `레시피(기획)` 2~55행의 위→아래 순서가 게임의 `NO.01`~`NO.54`와 정확히 일치한다.
- 같은 공통 목록을 사용하는 요리 연구 힌트, 야외 뷔페 요리 선택, 대회 출품 요리 선택도 엑셀 순서를 그대로 따른다.
- 요리를 새로 발견하거나 수동 레벨업해도 카드 번호와 위치가 바뀌지 않는다.
- 검증: 정적 엑셀 순서 54종 전체 대조, `CHICKPEA_STARTER_OK`의 레벨업 전후 카드 순서 대조, `PLANNING_RECIPE_UI_OK`의 실제 DOM 이름·번호 전체 대조를 통과했다. 공식 `develop-web-game` 클라이언트 초기 렌더링과 상태 출력도 오류 없이 완료했다.

## 2026-08-26 장시간 플레이 중단 원인 진단

- 전체 설비·자동화가 활성화된 상태에서 시간을 진행해 특수 손님 생성 경로를 재현했다.
- 게임 시간 120초에 특수 손님 후보로 재료 상인이 생성되면 `buildMerchantOffers → merchantIngredientUnitPrice → ingredientDiscoveryStage` 순으로 호출된다.
- 엑셀 기준 레시피 순서 고정 작업에서 `ingredientDiscoveryStage()` 정의를 제거했지만 재료 상인 가격 계산의 호출부가 남아 `ReferenceError`가 발생한다. 이 예외가 애니메이션 프레임의 `update()`를 빠져나가게 만들어 화면은 남아 있지만 게임 시간·손님 이동·입력 반응이 멈춘 것처럼 보인다.
- 후속 수정에서 재료 상인 전용 단계 계산을 복구하고 120초 자동 등장 회귀 검사를 완료했다.

## 2026-08-26 재료 상인 등장 시 게임 중단 수정

- `ingredientMerchantProgressionStage()`를 추가해 재료 상인의 가격 단계를 병아리의 테마·슬롯 등장 순서로 계산하도록 복구했다.
- 이 계산은 엑셀 기준 레시피 표시 순서와 완전히 분리되어 있으므로, 레시피 카드 `NO.01~NO.54` 순서는 그대로 유지된다.
- 강제 재료 상인 등장 → 도착 전 터치 제한 → 팝업 열기 → 재료 구매 → 다른 특수 손님 처리 → 120초 자동 특수 손님 재등장까지 전체 경로를 실행했다.
- 검증: `SPECIAL_VISITORS_OK interval=120 merchant=progression-priced-arrival-only ...` 통과, 콘솔·페이지 오류 없음. `PLANNING_RECIPE_UI_OK recipes=54 owned=54`와 엑셀 레시피 54종 순서 검증도 재통과했다. 공식 `develop-web-game` 클라이언트 초기 화면과 상태 출력도 정상이다.

## 2026-08-26 초반 9개 테마 레시피 50종 재배치

- 엑셀 원본과 유니티 원본은 수정하지 않고, 프로토타입의 요리 카탈로그만 초반 9개 테마에서 고르게 발견되도록 50종으로 재구성했다.
- 테마별 최초 발견 가능 개수는 `돌 5 / 나무 7 / 초록 줄무늬 5 / 블루화이트 5 / 그린핑크 5 / 벚꽃 6 / 한식당 6 / 채소밭 5 / 블루 땡땡이 6`이다. 첫 9개 테마 누적으로 정확히 50개가 모두 열리며 이후 테스트 제외 테마에는 임시 레시피를 배정하지 않았다.
- 기존 재료를 서로 교차 활용하는 `맑은 양파 수프`, `아보카도 병아리콩 샐러드`, `새싹전`, `양배추 딤섬`, `가지 소고기 덮밥`, `씨앗 오이 샐러드`, `마늘 김치볶음`, `마늘 육회`, `치즈 간장계란밥`, `대구구이` 등을 추가·정리했다.
- 이번 50종 테스트 범위에서 `과카몰리`, `오므라이스`, `라따뚜이`, `어향가지`는 제외했다. 획득 경로가 없는 재료를 요구하는 레시피는 0개다.
- 저장 버전을 24로 올리고 기존 레시피 ID를 같은 이름의 새 ID로 이전했다. 보유 레벨, 진행 중 손님·주문·조리, 뷔페 진열, 대회 선택·결과, 연구 이력·힌트까지 함께 마이그레이션하며 제외된 레시피 참조만 안전하게 정리한다.
- 검증: `THEME_RECIPE_PACING_OK distribution=5/7/5/5/5/6/6/5/6 total=50`, `RECIPE_CATALOG_V24_MIGRATION_OK`, `CHICKPEA_STARTER_OK recipes=50`, `PLANNING_RECIPE_UI_OK recipes=50 owned=50`, 정적 문법 검사 통과. 공식 웹게임 클라이언트에서 `catalogTotal=50`, `owned=1`, 카드 순서 `1~50`, 콘솔 오류 없음 확인. 화면: `output/theme-recipe-pacing-official/shot-0.png`, `.tmp/web-game-sync/planning-recipe-catalog.png`.

## 2026-08-27 요거트·식초 드랍 비중 및 식초 소비처 보완

- 복숭아 천사 병아리의 재료 순서를 `요거트, 식초`로 바꿔 재료 드랍 성공 시 요거트 70%, 식초 30%가 적용되도록 했다.
- 그린핑크 테마에서 식초를 얻은 직후 발견할 수 있는 `새콤 양파절임(양파 + 식초)`을 추가했다. 기존 레시피 ID와 저장 데이터는 그대로 유지하고 신규 ID 51을 사용했다.
- 요리 연구 목록은 신규 요리를 해당 발견 시점인 `복숭아 요거트` 다음에 표시하며, 전체 테스트 레시피는 51종이 됐다.
- 600회 표본에서 전체 드랍 82회 중 요거트 58회, 식초 24회(70.7% / 29.3%)였고 모든 성공 드랍이 한 종류 1개인지 확인했다.
- 양파와 식초를 보울에 넣어 `새콤 양파절임`이 발견되고 두 재료가 소비되는 전체 연구 흐름을 확인했다. 화면: `output/yogurt-vinegar-balance/01-onion-vinegar-in-bowl.png`, `02-onion-pickle-discovered.png`.
- 검증: `YOGURT_VINEGAR_RECIPE_OK`, `PLANNING_RECIPE_UI_OK recipes=51 owned=51`, `CHICKPEA_STARTER_OK recipes=51`, `RECIPE_CATALOG_V24_MIGRATION_OK`, `THEME_RECIPE_PACING_OK distribution=5/7/5/5/6/6/6/5/6 total=51`, 공식 웹게임 클라이언트 실행 및 화면 확인 완료.

## 2026-08-27 아이디어 에너지와 단계별 보석 충전

- 기존 전구 아이콘의 아이디어 재화를 요리 연구 전용 에너지로 변경했다.
- 아이디어 최대치는 20이며, 30분마다 1개씩 회복되고 오프라인 경과 시간도 반영된다.
- 기존 저장 데이터에는 아이디어 20개를 지급해 이전 데이터 때문에 연구가 막히지 않도록 했다.
- 수동 요리 연구, 자동 요리 연구, 괴식 제작, 발견 요리 레벨업마다 아이디어 1개를 소비한다. 손님 주문용 조리는 소비하지 않는다.
- 아이디어가 없을 때는 재료가 먼저 사라지지 않도록 연구 시작 전에 아이디어 보유량을 검사한다.
- 보석 충전은 1회당 아이디어 10개이며, 하루 충전 비용은 10개 → 50개 → 100개 → 200개 순서로 증가한다. 네 번째 이후에는 200개를 유지하고 날짜가 바뀌면 10개부터 다시 시작한다.
- 상단 HUD와 요리 연구 패널에 현재 아이디어, 다음 회복 시간, 충전 비용을 표시했다. 최대치에서는 충전 버튼에 `가득 참`만 표시한다.
- 보상 및 디버그 추가로 아이디어가 최대치 20을 넘지 않도록 통일했다.
- `node tools/verify-idea-energy.mjs`, `node tools/verify-debug-panel.mjs`, `node tools/verify-chickpea-starter.mjs`, `node tools/verify-recipe-catalog-v24-migration.mjs`, `node tools/verify-planning-workbook-sync.mjs`, `node tools/verify-theme-recipe-pacing.mjs`, `node tools/verify-planning-recipe-ui.mjs`, `node tools/verify-yogurt-vinegar-recipe.mjs` 검증을 통과했다.
- 최종 화면은 `output/idea-energy/01-full-energy-panel.png`, `output/idea-energy/02-fourth-refill-next-200.png`, `output/idea-energy-official-final/shot-0.png`에서 확인했다.

## 2026-08-27 보울 확장 후 괴식 손실 완화

- 자동 연구가 만들 수 있는 요리가 없을 때 보울 최대 용량만큼 랜덤 재료를 소비하던 원인을 수정했다.
- 자동 괴식 연구는 보울이 3~5칸으로 확장되어도 항상 재료 2개만 무작위로 사용한다. 괴식 실패 시 투입 재료가 사라지는 기존 학습 규칙은 유지했다.
- 수동 재료 선택 팝업에 `최대 N개 · 전부 채울 필요 없어요`, `이번 연구 N개 사용 · 최대 N개`를 표시하고 섞기 버튼에도 실제 소비 개수를 표시했다.
- 5칸 보울에서 자동 괴식이 식초 5개 중 2개만 소비하고, 수동 선택은 2/5만 담은 상태로 바로 연구할 수 있음을 확인했다.
- 검증: `BOWL_FAILURE_COST_OK capacity=5 auto-weird-cost=2 manual-usage=2/5`, `SINK_WATER_RECIPE_SHEET_OK`, `IDEA_ENERGY_OK`, 정적 문법 검사와 공식 웹게임 클라이언트 부팅 통과.
- 화면: `output/bowl-failure-cost/01-auto-research-two-ingredients.png`, `02-manual-uses-two-of-five.png`, `output/bowl-failure-cost-official/shot-0.png`.
- 참고: 오래된 `verify-recipe-research-and-weird-dish.mjs` 전체 검사는 현재 카탈로그에서 제거된 과거 샌드위치 레시피를 찾는 부분에서 중단된다. 자동 괴식 소비 규칙 자체는 새 집중 검사에서 별도로 통과했다.

## 2026-08-27 보울 재료 선택 UI 문구 축소

- 자동 괴식이 재료 2개만 소비하는 내부 규칙은 유지했다.
- 재료 선택 팝업에서 `전부 채울 필요 없어요`, `이번 연구 N개 사용`, 섞기 버튼의 재료 사용 개수 문구를 제거했다.
- 팝업에는 `최대 N개`, 재료 슬롯, 보유 재료, `바로 섞기`만 남겼다. 2개 미만 선택 상태의 버튼 문구도 `2개 이상 담기`로 축약했다.
- `BOWL_FAILURE_COST_OK`, `SINK_WATER_RECIPE_SHEET_OK`, 정적 문법 검사와 공식 웹게임 클라이언트 부팅을 통과했다.
- 화면: `output/bowl-failure-cost/02-manual-uses-two-of-five.png`, `output/bowl-minimal-ui-official-final/shot-0.png`.
## 2026-09-01 요리 연구·목록 탭 분리

- 사용자 요청: 요리 연구 화면에 함께 있던 제작 공간과 전체 요리 목록을 별도 탭으로 분리한다.
- 요리 관련 탭을 `연구 / 요리 목록 / 냉장고`의 3개로 재구성했다.
- `연구` 탭에는 아이디어 에너지, 보울 확장, 재료 투입, 자동 연구만 남겼다.
- `요리 목록` 탭에는 발견한 요리의 가격·재료·레벨업과 미발견 요리의 힌트를 한 목록으로 모았다.
- `냉장고` 탭은 기존 재료 관리 기능만 유지한다.
- 요리 목록을 보는 동안에는 주인공 병아리가 도마 테이블로 이동하지 않고 제자리로 돌아가도록 동선을 분리했다.
- `tools/verify-recipe-tab-separation.mjs` 검증 결과: 탭 순서 정상, 연구 화면에 목록 카드 없음, 목록에 51개 카드 표시, 냉장고 화면 분리, 콘솔 오류 없음.
- 검증 화면: `output/recipe-tab-separation/01-research-only.png`, `02-all-recipes.png`, `03-fridge-only.png`.

## 2026-09-01 재료 팝업의 발견 조합 안내

- 사용자 요청: 수동으로 재료를 담을 때 이미 발견한 요리의 조합을 팝업에서 미리 확인할 수 있게 한다.
- 재료 넣기 팝업에 `발견한 조합` 가로 목록을 추가하고 요리 아이콘, 요리명, 재료 이름·아이콘·중복 수량을 표시했다.
- 미발견 요리는 조합 안내에 포함하지 않아 발견 전 정답은 계속 보호한다.
- 재료를 하나 이상 담으면 선택한 재료와 조합이 맞는 기존 요리를 목록 앞으로 이동하고 강조한다.
- 카드가 많아지면 가로 스크롤로 탐색하며, 기존 드래그 스크롤 동작을 그대로 사용할 수 있다.
- 검증: `KNOWN_RECIPE_COMBINATIONS_OK`, `RECIPE_TAB_SEPARATION_OK`, `SINK_WATER_RECIPE_SHEET_OK`, 콘솔 오류 없음.
- 검증 화면: `output/known-recipe-combinations/01-known-combinations.png`, `02-selected-match-first.png`.

## 2026-09-01 발견 요리 조합 표시 방식 정정

- 사용자 정정: 발견한 요리 목록을 항상 보여주는 방식이 아니라, 현재 넣은 재료가 발견한 요리와 정확히 일치할 때만 해당 요리를 표시한다.
- 빈 보울과 일부 재료만 선택한 상태에서는 요리 미리보기를 완전히 숨긴다.
- 재료 종류와 중복 수량을 포함한 전체 조합이 이미 발견한 요리와 정확히 일치하면 요리 아이콘, 이름, 현재 레벨 카드가 나타난다.
- 정확한 조합에서 재료를 다시 빼면 미리보기 카드도 즉시 사라진다.
- 미발견 요리는 정확한 조합이어도 이 카드로 정답을 노출하지 않는다.
- 검증: `KNOWN_RECIPE_COMBINATIONS_OK exact-only=yes partial-hidden=yes recipe=삶은 고기`, 탭 분리 및 보울 연구 회귀 검사 통과, 콘솔 오류 없음.
- 검증 화면: `output/known-recipe-combinations/01-empty-no-preview.png`, `02-partial-no-preview.png`, `03-exact-known-recipe.png`.
