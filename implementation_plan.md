# Implementation Plan

[Overview]
월별 준비를 실제 게임 시작 시점의 플레이어/캐릭터/시작 손패 기준점으로 확장하고, 플레이어 덱/턴 진행/이벤트 카드 UI의 중복을 제거해 현재 손패 중심으로 이벤트 효과를 사용할 수 있게 한다.

현재 앱은 React + TypeScript + Vite 기반의 Pandemic Legacy Season 0 덱 카운터이며, 캠페인 생성 시 `CampaignState.players`를 저장하고 월별 준비(`MonthGameSetupWizard`)는 이 고정 플레이어 목록을 기준으로 시작 손패 수를 계산한다. 게임 결과 기록(`GameResultDialog`)은 플레이 날짜와 캐릭터 이름을 입력받고, `applyGameResult`가 결과 기록 시점에 캐릭터 목록을 저장한다. 이 구조 때문에 실제 플레이 월마다 플레이어 구성이 달라지는 상황을 월별 준비 단계에 반영할 수 없고, 캐릭터 이름도 게임 결과 입력 단계에 있어 시작 손패 배정과 자연스럽게 연결되지 않는다.

구현은 월별 준비 마법사에 “플레이어/캐릭터 설정” 단계를 추가하여 캠페인 기본 플레이어 목록을 기본값으로 채우되, 사용자가 해당 시점에 인원수와 플레이어명을 변경할 수 있도록 한다. 사용자가 확정한 월별 플레이어 목록은 캠페인 기본 `players`도 갱신하여 이후 월의 기본값으로 사용한다. 캐릭터 이름은 월별 준비에서 입력하고 `CampaignState.characters`에 저장하며, 게임 결과 기록에서는 더 이상 캐릭터명을 입력하지 않고 현재 저장된 캐릭터 목록을 결과 기록에 사용한다.

플레이 날짜 기본값은 현재 `new Date().toISOString().slice(0, 10)`으로 UTC 날짜를 잘라 사용하여 KST 자정 이후에도 전날이 표시될 수 있다. 브라우저 로컬 타임존 기준 `YYYY-MM-DD`를 만드는 유틸리티를 도입해 `GameResultDialog`의 기본 날짜에 사용한다.

플레이어 덱 영역은 현재 남은 수와 확률/구성 정보를 보여주는 동시에 카드 뽑기 기록 입력 UI를 가지고 있는데, 동일한 카드 뽑기 기능이 `TurnFlowPanel`에 이미 있으므로 플레이어 덱의 직접 뽑기 UI와 관련 props/핸들러를 제거한다. 대신 대륙별/진영별 남은 수와 나란히 남은 이벤트 카드 목록/수량을 보여주는 세 번째 컬럼을 추가하고, 각 이벤트 카드명에는 hover/focus 시 효과 설명을 볼 수 있는 tooltip/popover를 제공한다.

별도 `EventCardsPanel`은 제거하고, `TurnFlowPanel` 안에서 현재 플레이어 손패(`player-hand`)에 있는 이벤트 카드만 상시 표시한다. 효과가 지원되는 이벤트(`move-threat-discard-to-game-end`)는 기존 `applySupportedEventEffect` 경로를 재사용하고, 미지원 이벤트는 설명만 표시하거나 비활성 상태로 둔다. 이벤트 카드는 대부분 타이밍 제한이 없다는 요구에 맞춰 플레이어 드로우 단계와 위협 공개 단계 양쪽에서 항상 보이도록 한다.

[Types]
월별 준비 입력과 결과 기록 입력에 플레이어/캐릭터 데이터 흐름을 명시하는 타입 변경이 필요하다.

기존 `PlayerProfile`, `CharacterProfile`, `MissionResult`, `CampaignState`의 저장 구조는 유지한다. 새 영속 스키마 버전 증가는 필요하지 않다. 기존 `CampaignState.players: PlayerProfile[]`와 `CampaignState.characters?: CharacterProfile[]`를 그대로 사용해 월별 준비 결과를 저장한다.

`src/components/MonthGameSetupWizard.tsx`의 `Props.onSetup` 입력 타입을 다음 형태로 확장한다.

```ts
onSetup: (input: {
  players: PlayerProfile[];
  characters: CharacterProfile[];
  startingHands: StartingHandAssignment[];
  unidentifiedTargetCitySelections?: UnidentifiedTargetCitySelection[];
  initialThreatCardIds: string[];
}) => void;
```

