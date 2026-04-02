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
