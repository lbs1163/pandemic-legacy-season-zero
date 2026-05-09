# Implementation Plan

[Overview]
2월부터 해금되는 신규 이벤트 카드 4장의 placeholder 효과 설명을 실제 카드 효과 한국어 원문과 영어 번역으로 교체한다.

현재 앱은 React + TypeScript + Vite 기반 Pandemic Legacy Season 0 덱 카운터이며, 플레이어 이벤트 카드는 `src/data/cards/events.ts`의 `eventCards` 정적 데이터로 정의된다. 월 준비 마법사(`src/components/MonthGameSetupWizard.tsx`)의 이벤트 선택 단계, 플레이어 덱 패널(`src/components/PlayerDeckPanel.tsx`)의 남은 이벤트 카드 tooltip, 턴 진행 패널(`src/components/TurnFlowPanel.tsx`)의 손패 이벤트 카드 영역은 모두 이 데이터의 `effect.description[language]`를 표시한다.

사용자가 지적한 문제는 2월 신규 이벤트 4장(`작전팀 급파`, `주말 접선`, `암호 메세지`, `관료주의의 덫`)이 실제 효과 대신 “카드에 적힌 효과를 적용합니다.” / “Resolve this event card according to its card text.”라는 일반 placeholder 문구를 가지고 있어 UI 어디에서도 실제 효과를 확인할 수 없다는 점이다. 기존 구조상 이 문제는 UI나 도메인 로직 변경 없이 카드 데이터만 정확히 수정하면 해결된다.

구현은 `src/data/cards/events.ts`에서 네 이벤트의 `effect.kind`는 현재처럼 `informational`로 유지하고, `effect.description`만 실제 효과로 교체하는 방식으로 진행한다. 이 네 효과는 게임 상태를 자동으로 변경하기 어려운 보드판/말/플레이어 손패 상호작용에 관한 설명형 이벤트이므로, 현재 앱의 “자동 적용 미지원: 수동 처리” UX와 일관되게 informational 이벤트로 남긴다. 또한 2월 이벤트 카드의 설명이 회귀되지 않도록 `src/__tests__/campaignProgress.test.ts`의 이벤트 가용성 테스트 또는 신규 데이터 테스트에 명시적 검증을 추가한다.

[Types]
새 타입 추가나 타입 구조 변경 없이 기존 `EventCard`, `EventEffectDefinition`, `EventEffectKind`, `LocalizedText` 타입을 그대로 사용한다.

관련 타입은 `src/types/cards.ts`에 이미 정의되어 있다.

```ts
export interface LocalizedText {
  en: string;
  ko: string;
}

export type EventEffectKind = 'move-threat-discard-to-game-end' | 'informational' | 'unknown';

export interface EventEffectDefinition {
  kind: EventEffectKind;
  description: LocalizedText;
}

export interface EventCard extends BaseCard {
  kind: 'event';
  initialSet: boolean;
  availability?: EventAvailability;
  effect?: EventEffectDefinition;
}
```

각 2월 신규 이벤트 카드는 다음 데이터 규칙을 따른다.

- 공통 필드:
  - `kind: 'event'`
  - `initialSet: false`
  - `availability: { fromMonth: 'february' }`
  - `effect.kind: 'informational'`
  - `effect.description.en`: 자연스러운 영어 번역
  - `effect.description.ko`: 사용자가 제공한 한국어 원문 그대로
- `event-dispatch-teams` (`작전팀 급파`):
  - `ko`: `모든 작전팀 말을 해당 말이 현재 위치한 도시에서 최대 3칸 떨어진 도시로 이동시킵니다.`
  - `en`: `Move every team pawn to a city up to 3 connections away from the city that pawn is currently in.`
- `event-weekend-rendezvous` (`주말 접선`):
  - `ko`: `아무 캐릭터 말 하나 또는 여럿을 다른 캐릭터 말이 있는 도시 1곳으로 옮길 수 있습니다.`
  - `en`: `You may move one or more character pawns to one city containing another character pawn.`
- `event-coded-message` (`암호 메세지`):
  - `ko`: `플레이어 2명을 선택합니다. 그 둘이 각자 손에 든 플레이어 카드 1장씩을 골라 서로 교환합니다.`
  - `en`: `Choose 2 players. Each chooses 1 Player card from their hand, then they exchange those cards.`
