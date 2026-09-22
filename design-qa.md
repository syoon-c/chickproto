# Design QA

- source visual truth path: `C:\Users\SOYOON~1\AppData\Local\Temp\codex-clipboard-5e0c4665-6ce7-4627-b4f5-6ecdcf614854.png`
- implementation screenshot path: `C:\Users\Soyoon Bang\Desktop\ChickProto\qa-arrival.png`
- combined comparison path: `C:\Users\Soyoon Bang\Desktop\ChickProto\qa-comparison.png`
- viewport: 430 × 932 CSS px
- source pixels: 1324 × 692; first-panel comparison crop: 314 × 554
- implementation pixels: 430 × 932 at device scale factor 1
- density normalization: source first panel scaled proportionally to 430 × 758 and vertically centered beside the 430 × 932 implementation
- state: 새 병아리 이름 짓기

## Full-view comparison evidence

레퍼런스 첫 패널과 구현 첫 화면을 같은 이미지에 나란히 배치해 비교했습니다. 두 화면 모두 흰 제목 영역, 검정 굵은 제목과 주황색 병아리 강조, 연두색 아이소메트릭 마을, 여러 병아리, 이름 입력, 산호색 확인 버튼의 동일한 시각 위계를 유지합니다. 구현은 더 긴 모바일 화면 비율을 사용해 마을 놀이 시설과 여백을 추가로 보여줍니다.

## Focused region comparison

제목과 이름 입력 영역이 전체 비교 이미지에서 충분히 읽히고, 주요 이미지와 버튼 경계도 선명해 별도 확대 비교는 필요하지 않았습니다.

## Required fidelity surfaces

- Fonts and typography: 굵은 둥근 계열의 시스템 한글 글꼴, 큰 검정 제목, 주황색 핵심 단어, 작은 녹색 영문 표기를 일관되게 적용했습니다.
- Spacing and layout rhythm: 제목 → 마을 장면 → 이름 카드 → 확인 버튼 순서가 세로 화면에서 분명합니다. 탭 영역은 최소 48px 이상입니다.
- Colors and visual tokens: 레퍼런스의 흰색, 라임색, 따뜻한 목재색, 주황색, 산호색, 녹색을 재현했습니다.
- Image quality and asset fidelity: 아이소메트릭 배경은 고해상도 래스터 이미지이며, 캐릭터·둥지·재화·미션 이미지는 실제 유니티 리소스입니다. 임시 그림이나 대체 캐릭터 이미지는 사용하지 않았습니다.
- Copy and content: 이름 짓기, 병아리 수첩, 둥지 배치, 마을 놀이의 흐름과 문구가 독립적으로 이해됩니다.

## Comparison history

### Pass 1

- [P2] 제목 아래 흰 여백이 레퍼런스보다 길어 마을 장면의 시작이 늦었습니다.
- Fix: 첫 화면과 배치 화면의 상단 흰 영역 높이를 235px에서 185px로 줄였습니다.

### Pass 2

- Post-fix evidence: `qa-comparison.png`
- Earlier P2 resolved. 레퍼런스와 구현에서 제목 바로 아래에 마을 장면이 시작되며, 주요 정보 밀도와 시선 흐름이 가까워졌습니다.
- 남은 P3: 기존 유니티 병아리는 레퍼런스의 입체 캐릭터보다 평면적인 표현입니다. 실제 게임 리소스를 유지한다는 제품 제약에 따른 의도된 차이로 분류했습니다.

## Interaction and console verification

- 이름 확인 → 수첩 → 둥지 회전·배치 → 마을 진입 흐름을 실제 브라우저에서 확인했습니다.
- 병아리 탭 시 대사 표시와 놀이 목표 0/3 → 1/3 갱신을 확인했습니다.
- 오늘의 할 일 패널 열기와 닫기를 확인했습니다.
- 브라우저 경고 및 오류 로그: 없음.

## Findings

현재 남아 있는 실행 가능한 P0/P1/P2 차이는 없습니다.

## Implementation checklist

- [x] 모바일 세로 비율
- [x] 참고 이미지의 아이소메트릭 마을 분위기
- [x] 유니티 병아리 리소스 사용
- [x] 이름 짓기·수첩·둥지 배치·마을 놀이
- [x] 터치 상호작용과 목표 진행도
- [x] 브라우저 오류 검사

final result: passed
