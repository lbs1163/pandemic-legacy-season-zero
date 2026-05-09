# Implementation Plan

[Overview]
프롤로그 결과가 1월 자금 지원 단계에 영향을 주지 않도록 캠페인 진행 계산을 수정해 프롤로그와 1월의 자금 지원 단계가 모두 5로 유지되게 한다.

현재 앱은 React + TypeScript + Vite 기반 Pandemic Legacy Season 0 덱 카운터이며, 캠페인 월 진행과 자금 지원 단계 계산은 주로 `src/domain/campaignProgress.ts`에 집중되어 있다. 새 캠페인은 `src/domain/createInitialCampaign.ts`에서 프롤로그로 시작하며 기본 자금 지원 단계는 이미 5로 생성된다. 그러나 `applyGameResult()`는 모든 월 결과에 대해 `calculateNextFundingLevel(progress.fundingLevel, rating)`을 적용하고, 프롤로그에서 성공하면 다음 월인 1월의 `progress.fundingLevel`이 4가 되는 현재 테스트 기대값도 존재한다.

요구사항은 “캠페인에서 월별 결과에 따라 자금 지원 단계가 변화하는 것은 프롤로그는 예외적으로 아니야. 즉, 프롤로그와 1월은 자금 지원단계가 5야.”이다. 따라서 프롤로그의 게임 결과는 게임 기록에는 그대로 저장하되, 다음 상태가 1월로 이동할 때 자금 지원 단계는 결과 기반 증감이 아니라 고정값 5를 사용해야 한다. 1월 이후부터는 기존 성공 -1, 보통 +1, 실패 +2 규칙과 Secret File 14 경고 로직을 유지한다.

구현은 도메인 함수에 프롤로그 예외를 명시적으로 모델링하는 작은 helper를 추가하는 방식이 적합하다. `calculateNextFundingLevel()` 자체는 순수 “일반 결과 기반 계산”으로 유지해 기존 단위 테스트와 재사용성을 보존하고, 월 문맥이 필요한 `applyGameResult()`에서만 현재 월이 `prologue`인지 판단해 다음 자금 지원 단계를 결정한다. 이렇게 하면 UI 컴포넌트는 이미 `campaign.progress.fundingLevel`을 기준으로 이벤트 카드 수와 월 준비 기본값을 표시하므로 별도 UI 변경 없이 1월 월 준비 단계가 자금 5로 동작한다.

기존 `monthSetupDefaults.prologue.defaultFundingLevel`은 현재 4로 정의되어 있지만 실제 `MonthGameSetupWizard`는 이 필드를 사용하지 않고 `campaign.progress.fundingLevel`을 기본값으로 사용한다. 혼동을 줄이고 데이터 정의를 요구사항과 일치시키기 위해 `src/data/campaign/months.ts`의 프롤로그 기본 자금 지원 값을 5로 수정하고, 1월에도 명시적으로 `defaultFundingLevel: 5`를 추가한다. 이 필드는 현재 런타임 로직에 직접 연결되어 있지 않지만, 월별 기본 설정 데이터의 의미를 정확히 유지하기 위한 변경이다.

[Types]
새로운 영속 데이터 타입은 추가하지 않고 기존 `CampaignMonthId`, `CampaignProgressState`, `CampaignState` 구조를 유지한다.

변경 대상 타입과 데이터 구조는 다음과 같다.

- `CampaignMonthId`
  - File: `src/types/campaign.ts`
  - Existing union includes `'prologue' | 'january' | ... | 'december'`.
  - 변경 없음.
  - 프롤로그 예외는 타입 확장이 아니라 기존 `CampaignMonthId` 값 중 `'prologue'`에 대한 도메인 규칙으로 처리한다.

- `PerformanceRating`
  - File: `src/types/campaign.ts`
  - Existing union: `'success' | 'adequate' | 'failure'`.
  - 변경 없음.
  - 프롤로그에서도 성과 평가는 게임 기록의 `performanceRating`에 저장되지만, 다음 자금 지원 단계 계산에는 반영하지 않는다.

- `CampaignProgressState.fundingLevel`
  - File: `src/types/campaign.ts`
  - Type: `number`.
  - Validation: persistence layer에서 `z.number().int().min(1).max(10)`로 검증된다.
  - 변경 없음.
  - 새 규칙: `currentMonth`가 `january`로 진입하는 순간에는 프롤로그 결과와 관계없이 `fundingLevel`이 5여야 한다.

