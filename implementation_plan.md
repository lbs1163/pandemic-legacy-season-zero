# Implementation Plan

[Overview]
매월 게임 준비 단계에서 자동 계산된 자금 지원 단계는 유지하되, 이번 달에 사용할 자금 지원 단계를 사용자가 직접 조정할 수 있게 하고 일반 설정과 다를 때 경고를 표시한다.

현재 앱은 TypeScript/React/Vite 기반의 Pandemic Legacy Season 0 덱 카운터이며, 캠페인 진행 상태는 `src/types/campaign.ts`의 `CampaignProgressState.fundingLevel`에 저장된다. 게임 결과를 기록하면 `src/domain/campaignProgress.ts`의 `applyGameResult`가 성공/양호/실패 평가를 계산하고 `calculateNextFundingLevel`로 다음 월 또는 재시도에 사용할 기본 자금 지원 단계를 갱신한다. 이 자동 변화 추적은 월별 결과 기록과 캠페인 타임라인의 핵심 기능이므로 그대로 유지해야 한다.

현재 월 준비 마법사(`src/components/MonthGameSetupWizard.tsx`)는 `campaign.progress.fundingLevel`을 그대로 사용해 이벤트 카드 선택 수를 결정하고, `src/App.tsx`의 `setupCurrentMonth`는 이 값을 수정하지 않은 채 `createGameDecksForMonth`를 호출한다. 사용자는 룰북의 보정 지침에 따라 매월 준비 시점에 자금 지원 단계를 임의로 조정하고 싶어 하므로, 월 준비 마법사 첫 단계 또는 이벤트 선택 전 단계에서 “이번 달 자금 지원 단계” 입력을 제공하고, 그 값으로 이번 달 이벤트 카드 요구 수와 덱 생성을 처리해야 한다.

구현 방향은 저장 모델에 별도 “수동 오버라이드 이력” 필드를 추가하지 않고, 사용자가 월 준비를 적용하는 순간 `campaign.progress.fundingLevel` 및 레거시 호환 필드 `campaign.fundingLevel`을 선택한 값으로 갱신하는 것이다. 이렇게 하면 게임 결과 기록 시 `CampaignGameRecord.fundingLevel`에는 실제로 그 게임에 사용한 자금 지원 단계가 기록되고, 다음 달 기본 자금 지원 단계도 기존 `applyGameResult` 규칙에 따라 그 실제 사용 값을 기준으로 계산된다. 또한 선택 값이 준비 시작 시점의 자동/현재 값과 다르면 UI에 경고 문구를 보여 일반 설정과 다름을 명확히 알린다.

[Types]  
월별 준비 입력에 이번 달에 적용할 자금 지원 단계를 전달하기 위한 타입 확장이 필요하다.

- `src/types/campaign.ts`
  - 기존 타입 구조는 유지한다.
  - `CampaignProgressState.fundingLevel: number`
    - 현재/다음 게임에 적용될 자금 지원 단계.
    - 유효 범위는 기존 도메인 정책인 1 이상 10 이하 정수이다.
    - 월 준비에서 사용자가 변경하면 이 값이 업데이트된다.
  - `CampaignState.fundingLevel?: number`
    - 과거 호환용 상위 필드로 유지한다.
    - 월 준비에서 `progress.fundingLevel`을 변경할 때 함께 동일 값으로 갱신한다.
  - `CampaignGameRecord.fundingLevel: number`
    - 결과 기록 시 실제 게임에 사용된 자금 지원 단계로 유지한다.
    - 별도 변경 없음.

- `src/components/MonthGameSetupWizard.tsx`
  - `Props['onSetup']` 입력 타입에 `fundingLevel: number` 필드를 추가한다.
  - 내부 state 추가:
    - `const [fundingLevel, setFundingLevel] = useState<number>(campaign.progress.fundingLevel)`
    - 목적: 이번 월 준비에 적용할 사용자 선택 자금 지원 단계.
  - 파생 값 추가:
    - `const defaultFundingLevel = campaign.progress.fundingLevel`
    - `const fundingLevelChanged = fundingLevel !== defaultFundingLevel`
    - `const requiredEventCount = getRequiredEventCardCountForFunding(fundingLevel, availableEventCards.length)`
  - 검증 규칙:
    - `fundingLevel`은 `clampFundingLevel`을 통해 1..10 정수로 보정한다.
    - 이벤트 선택 수는 기존 `campaign.progress.fundingLevel`이 아니라 UI state `fundingLevel`로 계산한 `requiredEventCount`와 정확히 같아야 한다.

