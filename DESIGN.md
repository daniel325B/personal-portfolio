# 자산 현황 Design System

## 1. Atmosphere & Identity
네오 브루탈리즘 자산 장부입니다. 따뜻한 종이 바탕, 검은 인쇄 잉크, 하나의 신호 레드가 금융 데이터를 기계 도면처럼 선명하게 구획합니다. 기억되는 시그니처는 빨간 수직 인덱스와 3px 검은 테두리, 그리고 한 방향의 단단한 오프셋 그림자입니다. 모든 금액은 큰 숫자로, 출처와 상태는 작고 촘촘한 모노스페이스 메타데이터로 읽힙니다.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---:|---|
| Canvas | `--canvas` | `#F3EFE4` | 전체 종이 바탕 |
| Surface | `--surface` | `#FFFDF7` | 카드와 입력 필드 |
| Ink | `--ink` | `#111111` | 본문, 테두리, 그림자 |
| Muted ink | `--muted` | `#5A554D` | 보조 설명 |
| Signal red | `--accent` | `#F33A31` | 주요 CTA, 핵심 지표, 활성 상태 |
| Signal red ink | `--accent-ink` | `#B71D18` | 작은 레이블과 보조 텍스트 |
| Signal yellow | `--warning` | `#FFD84A` | 키보드 포커스, 주의 상태 |
| Positive green | `--positive` | `#147A45` | 성공 상태 |
| Negative red | `--negative` | `#B71D18` | 삭제와 오류 |
| Line | `--line` | `#111111` | 구조 테두리와 구분선 |

색은 역할을 전달할 때만 사용합니다. 그라데이션과 투명 유리 효과는 사용하지 않습니다.

## 3. Typography

| Level | Size | Weight | Usage |
|---|---:|---:|---|
| Display | `clamp(2.75rem, 8vw, 5.5rem)` | 800 | 페이지 제목 |
| H2 | `1.25rem` | 800 | 카드 제목 |
| Body | `1rem` | 600 | 설명과 입력 |
| Meta | `.6875rem` | 800 | 영어 라벨, 출처, 수치 보조 정보 |

기본 글꼴은 Geist Korean fallback sans, 수치·메타는 Geist Mono입니다. 구조 라벨은 대문자와 넓은 자간을 사용하고, 한국어 본문은 자연스럽게 줄바꿈합니다.

## 4. Spacing & Layout

4px 기본 단위, 최대 폭 1180px, 24px 데스크톱/16px 모바일 외곽 여백을 사용합니다. 데스크톱은 2열 작업 그리드, 820px 이하는 한 열입니다. 카드 간격은 12px 또는 16px이며, 두꺼운 테두리가 여백의 일부로 읽히게 합니다.

## 5. Components

### Structural panel
- **Structure**: 제목/메타 + 본문 영역을 가진 사각형 카드
- **Variants**: 기본, 강조(빨간 인덱스), 비어 있음
- **States**: hover 시 2px 이동, empty 문구 유지
- **Accessibility**: 텍스트 대비 4.5:1 이상, 의미 있는 헤딩 순서

### Action button
- **Structure**: 짧은 동사형 레이블을 가진 사각 버튼
- **Variants**: primary, utility, danger, active, disabled
- **States**: hover 시 2px 이동과 하드 섀도 축소, active 시 원위치, focus 시 노란 외곽선, disabled는 불투명도와 커서로 표시
- **Accessibility**: 44px 이상 터치 영역, 키보드 포커스가 명확함

### Data row and allocation bar
- **Structure**: 이름/메타, 값, 보조 제어를 분리한 격자 행
- **Variants**: 보유 자산, 비어 있음, 현금 집계
- **States**: 값과 출처가 같은 시각적 무게를 갖지 않도록 분리
- **Accessibility**: 숫자와 비중은 색 외에 텍스트로도 표기

### Form controls
- **Structure**: 라벨 위, 사각형 컨트롤 아래
- **States**: default, hover, focus, disabled, search result
- **Accessibility**: 44px 이상 높이, 노란 focus ring, 한국어 레이블 유지

## 6. Motion & Interaction
상호작용 가능한 요소만 `transform`과 `background-color`을 120ms 동안 전환합니다. hover는 클릭 가능성과 상태 변화를 보여 주며, `prefers-reduced-motion`에서는 전환을 제거합니다.

## 7. Depth & Surface
깊이는 `3px solid var(--line)`과 `6px 6px 0 var(--ink)`의 단일 하드 섀도로 만듭니다. 반경은 0px이며, 그림자·그라데이션·블러로 부드럽게 만들지 않습니다.

## 8. Accessibility Constraints & Accepted Debt
WCAG 2.2 AA 대비, 모든 인터랙션의 키보드 포커스, 44px 터치 영역, `prefers-reduced-motion`을 준수합니다. 색상만으로 상태나 비중을 전달하지 않습니다. 허용된 부채는 없습니다.