- `MonthSetupDefaults.defaultFundingLevel`
  - File: `src/types/campaignSetup.ts`
  - Existing type: `defaultFundingLevel?: number`.
  - 변경 없음.
  - 데이터 규칙 보강:
    - `monthSetupDefaults.prologue.defaultFundingLevel`은 5여야 한다.
    - `monthSetupDefaults.january.defaultFundingLevel`은 5여야 한다.
  - 이 필드는 선택 필드이므로 타입 변경이나 migration은 필요 없다.

새 타입 후보는 없다. 필요 시 구현 중 module-local constant를 추가할 수 있다.

```ts
const initialCampaignFundingLevel = 5;
```

이 상수는 타입이 아니라 도메인 상수이며, `src/domain/campaignProgress.ts`와 `src/domain/createInitialCampaign.ts` 사이에서 공유하려면 export할 수 있다. 다만 순환 import를 피하려면 `campaignProgress.ts`에 export하고 `createInitialCampaign.ts`가 이미 해당 파일에서 import하므로 자연스럽게 사용할 수 있다.

[Files]
도메인 진행 계산, 월 기본 데이터, 캠페인 진행 테스트를 수정하고 필요 시 영속성 테스트 기대값을 보강한다.

- New files to be created:
  - 없음. 기존 도메인 파일과 테스트 파일 안에서 변경한다.

- Existing files to be modified:
  - `src/domain/campaignProgress.ts`
    - 프롤로그 결과 이후 다음 자금 지원 단계가 항상 5가 되도록 `applyGameResult()`의 funding 계산 흐름을 수정한다.
    - 권장: `initialCampaignFundingLevel` 상수 또는 `getNextFundingAfterGameResult(currentMonth, currentFunding, rating)` helper를 추가한다.
    - `calculateNextFundingLevel()`은 일반 월 결과 기반 계산으로 유지한다.
    - Secret File 14 경고는 프롤로그에서는 발생하지 않아야 하며, 1월 이후 기존 조건을 유지한다.
  - `src/domain/createInitialCampaign.ts`
    - 기본 자금 지원 값 `5`를 새 상수로 대체할 수 있다.
    - 기능상 필수는 아니지만 magic number 중복을 줄인다.
  - `src/data/campaign/months.ts`
    - `monthSetupDefaults.prologue.defaultFundingLevel`을 4에서 5로 변경한다.
    - `monthSetupDefaults.january.defaultFundingLevel: 5`를 추가한다.
  - `src/__tests__/campaignProgress.test.ts`
    - 기존 `advances after success or adequate result and records game history` 테스트의 기대값을 수정한다: 프롤로그 성공 후 `next.progress.fundingLevel`은 5여야 한다.
    - 프롤로그 성공/보통/실패 결과가 1월 또는 프롤로그 재시도 상태에서 모두 funding 5를 유지하는지 검증하는 테스트를 추가한다.
    - 1월 이후에는 기존 결과 기반 funding 계산이 계속 적용되는지 검증하는 테스트를 추가한다.
    - `calculateNextFundingLevel()` 단위 테스트는 기존 일반 계산 테스트로 유지한다.
  - `src/__tests__/campaignPersistence.test.ts`
    - 기존 v1 migration 테스트는 `createInitialCampaign()` 기반 fixture 때문에 이미 5를 기대한다.
    - 별도 수정은 필수 아님.
    - 구현 중 `createInitialCampaign.ts`가 상수 import로 바뀌어도 테스트 기대값은 유지된다.

- Files to be deleted or moved:
  - 없음.

- Configuration file updates:
  - 없음. `package.json`, `tsconfig.json`, `vite.config.ts` 변경은 필요 없다.

[Functions]
프롤로그 예외를 반영하는 funding 결정 helper를 추가하거나 `applyGameResult()` 내부 계산을 분기한다.