- `src/App.tsx`
  - `setupCurrentMonth(input)` 타입에 `fundingLevel: number` 필드를 추가한다.
  - `createGameDecksForMonth` 호출 전에 또는 호출 input으로 이번 달 fundingLevel을 반영한다.

- `src/domain/campaignProgress.ts`
  - `createGameDecksForMonth(input)` 타입에 선택적 `fundingLevel?: number` 필드를 추가한다.
  - 도메인 검증 규칙:
    - `input.fundingLevel`이 있으면 `selectEventCardsForMonth` 및 `getRequiredEventCardCountForFunding`에 이 값을 사용한다.
    - 없으면 기존 호환을 위해 `input.campaign.progress.fundingLevel`을 사용한다.
    - 모든 funding 값은 `clampFundingLevel`로 1..10 정수 처리한다.

- `src/services/localCache.ts`
  - 저장 스키마의 `fundingLevelSchema = z.number().int().min(1).max(10)`는 유지한다.
  - 새 필드를 영속하지 않으므로 envelope schema version 변경은 필요 없다.

[Files]
월별 준비 UI, 앱 연결부, 도메인 덱 생성 로직, 테스트, 구현 계획 문서를 수정한다.

- New files to be created
  - 없음.

- Existing files to be modified
  - `implementation_plan.md`
    - 본 구현 계획 문서로 갱신되어야 한다.

  - `src/components/MonthGameSetupWizard.tsx`
    - `clampFundingLevel`을 import에 추가한다.
      - 현재 import: `getDefaultAvailableEventCardsForMonth, getMonthSetupDefaults, getRequiredEventCardCountForFunding, isCampaignMonthSetupComplete`
      - 변경 후: `clampFundingLevel`도 포함.
    - `Props['onSetup']` payload에 `fundingLevel: number` 추가.
    - `fundingLevel` state 추가.
    - `requiredEventCount` 계산을 `campaign.progress.fundingLevel`에서 `fundingLevel` state 기준으로 변경.
    - `useEffect` 초기화에서 wizard가 열릴 때 `setFundingLevel(campaign.progress.fundingLevel)` 수행.
    - 자금 지원 단계 입력 UI를 이벤트 카드 선택 전, 권장 위치로 step 0의 플레이어 수 선택 아래에 추가한다.
      - 라벨 예시 ko: `이번 달 자금 지원 단계`
      - 라벨 예시 en: `Funding level for this month`
      - 설명 예시 ko: `게임 결과에 따른 기본값은 {defaultFundingLevel}입니다. 룰북 보정 지침에 따라 이번 달에 사용할 값을 직접 조정할 수 있습니다.`
      - 설명 예시 en: `The result-based default is {defaultFundingLevel}. You may adjust the value for this month if applying the rulebook correction guidance.`
    - 입력 컨트롤은 기존 `Input type="number"`를 사용한다.
      - `min={1}`
      - `max={10}`
      - `value={fundingLevel}`
      - `onChange`에서 `clampFundingLevel(Number(event.target.value))`로 보정.
    - `fundingLevelChanged`가 true이면 경고 문구를 표시한다.
      - ko: `일반 설정과 다른 자금 지원 단계입니다. 룰북의 실수 보정 지침처럼 의도적으로 조정하는 경우에만 계속하세요.`
      - en: `This funding level differs from the normal result-based setting. Continue only if you are intentionally applying the rulebook correction guidance.`
      - 스타일은 기존 경고 패턴과 동일하게 `rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900` 사용.
    - 이벤트 선택 단계 문구에서 현재 자금 지원 단계 표시를 `campaign.progress.fundingLevel` 대신 `fundingLevel`로 변경하고, 변경된 경우 기본값도 함께 표시한다.
      - ko 예시: `이번 달 자금 지원 단계는 {fundingLevel}입니다. 이벤트 카드 {requiredEventCount}장을 선택하세요.`
      - 변경 시 추가 문구: `일반 설정: {defaultFundingLevel}`
    - fundingLevel 변경 시 기존 이벤트 선택/시작 손패를 재검증해야 하므로 다음 정책 중 하나를 구현한다.
      - 권장: `updateFundingLevel(next)` 함수에서 fundingLevel을 설정하고 `setSelectedEventCardIds([]); setStartingHands([]);`로 초기화한다.
      - 초기화 대신 초과분만 잘라도 되지만, 단순성과 안전성을 위해 전체 초기화를 권장한다.
    - `finish()` payload에 `fundingLevel` 추가.

  - `src/App.tsx`
    - `setupCurrentMonth(input)` 타입에 `fundingLevel: number` 추가.
    - `updateActiveCampaign` 내부에서 `const fundingLevel = clampFundingLevel(input.fundingLevel)`를 사용하기 위해 `clampFundingLevel` import를 추가하거나, 도메인 함수 결과와 별도로 직접 import한다.
    - `createGameDecksForMonth` 호출에 `fundingLevel` 전달.
    - 반환 campaign에 다음 필드를 반영한다.
      - `fundingLevel`
      - `progress: { ...campaign.progress, fundingLevel }`
      - `players`, `characters`, `...decks`, `updatedAt`
    - 덱 생성에 사용하는 campaign과 저장 갱신 값의 fundingLevel이 일치해야 한다.
      - 권장 구현:
        1. `const fundingLevel = clampFundingLevel(input.fundingLevel);`
        2. `const campaignForSetup = { ...campaign, fundingLevel, progress: { ...campaign.progress, fundingLevel } };`
        3. `const decks = createGameDecksForMonth({ campaign: campaignForSetup, fundingLevel, ... });`
        4. `return updateCampaignTimestamp({ ...campaignForSetup, players: input.players, characters: input.characters, ...decks });`

  - `src/domain/campaignProgress.ts`
    - `createGameDecksForMonth(input)`에 `fundingLevel?: number` 추가.
    - 함수 내부에서 `const fundingLevel = clampFundingLevel(input.fundingLevel ?? input.campaign.progress.fundingLevel);` 추가.
    - `selectEventCardsForMonth(eventCards, month, input.selectedEventCardIds, fundingLevel)`로 변경.
    - 기존 `applyGameResult`, `calculateNextFundingLevel`, `CampaignGameRecord` 생성 로직은 변경하지 않는다. 월 준비에서 progress funding을 조정하면 결과 기록이 자연스럽게 조정된 값으로 동작한다.

  - `src/components/DeckCounterDashboard.tsx`
    - 필수 변경은 아니다.
    - 현재 헤더가 `props.campaign.progress.fundingLevel`을 표시하므로 월 준비 적용 후 조정된 값이 자동 표시된다.
    - 원한다면 문구를 `자금 지원`으로 명확히 바꿀 수 있으나 요구사항 구현에는 불필요하다.

  - `src/components/CampaignTimelinePanel.tsx`
    - 필수 변경은 아니다.
    - 결과 기록은 실제 적용된 fundingLevel을 기존 테이블에 표시한다.

  - `src/services/localCache.ts`
    - 필수 변경은 아니다.
    - schemaVersion 4 유지.
    - `fundingLevelSchema`가 이미 1..10 정수 검증을 수행한다.

  - `src/__tests__/campaignProgress.test.ts`
    - `createGameDecksForMonth`가 `input.fundingLevel`을 받으면 해당 값으로 이벤트 선택 수를 검증하는 테스트를 추가한다.
    - 기존 funding mismatch 테스트는 유지하되, 선택적으로 `fundingLevel` input을 명시해 새 경로를 검증한다.
    - `applyGameResult` 테스트는 자동 추적 유지 검증을 위해 그대로 둔다.

  - `src/__tests__/campaignPersistence.test.ts`
    - 스키마 변경이 없으므로 필수 수정 없음.

