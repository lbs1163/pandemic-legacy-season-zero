# Implementation Plan

[Overview]
앱 상단 알림 메시지를 번역 키 기반 상태로 저장해 언어 변경 시 즉시 재번역되게 하고, 알림 닫기 버튼과 현재 캠페인 월 이름 번역 표시를 추가한다.

현재 앱은 React + TypeScript + Vite 기반 Pandemic Legacy Season 0 덱 카운터이며, UI 문구는 대부분 `src/i18n/uiText.ts`의 `uiText[language]` 또는 각 데이터 객체의 localized text를 통해 렌더링 시점에 선택된다. 그러나 `src/App.tsx`의 `syncMessage` 상태는 `string | undefined`로 저장되고, `handleResetStorage()`, `handlePull()`, `handlePush()`, `handleStartSignIn()` 등에서 현재 언어의 완성된 문자열을 저장한다. 이 때문에 “로컬 저장 데이터가 초기화되었습니다.” 알림처럼 이미 상태에 저장된 문구는 언어 선택을 바꿔도 다시 번역되지 않는다.

해결 방향은 알림 상태에 완성된 문자열 대신 번역 key와 필요한 interpolation parameter만 저장하는 것이다. 렌더링 시점에 현재 `language`로부터 `text = uiText[language]`를 다시 계산하고, 알림 key를 현재 언어의 문자열로 변환한다. 이렇게 하면 알림이 떠 있는 동안 언어를 바꿔도 같은 key가 새 언어 문구로 표시된다. 동시에 사용자가 알림을 수동으로 없앨 수 있도록 `Alert` 내부에 닫기 버튼을 배치하고, 닫기 시 알림 상태를 `undefined`로 만든다.

현재 캠페인 월 표시는 `src/components/DeckCounterDashboard.tsx`에서 `props.campaign.progress.currentMonth`를 그대로 출력하고 있어 `january`, `february` 같은 내부 ID가 노출된다. 이미 `src/data/campaign/months.ts`에 `monthLabels`가 정의되어 있고 `MonthGameSetupWizard`, `GameResultDialog`, `CampaignTimelinePanel`은 이를 사용한다. 따라서 `DeckCounterDashboard`도 같은 `monthLabels[currentMonth][language]` 패턴을 사용하도록 수정해 현재 언어에 맞는 월 이름을 표시한다.

[Types]
동기화/상태 알림을 완성 문자열이 아닌 번역 key와 parameter로 표현하는 로컬 UI 상태 타입을 추가한다.

`src/App.tsx` 내부 또는 별도 export가 필요 없는 module-local type으로 다음 타입을 추가한다.

```ts
type SyncMessageKey = 'openAndEnterCode' | 'signedInGistReady' | 'pulledState' | 'pushedState' | 'resetStorageDone';

interface SyncMessageState {
  key: SyncMessageKey;
  params?: Record<string, string>;
}
```

필드 규칙:

- `SyncMessageState.key`
  - Type: string literal union
  - Required: yes
  - Validation: TypeScript compile-time only
  - Domain meaning: `uiText[language]`에서 조회할 알림 문구 key
  - Allowed values: `openAndEnterCode`, `signedInGistReady`, `pulledState`, `pushedState`, `resetStorageDone`
- `SyncMessageState.params`
  - Type: `Record<string, string> | undefined`
  - Required: no
  - Validation: key별 필요한 placeholder만 제공
  - Domain meaning: `uiText` 문자열의 `{placeholder}` 치환값
  - `openAndEnterCode`일 때 `{ uri: flow.verificationUri, code: flow.userCode }`가 필요함
  - 나머지 key는 params가 없어야 하거나 무시 가능함

`src/i18n/uiText.ts`의 구조는 유지하되 alert 닫기 버튼에 사용할 새 번역 key를 추가한다.

```ts
dismissAlert: string;
```

필드 규칙:

- `dismissAlert`
  - Type: string
  - Required: yes for both `en` and `ko`
  - English value: `Dismiss alert`
  - Korean value: `알림 닫기`
  - Usage: visible button label 또는 `aria-label`로 사용

월 이름 타입은 변경하지 않는다. 기존 `monthLabels: Record<CampaignMonthId, { en: string; ko: string }>`를 그대로 사용한다. 필요하면 `LocalizedText` 타입을 import해 `Record<CampaignMonthId, LocalizedText>`로 정리할 수 있지만 이번 변경의 필수 범위는 아니다.

[Files]
앱 알림 상태, UI 번역 사전, 현재 월 표시 컴포넌트, 테스트를 수정하고 기존 저장 스키마 및 의존성 설정은 건드리지 않는다.

- New files to be created:
  - 없음. 기존 파일 안에서 타입, 렌더링, 테스트를 수정한다.