- `event-bureaucratic-trap` (`관료주의의 덫`):
  - `ko`: `게임판에서 소련 비밀요원 말 1개 또는 2개를 제거합니다.`
  - `en`: `Remove 1 or 2 Soviet agent pawns from the board.`

검증 규칙:

- 네 이벤트 모두 placeholder 문구를 포함하지 않아야 한다.
- 네 이벤트 모두 `effect`가 존재해야 한다.
- 네 이벤트 모두 `effect.kind === 'informational'`이어야 한다.
- 네 이벤트 모두 `availability.fromMonth === 'february'`이어야 한다.

[Files]
카드 데이터 파일을 수정하고 이벤트 설명 회귀 방지 테스트를 추가 또는 확장한다.

- New files to be created:
  - 없음. 기존 테스트 파일에 검증을 추가하는 방식이 가장 작고 일관적이다.

- Existing files to be modified:
  - `src/data/cards/events.ts`
    - `event-dispatch-teams`의 `effect.description`을 실제 `작전팀 급파` 효과 한국어/영어 설명으로 교체한다.
    - `event-weekend-rendezvous`의 `effect.description`을 실제 `주말 접선` 효과 한국어/영어 설명으로 교체한다.
    - `event-coded-message`의 `effect.description`을 실제 `암호 메세지` 효과 한국어/영어 설명으로 교체한다.
    - `event-bureaucratic-trap`의 `effect.description`을 실제 `관료주의의 덫` 효과 한국어/영어 설명으로 교체한다.
    - 각 항목은 기존 한 줄 object literal을 여러 줄로 정리해 초기 이벤트 카드들과 같은 가독성 패턴을 따르는 것을 권장한다.
  - `src/__tests__/campaignProgress.test.ts`
    - 기존 `filters event card availability by month` 테스트 뒤에 “2월 이벤트 설명이 실제 효과를 포함한다” 테스트를 추가한다.
    - 테스트는 `eventCards`에서 네 id를 찾아 `effect.description.ko`, `effect.description.en`, `effect.kind`, `availability.fromMonth`를 검증한다.
    - 또는 같은 파일의 이벤트 가용성 테스트를 확장할 수 있으나, 실패 원인이 명확하도록 별도 `it(...)` 블록을 권장한다.

- Files to be deleted or moved:
  - 없음.

- Configuration file updates:
  - 없음. `package.json`, `tsconfig.json`, `vite.config.ts`, 저장 스키마 파일(`src/services/localCache.ts`)은 변경하지 않는다.

[Functions]
런타임 함수의 동작 변경은 없으며 테스트 내부의 작은 helper 함수만 선택적으로 추가한다.

- New functions:
  - 선택 사항: 테스트 파일 내부 helper `getEventCard(cardId: string)`
    - File: `src/__tests__/campaignProgress.test.ts`
    - Suggested signature:
      ```ts
      function getEventCard(cardId: string) {
        const card = eventCards.find((eventCard) => eventCard.id === cardId);
        if (!card) throw new Error(`Missing event card: ${cardId}`);
        return card;
      }
      ```
    - Purpose: 테스트에서 네 2월 이벤트 카드를 안전하게 조회하고 non-null assertion 반복을 줄인다.
    - Scope: 테스트 파일 내부 전용. export하지 않는다.

- Modified functions:
  - 없음. `src/domain/events.ts`의 `applySupportedEventEffect`는 `move-threat-discard-to-game-end` 자동 처리 전용이며, 이번 네 이벤트는 자동 처리 대상이 아니므로 수정하지 않는다.
  - 없음. `src/components/MonthGameSetupWizard.tsx`, `src/components/PlayerDeckPanel.tsx`, `src/components/TurnFlowPanel.tsx`는 이미 `card.effect.description[language]`를 표시하므로 수정하지 않는다.

- Removed functions:
  - 없음.

[Classes]
클래스 기반 구조가 없는 함수형 React/도메인 코드이므로 클래스 추가, 수정, 삭제는 없다.

- New classes:
  - 없음.

- Modified classes:
  - 없음.

- Removed classes:
  - 없음.

[Dependencies]
새 패키지나 버전 변경은 필요하지 않으며 기존 TypeScript와 Vitest만 사용한다.

- New packages:
  - 없음.

- Version changes:
  - 없음.