- Files to be deleted or moved
  - 없음.

- Configuration file updates
  - 없음.

[Functions]
월별 덱 생성 함수와 월별 준비 UI 내부 자금 지원 변경 핸들러를 수정/추가한다.

- New functions
  - `updateFundingLevel(value: number): void`
    - File path: `src/components/MonthGameSetupWizard.tsx`
    - Signature: `const updateFundingLevel = (value: number) => { ... }`
    - Purpose: 사용자가 입력한 이번 달 자금 지원 단계를 1..10 범위로 보정하고, 이벤트 선택 및 시작 손패를 초기화한다.
    - Required behavior:
      - `const nextFundingLevel = clampFundingLevel(value);`
      - `setFundingLevel(nextFundingLevel);`
      - `setSelectedEventCardIds([]);`
      - `setStartingHands([]);`
    - Edge cases:
      - 빈 number input으로 `NaN`이 들어오면 `clampFundingLevel(NaN)`이 기존 정책상 1을 반환한다. UX상 빈 입력 허용이 필요하면 문자열 state가 더 적합하지만, 현재 코드 패턴상 number 보정 유지가 더 단순하다.

- Modified functions
  - `createGameDecksForMonth(input)`
    - Current file path: `src/domain/campaignProgress.ts`
    - Current behavior: `input.campaign.progress.fundingLevel` 기준으로 선택 이벤트 수를 검증하고 덱을 만든다.
    - Required changes:
      - input 타입에 `fundingLevel?: number` 추가.
      - 내부 funding 기준을 `clampFundingLevel(input.fundingLevel ?? input.campaign.progress.fundingLevel)`로 계산.
      - `selectEventCardsForMonth`에 계산된 funding 기준 전달.
    - Migration strategy: `fundingLevel`이 없으면 기존 동작을 유지하므로 기존 호출과 테스트 호환성이 유지된다.

  - `MonthGameSetupWizard({ open, campaign, language, onOpenChange, onSetup })`
    - Current file path: `src/components/MonthGameSetupWizard.tsx`
    - Required changes:
      - funding state 추가.
      - 이벤트 요구 수를 funding state 기준으로 계산.
      - step 0 또는 이벤트 선택 단계 상단에 funding input 추가.
      - 일반 설정과 다를 때 경고 표시.
      - funding 변경 시 이벤트 선택과 시작 손패 초기화.
      - `finish()`에서 `fundingLevel`을 onSetup payload에 포함.

  - `setupCurrentMonth(input)`
    - Current file path: `src/App.tsx`
    - Required changes:
      - input 타입에 `fundingLevel: number` 추가.
      - `clampFundingLevel`로 보정.
      - 덱 생성과 campaign 저장 상태에 동일한 funding 적용.
      - 기존 players/characters/decks 업데이트 흐름 유지.

  - `selectEventCardsForMonth(cards, month, selectedEventCardIds, fundingLevel)`
    - Current file path: `src/domain/campaignProgress.ts`
    - Required changes: 없음 또는 최소 변경.
    - Existing behavior already receives explicit `fundingLevel`, so `createGameDecksForMonth`가 새 funding 기준을 넘기면 된다.

  - `getRequiredEventCardCountForFunding(fundingLevel, availableEventCount)`
    - Current file path: `src/domain/campaignProgress.ts`
    - Required changes: 없음.
    - Existing behavior already clamps funding and caps by available event count.

  - `applyGameResult(campaign, input)`
    - Current file path: `src/domain/campaignProgress.ts`
    - Required changes: 없음.
    - Reason: 자동 성공/양호/실패 추적을 유지해야 하며, 월 준비에서 progress funding을 조정하면 이 함수가 조정된 실제 값 기준으로 다음 funding을 계산한다.