- Existing files to be modified:
  - `src/App.tsx`
    - `syncMessage` state를 `string | undefined`에서 `SyncMessageState | undefined`로 변경한다.
    - `setSyncMessage(text.someKey...)` 호출을 `{ key: 'someKey', params?: ... }` 형태로 변경한다.
    - 현재 언어의 `text`와 `syncMessage` key/params를 이용해 표시 문자열을 만드는 helper를 추가한다.
    - `<Alert>{syncMessage}</Alert>` 렌더링을 닫기 버튼이 포함된 dismissible alert UI로 변경한다.
    - 닫기 버튼 클릭 시 `setSyncMessage(undefined)`를 호출한다.
  - `src/i18n/uiText.ts`
    - `en`과 `ko` 양쪽에 `dismissAlert` key를 추가한다.
    - 기존 `resetStorageDone`, `pulledState`, `pushedState`, `signedInGistReady`, `openAndEnterCode` 값은 유지한다.
  - `src/components/DeckCounterDashboard.tsx`
    - `monthLabels`를 `../data/campaign/months`에서 import한다.
    - 현재 월 표시에서 `props.campaign.progress.currentMonth` 대신 `monthLabels[props.campaign.progress.currentMonth][props.language]`를 사용한다.
    - 시도/자금 표시 문구는 기존 언어 분기와 동일하게 유지한다.
  - `src/__tests__/uiText.test.ts`
    - 신규 파일 생성을 권장한다.
    - `uiText.en.dismissAlert`와 `uiText.ko.dismissAlert`가 존재하는지 검증한다.
    - `resetStorageDone` 양 언어 번역이 key로 유지되는지 검증한다.
    - `monthLabels.january`와 `monthLabels.february`의 영어/한국어 라벨을 검증한다.

- Files to be deleted or moved:
  - 없음.

- Configuration file updates:
  - 없음. `package.json`, `tsconfig.json`, `vite.config.ts` 변경은 필요 없다.

[Functions]
알림 메시지 key를 현재 언어 문자열로 변환하는 helper를 추가하고 기존 이벤트 핸들러들의 알림 저장 방식을 수정한다.

- New functions:
  - `formatSyncMessage(message: SyncMessageState | undefined, text: UiText): string | undefined`
    - File: `src/App.tsx`
    - Suggested signature:
      ```ts
      function formatSyncMessage(message: SyncMessageState | undefined, text: UiText): string | undefined
      ```
    - Purpose: 저장된 알림 key와 params를 현재 언어의 `UiText` 문자열로 변환한다.
    - Logic:
      1. `message`가 없으면 `undefined` 반환.
      2. `let rendered = text[message.key]`로 현재 언어 문구를 조회.
      3. `message.params`가 있으면 각 `[name, value]`에 대해 `rendered = rendered.split(`{${name}}`).join(value)` 수행.
      4. 최종 문자열 반환.

- Modified functions:
  - `App()`
    - File: `src/App.tsx`
    - Required changes:
      - `const [syncMessage, setSyncMessage] = useState<string>();`를 `useState<SyncMessageState>();`로 변경한다.
      - `const renderedSyncMessage = formatSyncMessage(syncMessage, text);`를 `text` 계산 이후에 추가한다.
      - JSX에서 `renderedSyncMessage`를 조건부 렌더링한다.
  - `handleStartSignIn()`
    - File: `src/App.tsx`
    - Current behavior: `setSyncMessage(text.openAndEnterCode.replace('{uri}', flow.verificationUri).replace('{code}', flow.userCode));`
    - Required change: `setSyncMessage({ key: 'openAndEnterCode', params: { uri: flow.verificationUri, code: flow.userCode } });`
    - Current behavior after successful auth: `setSyncMessage(text.signedInGistReady);`
    - Required change: `setSyncMessage({ key: 'signedInGistReady' });`
  - `handlePull()`
    - File: `src/App.tsx`
    - Current behavior: `setSyncMessage(text.pulledState);`
    - Required change: `setSyncMessage({ key: 'pulledState' });`
  - `handlePush()`
    - File: `src/App.tsx`
    - Current behavior: `setSyncMessage(text.pushedState);`
    - Required change: `setSyncMessage({ key: 'pushedState' });`
  - `handleResetStorage()`
    - File: `src/App.tsx`
    - Current behavior: `setSyncMessage(text.resetStorageDone);`
    - Required change: `setSyncMessage({ key: 'resetStorageDone' });`
  - `DeckCounterDashboard(props: Props)`
    - File: `src/components/DeckCounterDashboard.tsx`
    - Required changes:
      - Import `monthLabels`.
      - Add local constant `const currentMonthLabel = monthLabels[props.campaign.progress.currentMonth][props.language];`.
      - Render `currentMonthLabel` in the current campaign month summary.

- Removed functions:
  - 없음.

[Classes]
클래스 기반 구조가 없는 함수형 React 코드이므로 클래스 추가, 수정, 삭제는 없다.

- New classes:
  - 없음.

- Modified classes:
  - 없음.