- New functions:
  - 권장 함수: `calculateNextCampaignFundingLevel(currentMonth: CampaignMonthId, currentFunding: number, rating: PerformanceRating): { fundingLevel: number; secretFile14Required: boolean; rawFundingLevel: number }`
    - File: `src/domain/campaignProgress.ts`
    - Suggested signature:
      ```ts
      export function calculateNextCampaignFundingLevel(
        currentMonth: CampaignMonthId,
        currentFunding: number,
        rating: PerformanceRating
      ): { fundingLevel: number; secretFile14Required: boolean; rawFundingLevel: number }
      ```
    - Purpose: 월 문맥을 포함한 캠페인 진행용 다음 funding 계산을 담당한다.
    - Logic:
      1. `currentMonth === 'prologue'`이면 `{ fundingLevel: 5, rawFundingLevel: 5, secretFile14Required: false }` 반환.
      2. 그 외 월은 기존 `calculateNextFundingLevel(currentFunding, rating)` 결과 반환.
    - Export 여부: 테스트에서 직접 검증하려면 export를 권장한다. export하지 않고 `applyGameResult()` 결과만 테스트해도 가능하다.

  - 권장 상수: `initialCampaignFundingLevel`
    - File: `src/domain/campaignProgress.ts`
    - Suggested declaration:
      ```ts
      export const initialCampaignFundingLevel = 5;
      ```
    - Purpose: 프롤로그 및 1월 고정 funding 5 규칙을 magic number 없이 공유한다.
    - Used by:
      - `calculateNextCampaignFundingLevel()`
      - `createInitialCampaign()`의 기본 funding 값
      - 선택적으로 tests의 기대값

- Modified functions:
  - `applyGameResult(campaign, input)`
    - File: `src/domain/campaignProgress.ts`
    - Current behavior:
      - 모든 월에서 `const nextFunding = calculateNextFundingLevel(progress.fundingLevel, rating);`를 호출한다.
      - 프롤로그 성공 시 funding 4, 보통 6, 실패 7이 될 수 있다.
    - Required changes:
      - `const nextFunding = calculateNextCampaignFundingLevel(progress.currentMonth, progress.fundingLevel, rating);`로 변경한다.
      - `record.fundingLevel`은 해당 게임을 플레이한 funding이므로 기존처럼 `progress.fundingLevel`을 유지한다.
      - `retryCurrentMonth`와 `nextMonth` 계산은 기존과 동일하게 유지한다.
      - 프롤로그 첫 실패로 같은 프롤로그를 재시도하는 경우에도 funding 5가 유지되어야 한다.
      - 프롤로그 두 번째 실패 후 1월로 넘어가는 경우에도 funding 5가 유지되어야 한다.
      - 1월 결과로 2월에 진입할 때부터는 일반 계산을 적용한다.
  - `createInitialCampaign(input)`
    - File: `src/domain/createInitialCampaign.ts`
    - Current behavior: `const fundingLevel = clampFundingLevel(input.fundingLevel ?? 5);`
    - Required changes:
      - `5`를 `initialCampaignFundingLevel` 상수로 대체하는 것을 권장한다.
      - `input.fundingLevel` override 동작은 유지한다. 테스트 fixture와 사용자가 명시 입력한 값을 깨지 않기 위해 강제 5로 덮어쓰지 않는다.
  - `monthSetupDefaults` object
    - File: `src/data/campaign/months.ts`
    - 함수는 아니지만 데이터 구조 변경이 필요하다.
    - `prologue.defaultFundingLevel`을 5로 수정한다.
    - `january.defaultFundingLevel`을 5로 추가한다.

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
  - `src/domain/createInitialCampaign.ts`는 이미 `src/domain/campaignProgress.ts`에서 `clampFundingLevel`, `getDefaultAvailableEventCardsForMonth`를 import하므로 `initialCampaignFundingLevel`을 같은 import에 추가할 수 있다.
  - `src/domain/campaignProgress.ts`는 `CampaignMonthId`와 `PerformanceRating` 타입을 이미 import하므로 새 helper에 추가 import가 필요 없다.
  - persistence schema는 funding level 범위만 검증하므로 schema version이나 migration 변경은 필요 없다.
  - 기존 저장 데이터에서 이미 프롤로그 결과 때문에 1월 funding이 4 등으로 저장된 캠페인을 자동 보정하는 migration은 이번 범위에 포함하지 않는다. 요구사항은 앞으로의 캠페인 진행 계산과 월 기본 데이터에 반영한다. 만약 기존 저장 데이터 자동 보정이 필요하면 별도 migration 계획이 필요하다.

