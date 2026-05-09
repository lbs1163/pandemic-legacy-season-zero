# Implementation Plan

[Overview]
손패 이벤트 카드 사용 시 해당 이벤트를 손패에서 제거하고, 월 결과 기록 후 다음 달을 준비 전 상태로 전환하도록 캠페인 진행 흐름을 수정한다.

현재 앱은 React + TypeScript + Vite 기반의 Pandemic Legacy Season 0 덱 카운터이며, 캠페인 상태는 `CampaignState` 안의 `progress`, `playerDeck`, `threatDeck`, `turnFlow`로 관리된다. 사용자가 보고한 첫 번째 문제는 `TurnFlowPanel`의 “손패 이벤트 카드” 영역에서 `applySupportedEventEffect`를 호출해 위협 버림 더미 카드를 게임 종료 구역으로 이동하더라도, 사용한 이벤트 카드 자체는 여전히 `player-hand`에 남아 동일 이벤트를 다시 적용할 수 있다는 점이다. 실제 보드게임 규칙상 이벤트 카드는 사용 후 버려지므로, 지원되는 이벤트 효과 적용 로직이 효과 처리와 이벤트 카드 버림을 하나의 원자적 상태 변경으로 처리해야 한다.

두 번째 문제는 `applyGameResult`가 `progress.currentMonth`와 자금/시도 정보를 다음 상태로 갱신하지만, `playerDeck`, `threatDeck`, `turnFlow`는 방금 끝난 월의 실제 게임 중 상태를 그대로 유지한다는 점이다. 그 결과 UI는 새 월로 표시되지만 `isCampaignMonthSetupComplete`가 이전 월의 손패/위협 버림 상태를 보고 true를 반환할 수 있어, 다음 달 준비 단계로 자연스럽게 넘어가지 않는다. 결과 기록은 `CampaignGameRecord`에 남기고, 현재 캠페인의 활성 덱 상태는 다음 월 기준의 “준비 전” 상태로 리셋해 `DeckCounterDashboard`가 “월 준비가 필요합니다” 게이트를 표시하도록 해야 한다.

고수준 접근은 도메인 계층에서 상태 전이를 명확히 하는 것이다. 이벤트 사용은 `src/domain/events.ts`에서 `movePlayerCard`를 함께 적용해 이벤트 카드의 zone을 `player-discard`로 바꾼다. 월 결과 기록은 `src/domain/campaignProgress.ts`에 다음 월/재시도 상태에 맞춘 준비 전 덱 초기화 헬퍼를 추가하고, `applyGameResult` 반환값에 초기화된 `playerDeck`, `threatDeck`, `turnFlow`를 포함한다. 테스트는 기존 도메인 테스트 파일에 동작 회귀 케이스를 추가해 UI 없이 핵심 상태 전이를 검증한다.

[Types]
새로운 영속 타입이나 스키마 버전 변경 없이 기존 `PlayerCardZone`, `CampaignState`, `PlayerDeckState`, `ThreatDeckState`, `TurnFlowState` 타입을 그대로 사용한다.

구체 타입 변경은 필요하지 않다. 이미 `src/types/deck.ts`의 `PlayerCardZone`에는 `player-discard`가 포함되어 있고, `movePlayerCard(state, cardId, zone, ownerPlayerId?)`가 임의 플레이어 카드의 zone 변경을 지원한다. 이벤트 카드 사용 후 상태는 다음 규칙을 따른다.

- 이벤트 카드 상태 변경 대상: `CampaignState.playerDeck.cardStates[input.eventCardId]`
- 적용 전 검증:
  - `eventCardId`가 `src/data/cards/events.ts`의 `eventCards`에 존재해야 한다.
  - 이벤트 효과가 지원되는 종류(`move-threat-discard-to-game-end`)여야 한다.
  - 대상 위협 카드가 필요한 이벤트에서는 `targetCardId`가 있어야 한다.
  - 사용하려는 이벤트 카드의 현재 zone은 `player-hand`여야 한다.
- 적용 후 이벤트 카드 상태:
  - `zone: 'player-discard'`
  - `ownerPlayerId: undefined` 권장. 버림 더미에서는 소유자 정보가 필요 없으며, 기존 `recordPlayerCardDraw`도 손패 외 zone에는 owner를 설정하지 않는다.
  - `updatedAt`: 이벤트 효과 적용 시각(`input.now ?? new Date().toISOString()`)과 동일한 timestamp 사용.

월 결과 기록 후 다음 준비 전 상태도 기존 타입만 사용한다.