`players` validation rules:
- 허용 인원수는 기존 캠페인 생성과 동일하게 2, 3, 4명이다.
- 각 `PlayerProfile.id`는 `p1`, `p2`, `p3`, `p4` 형식을 기본으로 생성한다.
- 이름은 trim 후 빈 문자열이면 제출 불가하다.
- 인원수 변경 시 기존 같은 index의 플레이어는 이름을 보존하고, 새 슬롯은 언어별 기본명(`플레이어 N`/`Player N`)으로 채운다.

`characters` validation rules:
- 월별 준비에서 현재 `players`별로 하나의 캐릭터 입력 슬롯을 제공한다.
- 각 `CharacterProfile.id`는 `character-${player.id}` 형식을 사용한다.
- `playerId`는 해당 플레이어의 id를 가진다.
- `name`은 입력값 trim 후 빈 문자열이면 해당 플레이어명으로 fallback한다.
- 기존 `campaign.characters`에 동일 `playerId`가 있으면 기본값으로 표시한다.

`src/App.tsx`의 `setupCurrentMonth` 입력 타입도 동일하게 확장한다.

```ts
function setupCurrentMonth(input: {
  players: PlayerProfile[];
  characters: CharacterProfile[];
  startingHands: StartingHandAssignment[];
  unidentifiedTargetCitySelections?: UnidentifiedTargetCitySelection[];
  unidentifiedTargetCitySelection?: UnidentifiedTargetCitySelection;
  initialThreatCardIds: string[];
})
```

`src/domain/campaignProgress.ts`의 `createGameDecksForMonth` 입력 타입은 이미 `players: PlayerProfile[]`를 받으므로 타입 구조를 유지하되 호출부가 월별 준비에서 확정한 `input.players`를 전달하도록 한다. `applyGameResult` 입력 타입은 `characters` 필드를 계속 요구하되, UI 컴포넌트가 아닌 App 레벨에서 `campaign.characters ?? []`를 넣어 호출하는 방식으로 변경한다.

`src/components/GameResultDialog.tsx`의 `Props.onSubmit` 타입은 캐릭터 입력을 제거한다.

```ts
onSubmit: (input: { playedAt?: string; missionResults: MissionResult[] }) => void;
```

`src/components/TurnFlowPanel.tsx`의 `Props`에 이벤트 효과 적용 핸들러를 추가한다.

```ts
onApplyEventEffect: (eventCardId: string, targetCardId?: string) => void;
```

`src/components/PlayerDeckPanel.tsx`의 `Props`에서 다음을 제거한다.

```ts
onDrawKnown: (cardId: string, destination: PlayerCardDestination) => void;
onResolveEscalation: () => void;
```

`PlayerDeckComposition`(`src/domain/probabilities.ts`)은 현재 `remainingEvents: number`만 제공하므로 필요 시 다음 필드를 추가한다.

```ts
remainingEventCardIds: string[];
```

이 필드는 `player-deck-unknown` zone에 남아 있는 이벤트 카드 id 목록이며, UI가 이름/효과 tooltip을 표시하는 데 사용한다. 기존 테스트와 호출부 호환을 위해 additive change로 유지한다.

[Files]
월별 준비, 게임 결과, 플레이어 덱, 턴 진행, 앱 연결부, 테스트 파일을 수정하고 별도 이벤트 카드 패널은 제거한다.

New files to be created:
- `src/lib/date.ts`: 브라우저/런타임 로컬 타임존 기준 날짜 문자열을 생성하는 `formatLocalDateInputValue(date?: Date): string` 유틸리티를 추가한다. 구현은 `getFullYear()`, `getMonth() + 1`, `getDate()`를 사용하고 `padStart(2, '0')`로 `YYYY-MM-DD`를 만든다.

Existing files to be modified:
- `src/components/MonthGameSetupWizard.tsx`
  - `PlayerProfile`, `CharacterProfile` 타입 import를 추가한다.
  - `playerCounts`, `defaultPlayerName`, `makePlayers` 또는 동등 helper를 추가한다.
  - step 수를 3단계에서 4단계로 확장한다.
  - 새 step 0에 플레이어 인원수, 플레이어명, 캐릭터명 입력 UI를 추가한다.
  - 기존 미식별/시험 대상 도시 준비는 step 1, 초기 위협 준비는 step 2, 시작 손패 배정은 step 3으로 이동한다.
  - 시작 손패 `requiredPerPlayer`와 `requiredTotal` 계산 기준을 `campaign.players.length`에서 로컬 상태 `players.length`로 변경한다.
  - `StartingHandAssignmentEditor`에 `players` 로컬 상태를 전달한다.
  - 인원수 변경 시 `startingHands`를 초기화하여 이전 인원 구성의 잘못된 배정을 방지한다.
  - `finish()`에서 `players`, `characters`, `startingHands`, `unidentifiedTargetCitySelections`, `initialThreatCardIds`를 함께 제출한다.