- Removed classes:
  - 없음.

[Dependencies]
새 패키지나 버전 변경은 필요하지 않으며 기존 React, TypeScript, Vitest만 사용한다.

- New packages:
  - 없음.

- Version changes:
  - 없음.

- Integration requirements:
  - `src/App.tsx`는 이미 `Alert`와 `Button`을 import하고 있으므로 dismissible alert에 새 UI dependency가 필요 없다.
  - `src/components/DeckCounterDashboard.tsx`는 `monthLabels` import만 추가한다.
  - `src/i18n/uiText.ts`의 `UiText` 타입은 `uiText` object에서 추론되므로 양 언어에 동일 key를 추가해야 타입 일관성이 유지된다.
  - localStorage/gist 저장 schema는 변경하지 않는다. `syncMessage`는 React UI transient state이므로 `PersistedEnvelope`나 migration에 영향을 주지 않는다.

[Testing]
번역 key 추가와 타입 안정성을 테스트하고 전체 테스트/빌드로 회귀를 검증한다.

테스트 요구사항:

- Test file: `src/__tests__/uiText.test.ts` 신규 생성을 권장한다.
- Required tests:
  - `defines dismiss alert labels for every language`
    - `expect(uiText.en.dismissAlert).toBe('Dismiss alert')`
    - `expect(uiText.ko.dismissAlert).toBe('알림 닫기')`
  - `keeps reset storage alert translations available by key`
    - `expect(uiText.en.resetStorageDone).toBe('Local saved data has been reset.')`
    - `expect(uiText.ko.resetStorageDone).toBe('로컬 저장 데이터가 초기화되었습니다.')`
  - `defines translated month labels for campaign month ids`
    - `expect(monthLabels.january.en).toBe('January')`
    - `expect(monthLabels.january.ko).toBe('1월')`
    - `expect(monthLabels.february.en).toBe('February')`
    - `expect(monthLabels.february.ko).toBe('2월')`
- Optional UI-level test:
  - React Testing Library로 `App` 전체를 렌더링해 reset 후 언어 변경 시 alert가 재번역되는지 검증할 수 있으나, reset dialog 조작과 localStorage 초기화가 필요해 scope가 커진다. 이번 변경은 `SyncMessageState` 타입과 `formatSyncMessage` helper, TypeScript build로 충분히 안정성을 확보한다.

Validation commands:

1. `npm test`
2. `npm run build`

Commit workflow:

- 구현 전 `git status --short | cat`으로 작업 트리 상태를 확인한다.
- 관련 없는 변경이 있으면 stage/commit 전에 사용자에게 확인한다.
- 관련 파일만 stage한다: `src/App.tsx`, `src/i18n/uiText.ts`, `src/components/DeckCounterDashboard.tsx`, `src/__tests__/uiText.test.ts`, `implementation_plan.md`.
- 테스트와 빌드가 통과하면 atomic commit을 생성한다.
- 권장 커밋 메시지: `Translate transient alerts and month labels`
- `.clinerules`에 따라 commit 후 현재 branch에 push한다.

[Implementation Order]
알림 상태 모델을 key 기반으로 바꾼 뒤 닫기 UI와 월 라벨 번역을 추가하고 테스트/검증/커밋한다.

1. `git status --short | cat`으로 작업 트리 상태를 확인하고 관련 없는 변경이 있으면 사용자에게 확인한다.
2. `src/i18n/uiText.ts`에 `dismissAlert` 번역 key를 영어/한국어 모두 추가한다.
3. `src/App.tsx`에 `SyncMessageKey`, `SyncMessageState`, `formatSyncMessage()`를 추가한다.
4. `src/App.tsx`의 `syncMessage` state와 `handleStartSignIn()`, `handlePull()`, `handlePush()`, `handleResetStorage()`의 `setSyncMessage()` 호출을 key/params 저장 방식으로 변경한다.
5. `src/App.tsx`의 sync alert 렌더링을 `renderedSyncMessage` 기반으로 변경하고, `text.dismissAlert`를 사용하는 닫기 버튼을 추가해 클릭 시 `setSyncMessage(undefined)`를 호출하게 한다.
6. `src/components/DeckCounterDashboard.tsx`에서 `monthLabels`를 import하고 현재 캠페인 월 표시를 `monthLabels[currentMonth][language]`로 변경한다.
7. `src/__tests__/uiText.test.ts`를 추가해 alert 관련 번역 key와 `january`/`february` 월 번역 라벨을 검증한다.
8. `npm test`를 실행해 기존 도메인/영속성 테스트와 신규 i18n 테스트를 검증한다.
9. `npm run build`를 실행해 TypeScript와 production build를 검증한다.
10. `git status --short | cat`으로 변경 파일을 확인하고 관련 파일만 stage한다.
11. 테스트가 통과한 상태로 atomic commit을 생성하고 현재 branch에 push한다.