- `CampaignState.progress.currentMonth`: 다음 월 또는 재시도 시 현재 월
- `CampaignState.progress.currentAttempt`: 재시도면 2, 다음 월이면 1
- `CampaignState.progress.fundingLevel`: 결과 기반 다음 자금 단계
- `CampaignState.playerDeck`: `createInitialPlayerDeckState`로 생성한 미설정 플레이어 덱
  - `startingHand.configured: false`
  - `unidentifiedTargetCities: []`
  - 현재 월에 사용 가능한 이벤트 카드 전체를 포함한 초기 cardStates
- `CampaignState.threatDeck`: `createInitialThreatDeckState`로 생성한 미설정 위협 덱
  - `discardCardIds: []`
  - `knownTopStacks: []`
  - `knownTopStackCardIds: []`
  - `gameEndAreaCardIds: []`
- `CampaignState.turnFlow`: `{ step: 'player-draw', turnNumber: 1 }`

주의: `CampaignGameRecord`는 현재 덱 스냅샷을 저장하지 않는 구조이므로 “결과 기록”은 월/시도/자금/플레이어/캐릭터/임무 결과만 기존 방식대로 저장한다. 사용자가 요청한 “그 상태 그대로 저장”은 현재 타입 구조 안에서는 `gameRecords`에 결과를 기록하는 의미로 처리하고, 별도 덱 스냅샷 타입은 추가하지 않는다.

[Files]
핵심 도메인 파일과 도메인 테스트 파일을 수정하며, 설정 파일이나 의존성 파일은 변경하지 않는다.

- New files to be created:
  - 없음.

- Existing files to be modified:
  - `src/domain/events.ts`
    - `movePlayerCard`를 import한다.
    - `applySupportedEventEffect`에서 지원 이벤트 효과를 처리한 뒤 `playerDeck`의 이벤트 카드 상태를 `player-discard`로 이동한다.
    - 이벤트 카드가 현재 `player-hand`에 없으면 명확한 에러를 던지도록 검증을 추가한다.
    - 효과 처리와 이벤트 카드 버림에 동일한 `now` timestamp를 사용한다.
  - `src/domain/campaignProgress.ts`
    - 다음 월/시도 준비 전 덱을 만드는 내부 헬퍼를 추가한다.
    - `applyGameResult`가 결과 기록 후 `playerDeck`, `threatDeck`, `turnFlow`를 새 준비 전 상태로 교체하도록 수정한다.
    - 재시도(`failure`이면서 첫 번째 시도)도 “다시 준비 단계로 넘어간다”는 흐름에 맞춰 같은 월의 준비 전 덱으로 리셋한다.
    - 다음 월의 이벤트 카드 가용성은 `getDefaultAvailableEventCardsForMonth(nextMonth)` 기준으로 초기화한다.
  - `src/__tests__/turnFlow.test.ts`
    - 또는 별도 이벤트 도메인 테스트 파일 대신 이 파일/기존 테스트 구조에 이벤트 사용 후 손패에서 제거되는 테스트를 추가할 수 있다. 다만 더 명확하게는 새 테스트 파일 없이 `campaignProgress.test.ts`와 별개로 `src/__tests__/events.test.ts`를 만들 수도 있다.
  - `src/__tests__/campaignProgress.test.ts`
    - 결과 기록 후 다음 월의 덱이 준비 전 상태(`isCampaignMonthSetupComplete(next) === false`)가 되는 회귀 테스트를 추가한다.
    - 기존 “advances after success or adequate result” 테스트에 `playerDeck.startingHand.configured === false`, `threatDeck.discardCardIds === []`, `turnFlow === { step: 'player-draw', turnNumber: 1 }` 검증을 추가하거나 별도 테스트로 분리한다.
    - 재시도 케이스도 기존 상태가 유지되지 않고 같은 월 준비 전 상태로 리셋되는지 검증한다.
  - `src/__tests__/playerDeck.test.ts` 또는 신규 `src/__tests__/events.test.ts`
    - `applySupportedEventEffect`가 이벤트 카드 zone을 `player-discard`로 바꾸고 위협 카드 이동도 수행하는지 검증한다.
    - 이벤트 카드가 손패에 없으면 적용을 거부하는지 검증한다.

- Files to be deleted or moved:
  - 없음.

- Configuration file updates:
  - 없음. `package.json`, `tsconfig.json`, `vite.config.ts`, `src/services/localCache.ts` 스키마 버전은 변경하지 않는다.

[Functions]
이벤트 효과 함수와 게임 결과 적용 함수의 상태 전이를 확장하고, 월 준비 전 덱 생성용 내부 헬퍼를 추가한다.