- `src/App.tsx`
  - `recordPlayerCardDraw`, `resolveEscalationDraw`, `PlayerCardDestination` import/사용을 제거한다.
  - `setupCurrentMonth`에서 `createGameDecksForMonth({ players: input.players, ... })`를 호출한다.
  - `setupCurrentMonth` 반환 campaign에 `players: input.players`, `characters: input.characters`를 저장하여 캠페인 기본 플레이어 목록도 갱신한다.
  - `recordGameResult`는 `GameResultDialog`에서 받은 `{ playedAt, missionResults }`에 `characters: campaign.characters ?? []`를 합쳐 `applyGameResult`를 호출한다.
  - `DeckCounterDashboard`에 `onPlayerDraw`, `onResolveEscalation` props를 더 이상 전달하지 않는다.
- `src/components/GameResultDialog.tsx`
  - 캐릭터 이름 상태와 UI를 제거한다.
  - `formatLocalDateInputValue`를 사용해 날짜 기본값을 로컬 타임존 기준으로 설정한다.
  - `submit()`은 `{ playedAt, missionResults }`만 제출한다.
  - 필요하면 현재 저장된 캐릭터 목록을 읽기 전용 요약으로 표시할 수 있지만 입력란은 두지 않는다.
- `src/components/DeckCounterDashboard.tsx`
  - `EventCardsPanel` import와 렌더링을 제거한다.
  - `PlayerCardDestination` import와 `onPlayerDraw`, `onResolveEscalation` props를 제거한다.
  - `TurnFlowPanel`에 `onApplyEventEffect`를 전달한다.
  - `PlayerDeckPanel` 호출에서 draw/resolve props를 제거한다.
- `src/components/PlayerDeckPanel.tsx`
  - 직접 카드 뽑기 관련 state(`selectedCardId`, `destination`), `drawableCards`, `drawOptions`, `SearchableSelect`, `NativeSelect`, `Button` import 중 불필요한 것들을 제거한다.
  - `onDrawKnown`, `onResolveEscalation` props를 제거한다.
  - 대륙별/진영별 남은 도시 grid를 `md:grid-cols-3`로 바꾸고 세 번째 카드/컬럼에 남은 이벤트 카드들을 렌더링한다.
  - 이벤트 카드 목록은 `state.cardStates[event.id]?.zone === 'player-deck-unknown'` 또는 `composition.remainingEventCardIds`를 기준으로 만들며, 카드명 옆/hover/focus에서 `effect.description[language] ?? notes[language]`를 표시한다.
  - tooltip은 기존 `Popover`, `PopoverTrigger`, `PopoverContent`를 사용하거나 native `title` 속성 + 접근 가능한 숨김 텍스트로 구현한다. Radix Popover 사용 시 클릭/포커스 중심이므로 hover 요구가 중요하면 CSS group hover 방식도 병행한다.
- `src/components/TurnFlowPanel.tsx`
  - `onApplyEventEffect` prop을 추가한다.
  - 손패 이벤트 카드 계산: `eventCards.filter(card => campaign.playerDeck.cardStates[card.id]?.zone === 'player-hand')`.
  - 기존 `EventCardsPanel`의 대상 선택 로직(`targetByEvent`, `discardCardIds`, `threatLabel`)을 이 컴포넌트로 통합한다.
  - `CardContent`의 step별 UI 아래/위에 “손패 이벤트 카드” 섹션을 항상 렌더링한다.
  - 지원 이벤트는 대상 위협 discard select와 “효과 적용” 버튼을 제공한다.
  - 미지원/정보성 이벤트는 효과 설명을 보여주고 버튼은 숨기거나 비활성화한다.
- `src/domain/probabilities.ts`
  - `PlayerDeckComposition`에 `remainingEventCardIds: string[]`를 추가하고 `calculatePlayerDeckComposition`에서 남은 이벤트 카드를 누적한다.
- `src/__tests__/campaignProgress.test.ts`
  - `createGameDecksForMonth`가 입력 `players` 길이에 따라 시작 손패 수를 계산한다는 테스트를 추가/수정한다.
  - `applyGameResult`는 기존처럼 characters를 저장하는 도메인 테스트를 유지한다.
- `src/__tests__/playerDeck.test.ts`
  - `calculatePlayerDeckComposition`에 `remainingEventCardIds`가 포함되는 테스트를 추가하거나 기존 기대값을 보강한다.