- Removed functions
  - 없음.

[Classes]
클래스 기반 구조가 없으므로 클래스 추가, 수정, 삭제는 없다.

- New classes
  - 없음.

- Modified classes
  - 없음.

- Removed classes
  - 없음.

[Dependencies]
새 패키지나 버전 변경은 필요하지 않다.

현재 프로젝트는 React 18, TypeScript, Vite/Vitest, zod, Tailwind 스타일 유틸리티, 로컬 UI 컴포넌트를 사용한다. 자금 지원 단계 입력과 경고는 기존 `Input`, `NativeSelect`가 아닌 `Input type="number"`, 기존 Tailwind class, 기존 `Button` 흐름으로 충분히 구현할 수 있다. 영속 스키마 변경이 없으므로 zod migration이나 package 변경도 필요하지 않다.

[Testing]
도메인 테스트로 자금 지원 오버라이드가 이벤트 선택 수와 덱 구성에 반영되는지 검증하고, 기존 자동 funding 추적 테스트가 그대로 통과하는지 확인한다.

- Test file requirements
  - `src/__tests__/campaignProgress.test.ts`
    - 추가 테스트 1: `creates current-month decks using an overridden setup funding level`
      - campaign은 기본 fundingLevel 5로 생성한다.
      - `createGameDecksForMonth` 호출에 `fundingLevel: 4`와 선택 이벤트 4장을 전달한다.
      - 4장 선택이면 성공해야 한다.
      - 선택한 이벤트 카드가 `playerDeck.cardStates`에 존재하는지 검증한다.
    - 추가 테스트 2: `rejects selected event cards that do not match overridden setup funding level`
      - campaign 기본 fundingLevel이 5여도 `fundingLevel: 4`를 전달한다.
      - 선택 이벤트 5장을 전달하면 `Expected 4 event card` 오류가 발생해야 한다.
    - 기존 테스트 유지:
      - `calculates next funding and flags secret file 14 without revealing content`
      - `advances after success or adequate result and records game history`
      - 이 테스트들은 성공/양호/실패에 따른 자동 변화 추적이 유지됨을 보장한다.

  - `src/__tests__/campaignPersistence.test.ts`
    - 새 영속 필드가 없으므로 수정 불필요.
    - 기존 `validates an envelope with a campaign`, migration 테스트가 그대로 통과해야 한다.