- New functions:
  - `createUnconfiguredDecksForMonth` 또는 유사한 이름의 내부 함수
    - File: `src/domain/campaignProgress.ts`
    - Suggested signature:
      ```ts
      function createUnconfiguredDecksForMonth(input: {
        month: CampaignMonthId;
        players: PlayerProfile[];
        now: string;
      }): Pick<CampaignState, 'playerDeck' | 'threatDeck' | 'turnFlow'>
      ```
    - Purpose: 지정 월의 가용 이벤트 카드 전체와 도시 카드, 악화 카드, 위협 카드를 사용해 “월 준비 전” 상태의 `playerDeck`, `threatDeck`, `turnFlow`를 생성한다.
    - Behavior:
      - `playerCardIds`: `cityCards.map(id)` + `getDefaultAvailableEventCardsForMonth(month).map(id)`
      - `playerCount`: `players.length`가 2~4 범위라는 전제는 기존 캠페인 생성/월 준비 UI가 보장한다. 방어적으로 `Math.min(4, Math.max(2, players.length || 2))`를 사용할 수 있다.
      - `escalationCardIds`: `escalationCards.map(id)`
      - `threatDeck`: `createInitialThreatDeckState(threatCards.map(id), now)`
      - `turnFlow`: `{ step: 'player-draw', turnNumber: 1 }`
  - 선택 사항: `assertEventCardInHand`
    - File: `src/domain/events.ts`
    - Suggested signature:
      ```ts
      function assertEventCardInHand(campaign: CampaignState, eventCardId: string): void
      ```
    - Purpose: 이벤트 카드 중복 사용 방지와 명확한 에러 메시지 제공.

- Modified functions:
  - `applySupportedEventEffect`
    - Current file: `src/domain/events.ts`
    - Required changes:
      - `movePlayerCard`를 사용하기 위해 import를 `import { movePlayerCard } from './playerDeck';`로 추가한다.
      - `const timestamp = input.now ?? new Date().toISOString();`를 생성한다.
      - 이벤트 카드의 `cardStates[eventCardId]?.zone`이 `player-hand`인지 검증한다.
      - 기존 `threatDeck: moveDiscardedThreatCardToGameEndArea(...)` 처리 결과와 함께 `playerDeck: movePlayerCard(campaign.playerDeck, input.eventCardId, 'player-discard')`를 반환한다.
      - `updatedAt`은 `timestamp`를 사용한다.
      - `movePlayerCard`가 현재 `now`를 외부에서 받지 못하므로, timestamp 일관성을 엄격히 맞추려면 `movePlayerCard`에 optional `now?: string`을 추가하는 방안도 가능하다. 더 작은 변경을 선호하면 `movePlayerCard`의 자체 timestamp를 사용하고 campaign `updatedAt`만 `timestamp`로 둔다. 권장안은 아래 수정이다.
  - `movePlayerCard`
    - Current file: `src/domain/playerDeck.ts`
    - Suggested signature change:
      ```ts
      export function movePlayerCard(
        state: PlayerDeckState,
        cardId: string,
        zone: PlayerCardZone,
        ownerPlayerId?: string,
        now?: string
      ): PlayerDeckState
      ```
    - Required changes:
      - 기존 호출부가 없거나 optional 파라미터만 추가하므로 호환성 영향이 작다.
      - `updatedAt: nowIso(now)`를 사용한다.
      - 가능하면 `existing` 검증을 추가해 알 수 없는 카드 이동 시 에러를 던진다. 현재 구현은 unknown card도 새로 만들어버릴 수 있으므로 도메인 안전성이 좋아진다.
  - `applyGameResult`
    - Current file: `src/domain/campaignProgress.ts`
    - Required changes:
      - 기존 record 생성, rating, funding, nextMonth/nextAttempt 계산은 유지한다.
      - 반환 직전 `const resetDecks = createUnconfiguredDecksForMonth({ month: nextMonth, players: campaign.players, now });` 또는 characters/player 업데이트 정책에 맞춘 players를 사용한다.
      - 반환 객체에 `...resetDecks`를 포함해 이전 월의 `playerDeck`, `threatDeck`, `turnFlow`를 교체한다.
      - `currentMonth`/`fundingLevel` 최상위 호환 필드와 `progress` 내부 필드는 기존처럼 동기화한다.
      - `characters: input.characters`는 유지한다.

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
새 패키지나 버전 변경은 필요하지 않으며 기존 TypeScript, Vitest, React 의존성만 사용한다.

- New packages:
  - 없음.

- Version changes:
  - 없음.

- Integration requirements:
  - `src/domain/events.ts`가 `src/domain/playerDeck.ts`의 `movePlayerCard`를 추가 import한다.
  - `src/domain/campaignProgress.ts`는 이미 `createInitialPlayerDeckState`, `createInitialThreatDeckState`, `cityCards`, `eventCards`, `threatCards`, `escalationCards`를 import하고 있으므로 대부분 기존 import를 재사용한다.
  - 저장 스키마 변경이 없으므로 `src/services/localCache.ts`와 `src/types/sync.ts` 변경은 피한다.