- Integration requirements:
  - `src/data/cards/events.ts`는 기존 `EventCard` 타입 import만 계속 사용한다.
  - `src/__tests__/campaignProgress.test.ts`는 이미 `eventCards`를 import하고 있으므로 추가 import가 필요 없다.
  - 저장 데이터 구조가 바뀌지 않으므로 migration, Zod schema, GitHub gist sync 관련 변경은 필요 없다.

[Testing]
정적 이벤트 데이터 회귀 테스트를 추가하고 전체 테스트 및 빌드를 실행한다.

테스트 요구사항:

- Test file: `src/__tests__/campaignProgress.test.ts`
- 신규 테스트명 권장:
  - `it('defines February event card effect descriptions', () => { ... })`
- 테스트 데이터:
  ```ts
  const februaryEventExpectations = [
    {
      id: 'event-dispatch-teams',
      ko: '모든 작전팀 말을 해당 말이 현재 위치한 도시에서 최대 3칸 떨어진 도시로 이동시킵니다.',
      en: 'Move every team pawn to a city up to 3 connections away from the city that pawn is currently in.'
    },
    {
      id: 'event-weekend-rendezvous',
      ko: '아무 캐릭터 말 하나 또는 여럿을 다른 캐릭터 말이 있는 도시 1곳으로 옮길 수 있습니다.',
      en: 'You may move one or more character pawns to one city containing another character pawn.'
    },
    {
      id: 'event-coded-message',
      ko: '플레이어 2명을 선택합니다. 그 둘이 각자 손에 든 플레이어 카드 1장씩을 골라 서로 교환합니다.',
      en: 'Choose 2 players. Each chooses 1 Player card from their hand, then they exchange those cards.'
    },
    {
      id: 'event-bureaucratic-trap',
      ko: '게임판에서 소련 비밀요원 말 1개 또는 2개를 제거합니다.',
      en: 'Remove 1 or 2 Soviet agent pawns from the board.'
    }
  ];
  ```
- Expectations for each item:
  - `card` exists.
  - `card.availability` equals `{ fromMonth: 'february' }` or at least `card.availability?.fromMonth === 'february'`.
  - `card.effect?.kind === 'informational'`.
  - `card.effect?.description.ko === expectation.ko`.
  - `card.effect?.description.en === expectation.en`.
  - `card.effect?.description.ko` does not match `/카드에 적힌 효과/`.
  - `card.effect?.description.en` does not match `/Resolve this event card according to its card text/`.

Validation commands:

1. `npm test`
2. `npm run build`

Commit workflow:

- 구현 전 `git status --short | cat`으로 작업 트리 상태를 확인한다.
- 관련 파일만 stage한다: `src/data/cards/events.ts`, `src/__tests__/campaignProgress.test.ts`, `implementation_plan.md`는 사용자가 계획 문서까지 커밋하길 원하는지 확인 후 포함 여부를 결정한다. 일반 구현 커밋에는 코드/테스트 파일만 포함하는 것을 권장한다.
- 테스트와 빌드가 통과하면 atomic commit을 생성한다.
- 권장 커밋 메시지: `Add February event effect text`

[Implementation Order]
카드 데이터 수정, 회귀 테스트 추가, 검증, 커밋 순서로 진행한다.

1. `git status --short | cat`으로 작업 트리 상태를 확인하고 관련 없는 변경이 있으면 사용자에게 확인한다.
2. `src/data/cards/events.ts`에서 `event-dispatch-teams`, `event-weekend-rendezvous`, `event-coded-message`, `event-bureaucratic-trap`의 placeholder `effect.description`을 실제 한국어 원문과 영어 번역으로 교체한다.
3. 네 이벤트 항목을 기존 초기 이벤트 카드들과 같은 multi-line object 스타일로 정리해 가독성을 높인다.
4. `src/__tests__/campaignProgress.test.ts`에 2월 이벤트 설명 회귀 테스트를 추가한다.
5. `npm test`를 실행해 이벤트 데이터 및 기존 도메인 회귀 테스트를 검증한다.
6. `npm run build`를 실행해 TypeScript와 production build를 검증한다.
7. `git status --short | cat`으로 변경 파일을 확인하고 관련 파일만 stage한다.
8. 테스트가 통과한 상태로 atomic commit을 생성한다.