- `src/__tests__/turnFlow.test.ts`
  - 이벤트 패널 UI 자체는 컴포넌트 테스트가 없으므로 도메인 테스트 변경은 필수는 아니다. 기존 turn flow 도메인 테스트가 통과해야 한다.
- `src/__tests__/campaignPersistence.test.ts`
  - 타입/스키마 additive change가 영속 데이터 구조를 바꾸지 않으면 수정 불필요하다. 만약 테스트 fixture가 구조 비교를 엄격히 한다면 `remainingEventCardIds`는 영속 타입이 아니므로 영향 없음.

Files to be deleted or moved:
- `src/components/EventCardsPanel.tsx`는 더 이상 import되지 않게 만든 뒤 삭제할 수 있다. 삭제하지 않고 미사용 파일로 남기면 빌드에는 영향이 없지만 요구사항상 “영역을 따로 두지 말라”에 맞춰 `DeckCounterDashboard`에서 제거하는 것이 핵심이다. 구현 시 미사용 컴포넌트 삭제를 권장한다.

Configuration file updates:
- `package.json`, `tsconfig.json`, `vite.config.ts` 변경 없음.

[Functions]
월별 준비 제출 함수, 날짜 기본값 함수, 덱 구성 계산 함수, 주요 React 컴포넌트 함수의 props/로직 변경이 필요하다.

New functions:
- `formatLocalDateInputValue(date: Date = new Date()): string` in `src/lib/date.ts`
  - Purpose: `<input type="date">`에 넣을 로컬 타임존 기준 `YYYY-MM-DD` 값을 생성한다.
  - Signature: `export function formatLocalDateInputValue(date = new Date()): string`
  - Validation: 유효하지 않은 Date 처리까지 엄격히 할 필요는 없지만, 방어적으로 `Number.isNaN(date.getTime())`면 `new Date()`를 사용하게 할 수 있다.
- `defaultPlayerName(language: LanguageCode, index: number): string` in `src/components/MonthGameSetupWizard.tsx`
  - Purpose: 월별 준비에서 신규 플레이어 슬롯 기본명을 생성한다.
- `makePlayers(language: LanguageCode, count: number, existingPlayers?: PlayerProfile[]): PlayerProfile[]` in `src/components/MonthGameSetupWizard.tsx`
  - Purpose: 기존 캠페인 플레이어명을 보존하면서 인원수 변경에 맞춰 플레이어 배열을 만든다.
- `makeCharacters(players: PlayerProfile[], characterNames: Record<string, string>): CharacterProfile[]` in `src/components/MonthGameSetupWizard.tsx`
  - Purpose: 플레이어별 캐릭터 입력 상태를 `CharacterProfile[]`로 변환한다.
- `getPlayerHandEventCards(campaign: CampaignState, eventCards: EventCard[]): EventCard[]` in `src/components/TurnFlowPanel.tsx` or inline `useMemo`
  - Purpose: 현재 손패에 있는 이벤트 카드만 반환한다.
- `threatLabel(threatCardId: string, language: LanguageCode): string` in `src/components/TurnFlowPanel.tsx`
  - Purpose: 기존 `EventCardsPanel`의 위협 discard 대상 label 로직을 턴 진행 영역으로 이전한다.

Modified functions:
- `MonthGameSetupWizard(...)` in `src/components/MonthGameSetupWizard.tsx`
  - Add local state: `players`, `playerCount`, `characterNames`.
  - Change step order and validation.
  - Change `requiredPerPlayer` to depend on `players.length`.
  - Submit expanded payload.
- `setupCurrentMonth(...)` in `src/App.tsx`
  - Accept `players` and `characters`.
  - Pass `input.players` to `createGameDecksForMonth`.
  - Persist `players` and `characters` to campaign state.
- `recordGameResult(...)` in `src/App.tsx`
  - Accept no character input from dialog.
  - Call `applyGameResult(campaign, { ...input, characters: campaign.characters ?? [] })`.
- `GameResultDialog(...)` in `src/components/GameResultDialog.tsx`
  - Replace UTC ISO date default with `formatLocalDateInputValue()`.
  - Remove character input state and rendering.
- `DeckCounterDashboard(props)` in `src/components/DeckCounterDashboard.tsx`
  - Remove event panel rendering and player deck draw props.
  - Pass event effect handler into `TurnFlowPanel`.
- `PlayerDeckPanel(...)` in `src/components/PlayerDeckPanel.tsx`
  - Remove draw/resolve logic.
  - Add remaining event cards display with tooltip/popover.
- `TurnFlowPanel(...)` in `src/components/TurnFlowPanel.tsx`
  - Add event card hand section and supported effect application controls.