[Testing]
도메인 단위 테스트를 추가/수정하고 `npm test`와 `npm run build`로 회귀를 검증한다.

테스트 요구사항:

- 이벤트 카드 사용 후 손패 제거:
  - Test file: `src/__tests__/events.test.ts` 신규 생성 권장 또는 기존 테스트 파일에 추가.
  - Setup:
    - `createInitialCampaign`으로 캠페인을 만든다.
    - 이벤트 카드 `event-counterintelligence-team`을 `player-hand`로 둔다. 간단히 `campaign.playerDeck.cardStates[eventId] = { cardId: eventId, zone: 'player-hand', ownerPlayerId: 'p1', updatedAt: ... }` 형태로 테스트 상태를 구성할 수 있다.
    - 위협 덱 discard에 대상 위협 카드를 둔다. 기존 `recordInitialThreatSetup` 또는 직접 상태 구성 중 현재 테스트 패턴에 맞는 더 단순한 방법을 사용한다.
  - Expectations:
    - `applySupportedEventEffect(...).threatDeck.gameEndAreaCardIds`에 target threat card가 포함된다.
    - `threatDeck.discardCardIds`에서 target threat card가 제거된다.
    - `playerDeck.cardStates[eventId].zone`이 `player-discard`가 된다.
    - `ownerPlayerId`가 제거되었거나 undefined가 된다.
  - Negative test:
    - 이벤트 카드가 `player-deck-unknown` 또는 `player-discard`인 상태에서 적용하면 `/hand/` 또는 한국어가 아닌 명확한 영어 에러 메시지 매칭으로 throw를 검증한다.

- 월 결과 기록 후 다음 달 준비 전 상태:
  - Test file: `src/__tests__/campaignProgress.test.ts`
  - Existing test `advances after success or adequate result and records game history` 확장 또는 신규 테스트 추가.
  - Setup:
    - `createGameDecksForMonth`로 프롤로그를 준비 완료 상태로 만든 캠페인을 만든다.
    - 필요하면 `completePlayerDrawStep` 등으로 손패/덱 상태를 바꾼 뒤 `applyGameResult`를 호출한다.
  - Expectations:
    - `next.progress.currentMonth === 'january'`
    - `next.progress.gameRecords[0].month === 'prologue'`
    - `isCampaignMonthSetupComplete(next) === false`
    - `next.playerDeck.startingHand.configured === false`
    - `next.threatDeck.discardCardIds.length === 0`
    - `next.turnFlow`가 `{ step: 'player-draw', turnNumber: 1 }`
    - `next.playerDeck.cardStates`에는 1월 기준 사용 가능 이벤트가 포함된다.
  - Retry test:
    - 첫 번째 실패 결과 후 `progress.currentMonth`는 같은 월, `currentAttempt`는 2가 되지만 덱은 준비 전 상태로 리셋됨을 검증한다.

Validation commands:

1. `npm test`
2. `npm run build`

커밋 workflow:

- 구현 전 `git status --short | cat`으로 사용자 변경 여부 확인.
- 변경 파일만 stage.
- 테스트 통과 후 atomic commit 생성.
- 권장 커밋 메시지: `Reset month setup after results and discard used events`

[Implementation Order]
도메인 상태 전이부터 고치고 테스트를 보강한 뒤 전체 검증과 커밋을 수행한다.

1. `git status --short | cat`으로 작업 트리 상태를 확인하고, 관련 없는 변경이 있으면 사용자에게 확인한다.
2. `src/domain/playerDeck.ts`의 `movePlayerCard`에 unknown card 검증과 optional `now` 파라미터를 추가한다.
3. `src/domain/events.ts`의 `applySupportedEventEffect`를 수정해 이벤트 카드가 손패에 있을 때만 효과를 적용하고, 효과 적용 후 이벤트 카드를 `player-discard`로 이동한다.
4. 이벤트 효과 회귀 테스트를 `src/__tests__/events.test.ts`에 추가하거나 기존 테스트 구조에 맞춰 추가한다.
5. `src/domain/campaignProgress.ts`에 다음 월/재시도용 준비 전 덱 초기화 헬퍼를 추가하고, `applyGameResult` 반환값에 초기화된 `playerDeck`, `threatDeck`, `turnFlow`를 포함한다.
6. `src/__tests__/campaignProgress.test.ts`에 결과 기록 후 다음 월/재시도 상태가 “월 준비 필요”로 리셋되는 테스트를 추가하고 기존 진행 테스트 기대값을 필요한 만큼 보강한다.
7. `npm test`를 실행해 도메인 회귀 테스트를 검증한다.
8. `npm run build`를 실행해 TypeScript와 production build를 검증한다.
9. `git status --short | cat`으로 변경 파일을 확인하고 관련 파일만 stage한다.
10. 테스트가 통과한 상태로 atomic commit을 생성한다.