- UI testing strategy
  - 현재 코드베이스는 React Testing Library 기반 UI 테스트가 거의 없고 도메인 테스트 중심이다.
  - 이번 변경은 핵심 계산을 도메인에 위임하고 UI는 기존 wizard state 연결이므로 필수 UI 테스트는 추가하지 않는다.
  - 수동 QA 체크:
    - 월 준비 열기.
    - 기본 자금 지원 단계가 표시되는지 확인.
    - 값을 변경하면 경고가 보이는지 확인.
    - 이벤트 선택 요구 수가 변경된 값에 맞춰 바뀌는지 확인.
    - 적용 후 대시보드의 funding 표시가 변경되는지 확인.
    - 결과 기록 후 타임라인에 조정된 funding이 기록되는지 확인.

- Validation commands
  - `npm test`
  - `npm run build`
  - 커밋 전 `git status --short`

[Implementation Order]
도메인에서 funding override를 먼저 지원한 뒤 앱 상태 반영과 UI 입력을 연결하고 테스트/검증을 수행한다.

1. `src/domain/campaignProgress.ts`의 `createGameDecksForMonth` input에 `fundingLevel?: number`를 추가하고, 이벤트 선택 검증 기준이 `input.fundingLevel ?? campaign.progress.fundingLevel`을 사용하도록 변경한다.
2. `src/App.tsx`에서 `setupCurrentMonth` input에 `fundingLevel`을 추가하고, 월 준비 적용 시 `campaign.progress.fundingLevel` 및 `campaign.fundingLevel`을 보정된 값으로 업데이트한 뒤 같은 값으로 덱을 생성한다.
3. `src/components/MonthGameSetupWizard.tsx`에서 fundingLevel state, `updateFundingLevel`, 일반 설정과 다름 경고 문구를 추가하고, 이벤트 카드 요구 수와 안내 문구를 해당 state 기준으로 변경한다.
4. `src/components/MonthGameSetupWizard.tsx`의 `finish()` payload에 `fundingLevel`을 포함하고, funding 변경 시 `selectedEventCardIds`와 `startingHands`를 초기화해 불일치 상태를 방지한다.
5. `src/__tests__/campaignProgress.test.ts`에 오버라이드 funding 기준으로 덱 생성/이벤트 선택 수 검증 테스트를 추가한다.
6. `npm test`를 실행해 도메인 및 persistence 회귀를 검증한다.
7. `npm run build`를 실행해 TypeScript strict mode와 production build를 검증한다.
8. `git status --short`로 변경 범위를 확인하고, 구현 단계에서 커밋이 요구되면 관련 파일만 stage하여 atomic commit을 만든다.
