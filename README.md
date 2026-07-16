# 식당아리 기획 검증 프로토타입

유니티의 실제 레스토랑 스크립트와 JSON 테이블을 기준으로 다시 만든 웹게임 프로토타입입니다. MD 기획서는 구현 기준으로 사용하지 않습니다.

## 현재 구현 범위

- 시작 도토리 100
- 테이블 순서에 따른 설비 설치 후보 2개 표시
- 조명, 테이블, 조리기구 설치 후 핵심 영업 루프 해금
- 홍보 5회 → 손님 입장 → 주문 터치 → 자동 조리 → 식사 → 수동 도토리 회수
- 손님별 주문 대기 시간, 선호 메뉴, 실망 확률, 팁 확률 반영
- 테이블당 2석, 조리기구별 주문 1개 처리
- 레시피 연구(가중치/천장), 중복 강화 재료, 강화 가격·시간 보정, 레시피 도감 보상
- 메인 임무, 오늘의 할 일, 개별 보상, 오늘의 완주 보상
- 일반 손님·특별 손님·공연팀 도감과 신규 등록
- 직원 고용, 일일 스티커, 스티커 부착, 레벨업, 근무/휴식 자동 행동
- 무대 공연 쿨타임, 공연 가격 버프, 테마 파츠 구매·적용
- 홍보 룰렛 도둑 등장, 팁 절도, 클릭 체포
- 로컬 저장, 초기화, 전체 화면(`F`)
- 자동 검증용 `window.render_game_to_text()`, `window.advanceTime(ms)`

## 데이터와 리소스

- 테이블 원본: `C:\Users\Soyoon Bang\Documents\tables_chick\json`
- 구현 기준 스크립트: `C:\Users\Soyoon Bang\Documents\projectchick\Assets\90_Script`
- UI 원본: `C:\Users\Soyoon Bang\Documents\projectchick\Assets\98_UI`
- 프로젝트에서는 복사된 `data/`, `assets/ui/` 파일만 사용합니다.
- 유니티 프로젝트 원본은 수정하지 않습니다.

## 실행

`index.html`을 더블클릭해 바로 실행할 수 있습니다.

로컬 서버로 실행해도 동일하게 동작합니다.

```powershell
python -m http.server 4173
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다.

`data/*.json`을 교체한 경우 아래 명령으로 직접 실행용 데이터 번들을 갱신합니다.

```powershell
node tools\build-runtime-tables.mjs
```