- `calculatePlayerDeckComposition(...)` in `src/domain/probabilities.ts`
  - Add `remainingEventCardIds` accumulation when event card zone is `player-deck-unknown`.

Removed functions/logic:
- `PlayerDeckPanel` direct draw submission logic using `recordKnownDraw` and destination select is removed because `TurnFlowPanel.submitPlayerDraw()` is the canonical draw path.
- App-level `onPlayerDraw` and `onResolveEscalation` callback plumbing through `DeckCounterDashboard` is removed from the dashboard path. Domain functions `recordPlayerCardDraw` and `resolveEscalationDraw` remain because `turnFlow.ts` uses them.

[Classes]
클래스 기반 구조가 없는 함수형 React/TypeScript 코드베이스이므로 클래스 추가/수정은 없다.

New classes:
- None.

Modified classes:
- None.

Removed classes:
- None.

[Dependencies]
새 외부 패키지 추가 없이 기존 React, Radix Popover, TypeScript, Vitest 의존성만 사용한다.

No package version changes are required. Hover/focus 설명은 기존 `@radix-ui/react-popover` 래퍼(`src/components/ui/popover.tsx`) 또는 native `title`/CSS로 처리한다. 날짜 처리는 외부 date library 없이 표준 `Date` API를 사용한다.

[Testing]
도메인 테스트와 빌드를 통해 플레이어 수 변경에 따른 시작 손패 수, 로컬 날짜 유틸, 이벤트 잔여 목록 계산, 기존 턴 진행 동작 보존을 검증한다.

Test file requirements:
- `src/__tests__/campaignProgress.test.ts`
  - 월별 준비에서 3명 또는 4명 플레이어를 `createGameDecksForMonth`에 전달했을 때 `playerDeck.startingHand.requiredPerPlayer`와 `requiredTotal`이 각각 3명→3/9, 4명→2/8로 계산되는지 확인한다.
  - `players` 입력이 기존 campaign.players와 달라도 입력 players 기준으로 deck이 생성되는지 확인한다.
- `src/__tests__/playerDeck.test.ts`
  - `calculatePlayerDeckComposition`이 `remainingEvents`와 함께 `remainingEventCardIds`를 반환하는지 확인한다.
- Optional new `src/__tests__/date.test.ts`
  - `formatLocalDateInputValue(new Date(2026, 4, 10, 1, 0))`가 `'2026-05-10'`을 반환하는지 확인한다. 이 테스트는 시스템 타임존 의존을 피하기 위해 local Date constructor를 사용한다.
- Component tests are not currently present. 컴포넌트 테스트를 새로 도입하지 않고 TypeScript build와 existing tests를 우선한다.

Validation strategy:
1. `npm test`로 도메인/유틸 테스트 통과 확인.
2. `npm run build`로 React props 변경, 미사용 import, TypeScript strict 오류 확인.
3. 구현 커밋 전 `git status --short`로 관련 파일만 staging한다.

[Implementation Order]
타입/유틸 → 월별 준비 데이터 흐름 → 결과 기록 날짜/캐릭터 이동 → 플레이어 덱/턴 진행 UI 통합 → 테스트/검증 순서로 구현한다.

1. Add `src/lib/date.ts` with `formatLocalDateInputValue` and optional unit test.
2. Update `src/domain/probabilities.ts` to include `remainingEventCardIds`, and update/add tests in `src/__tests__/playerDeck.test.ts`.
3. Extend `MonthGameSetupWizard` with player count/name and character name step; compute starting hand requirements from local monthly players; submit players and characters.
4. Update `App.setupCurrentMonth` to persist monthly players/characters and pass monthly players to `createGameDecksForMonth`; update related tests in `src/__tests__/campaignProgress.test.ts`.
5. Simplify `GameResultDialog` by removing character inputs and using `formatLocalDateInputValue` for the play date default; update `App.recordGameResult` to use stored campaign characters.
6. Remove direct draw/escalation controls from `PlayerDeckPanel` and add the third remaining-events column with effect tooltip/popover.
7. Move available event card functionality into `TurnFlowPanel`, filtering to event cards currently in `player-hand`, and wire `onApplyEventEffect` through `DeckCounterDashboard`.
8. Remove `EventCardsPanel` from `DeckCounterDashboard` and delete `src/components/EventCardsPanel.tsx` if no longer referenced.
9. Run `npm test` and fix regressions.
10. Run `npm run build` and fix TypeScript/build regressions.
11. Check `git status --short`, stage only relevant files, and create an atomic commit if implementation is requested in Act Mode.