[Testing]
도메인 단위 테스트로 프롤로그 funding 예외와 1월 이후 일반 funding 계산을 검증하고 전체 테스트/빌드로 회귀를 확인한다.

테스트 요구사항:

- Test file: `src/__tests__/campaignProgress.test.ts`
- Required test updates:
  - Existing test `advances after success or adequate result and records game history`
    - `expect(next.progress.fundingLevel).toBe(4);`를 `toBe(5)`로 변경한다.
    - `gameRecords[0].fundingLevel`은 프롤로그 게임을 5 funding으로 플레이했음을 나타내므로 기존 `5` 기대값을 유지한다.
  - Existing test `retries after first failure and advances after second failure`
    - `retry.progress.fundingLevel`이 5인지 추가 검증한다.
    - `advance.progress.fundingLevel`이 5인지 추가 검증한다.
  - New test: `keeps funding at 5 when prologue result advances to january`
    - 프롤로그 성공: 1월 진입, funding 5.
    - 프롤로그 보통: 1월 진입, funding 5.
    - 프롤로그 두 번째 실패 또는 실패 후 advance: 1월 진입 시 funding 5.
    - 필요하면 각 케이스마다 fresh campaign을 생성한다.
  - New test: `applies result-based funding changes after january`
    - campaign을 1월 상태와 funding 5로 구성한다.
    - 1월 성공 결과 후 2월 funding 4를 기대한다.
    - 별도 케이스로 1월 보통 결과 후 2월 funding 6 또는 실패 후 재시도 funding 7을 검증할 수 있다.
  - New or updated test: `stores default funding levels for prologue and january`
    - `expect(getMonthSetupDefaults('prologue').defaultFundingLevel).toBe(5)`
    - `expect(getMonthSetupDefaults('january').defaultFundingLevel).toBe(5)`

Validation commands:

1. `npm test`
2. `npm run build`

Commit workflow:

- 구현 전 `git status --short | cat`으로 작업 트리 상태를 확인한다.
- 관련 없는 변경이 있으면 stage/commit 전에 사용자에게 확인한다.
- 관련 파일만 stage한다: `src/domain/campaignProgress.ts`, `src/domain/createInitialCampaign.ts`, `src/data/campaign/months.ts`, `src/__tests__/campaignProgress.test.ts`, `implementation_plan.md`.
- 테스트와 빌드가 통과하면 atomic commit을 생성한다.
- 권장 커밋 메시지: `Keep January funding fixed after prologue`
- `.clinerules`에 따라 commit 후 현재 branch에 push한다.

[Implementation Order]
먼저 도메인 funding 규칙을 상수와 helper로 명확히 한 뒤 월 기본 데이터와 테스트 기대값을 갱신하고 검증/커밋한다.

1. `git status --short | cat`으로 작업 트리 상태를 확인하고 관련 없는 변경이 있으면 사용자에게 확인한다.
2. `src/domain/campaignProgress.ts`에 `initialCampaignFundingLevel = 5` 상수와 `calculateNextCampaignFundingLevel()` helper를 추가한다.
3. `src/domain/campaignProgress.ts`의 `applyGameResult()`가 기존 `calculateNextFundingLevel()` 대신 월 문맥 helper를 사용하도록 변경한다.
4. `src/domain/createInitialCampaign.ts`에서 기본 funding magic number `5`를 `initialCampaignFundingLevel` 상수로 대체한다.
5. `src/data/campaign/months.ts`에서 프롤로그 `defaultFundingLevel`을 5로 수정하고 1월 `defaultFundingLevel: 5`를 추가한다.
6. `src/__tests__/campaignProgress.test.ts`의 기존 프롤로그 진행 테스트 기대값을 funding 5 유지 규칙에 맞게 수정한다.
7. `src/__tests__/campaignProgress.test.ts`에 프롤로그 성공/보통/실패 예외와 1월 이후 일반 funding 변화, 월 기본 funding 데이터를 검증하는 테스트를 추가한다.
8. `npm test`를 실행해 도메인 및 영속성 테스트 회귀를 확인한다.
9. `npm run build`를 실행해 TypeScript와 production build를 확인한다.
10. `git status --short | cat`으로 변경 파일을 확인하고 관련 파일만 stage한다.
11. 테스트가 통과한 상태로 atomic commit을 생성하고 현재 branch에 push한다.
