# Implementation Plan

[Overview]
앱 언어 설정을 캠페인별 저장값에서 분리해 캠페인 리스트와 독립적인 전역 사용자 설정으로 저장한다.

현재 앱은 React + TypeScript + Vite 기반 Pandemic Legacy Season 0 덱 카운터이며, 모든 캠페인과 활성 캠페인 정보는 `PersistedEnvelope` 하나로 로컬 스토리지 및 GitHub gist에 저장된다. 현재 언어는 `src/App.tsx`에서 `activeCampaign?.language ?? 'ko'`로 계산되고, 언어 선택 변경은 `setLanguage()`를 통해 활성 캠페인의 `CampaignState.language`를 수정한다. 따라서 캠페인을 바꾸면 UI 언어도 해당 캠페인에 저장된 언어로 바뀌며, 캠페인이 없을 때는 항상 한국어 기본값으로 돌아간다.

사용자 요구사항은 언어 설정이 특정 캠페인 세이브파일의 일부로 동작하지 않고, 캠페인 리스트와 별개의 설정값으로 작동해야 한다는 것이다. 이를 위해 저장 envelope 최상위에 전역 설정 객체를 추가하고, UI 언어는 활성 캠페인이 아니라 `envelope.settings.language`에서만 읽도록 변경한다. 기존 캠페인 데이터의 `language` 필드는 하위 호환성과 기존 테스트/데이터 생성을 위해 유지하되, 새 UI 언어 변경 경로에서는 더 이상 수정하지 않는다.

구현은 저장 스키마를 envelope v5로 올리고 `settings: { language: LanguageCode }`를 추가하는 방식으로 진행한다. v1~v4 기존 저장 데이터는 마이그레이션 시 `settings.language`를 생성해야 하며, 기존 사용자의 의도를 최대한 보존하기 위해 `activeCampaignId`로 선택된 캠페인의 `language`, 없으면 첫 캠페인의 `language`, 없으면 `'ko'` 순서로 전역 언어 기본값을 결정한다. 이후 언어 변경은 envelope 최상위 `settings.language`만 갱신하며, 캠페인 `updatedAt`, undo/redo 대상 캠페인 상태, 캠페인 진행 데이터에는 영향을 주지 않는다.

[Types]
저장 envelope 최상위에 전역 앱 설정 타입을 추가하고 envelope schema version을 5로 갱신한다.

새 타입은 `src/types/sync.ts`에 추가한다.

```ts
export interface AppSettings {
  language: LanguageCode;
}
```

필드 규칙:

- `AppSettings.language`
  - Type: `LanguageCode` (`'en' | 'ko'`)
  - Required: yes in normalized/current envelopes
  - Validation: only `'en'` or `'ko'`
  - Default during migration: active campaign language -> first campaign language -> `'ko'`
  - Domain meaning: application-wide UI language independent from campaign selection and campaign save content

`PersistedEnvelope`는 다음처럼 변경한다.

```ts
export interface PersistedEnvelope {
  appId: 'pandemic-legacy-season-zero-deck-counter';
  schemaVersion: 5;
  settings: AppSettings;
  campaigns: CampaignState[];
  activeCampaignId?: string;
}
```

`CampaignState.language`는 즉시 제거하지 않는다.

- 이유: 기존 저장 데이터, `createInitialCampaign()` 입력, 테스트 fixture, 과거 gist 데이터와의 호환성을 유지하기 위함이다.
- 변경된 의미: 신규 전역 언어 설정 도입 후에는 UI 언어의 source of truth가 아니며, legacy/migration fallback 또는 캠페인 생성 당시 참고값으로만 남는다.
- 향후 별도 migration에서 완전 제거 가능하지만, 이번 변경 범위에서는 제거하지 않는다.

`src/services/localCache.ts`의 Zod schema 변경:

```ts
const appSettingsSchema = z.object({
  language: z.union([z.literal('en'), z.literal('ko')])
});

export const persistedEnvelopeSchema = z.object({
  appId: z.literal('pandemic-legacy-season-zero-deck-counter'),
  schemaVersion: z.literal(5),
  settings: appSettingsSchema,
  activeCampaignId: z.string().optional(),
  campaigns: z.array(campaignV2Schema)
});
```

마이그레이션 보조 타입/검증 규칙:

- `resolveEnvelopeLanguage(envelope)` 같은 내부 helper는 unknown legacy envelope에서 안전하게 언어를 산출한다.
- 유효하지 않은 캠페인 언어 값은 무시하고 `'ko'`로 fallback한다.
- current schema v5에서 `settings`가 누락되면 validation이 실패하는 것이 정상이다. 단, v1~v4는 migration을 거쳐 v5가 되어야 한다.

[Files]
저장 타입/스키마, 앱 상태 업데이트 경로, 테스트를 수정하고 필요한 경우 UI 문구를 보완한다.

- New files to be created:
  - 없음. 기존 구조 안에서 타입, 스키마, 앱 상태, 테스트를 수정한다.

- Existing files to be modified:
  - `src/types/sync.ts`
    - `LanguageCode`를 `./cards`에서 type import한다.
    - `AppSettings` interface를 추가한다.
    - `PersistedEnvelope.schemaVersion`을 `4`에서 `5`로 변경한다.
    - `PersistedEnvelope.settings: AppSettings`를 추가한다.
  - `src/services/localCache.ts`
    - `appSettingsSchema`를 추가한다.
    - `persistedEnvelopeSchema.schemaVersion`을 `z.literal(5)`로 변경한다.
    - `persistedEnvelopeSchema.settings`를 필수 필드로 추가한다.
    - `migrateEnvelopeToV5(value: unknown): unknown`를 추가한다.
    - `validatePersistedEnvelope()`가 `migrateEnvelopeToV5()` 결과를 parse하도록 변경한다.
    - `createEmptyEnvelope()`가 `schemaVersion: 5`와 `settings: { language: 'ko' }`를 반환하도록 변경한다.
    - 기존 `migrateEnvelopeToV4()`는 유지해 v1~v4 경로를 모두 보존한다.
  - `src/App.tsx`
    - `language` 계산을 `activeCampaign?.language ?? 'ko'`에서 `envelope.settings.language`로 변경한다.
    - `setLanguage(nextLanguage)`가 활성 캠페인 필요 여부와 무관하게 envelope 최상위 `settings.language`만 변경하도록 수정한다.
    - `setLanguage`는 campaign `updatedAt`을 변경하지 않아야 한다.
    - 언어 변경이 undo/redo history와 dirty/gist dirty 정책을 따를지 결정한다. 기존 `updateEnvelope`를 쓰면 전역 설정 변경도 undo 가능하고 gist sync 대상이 된다.
    - `createCampaignFromWizard()`는 기존 `createInitialCampaign({ language, ... })` 호출을 유지할 수 있지만, 이 `language`는 전역 UI 언어에서 온다.
    - 캠페인이 없는 상태에서도 `AppTopBar` 언어 선택이 정상 동작해야 한다.
  - `src/components/NewCampaignWizard.tsx`
    - 문구 `언어는 현재 앱 언어를 사용합니다.` / `The current app language will be used.`가 더 이상 “캠페인의 언어 설정”처럼 오해되지 않도록 수정한다.
    - 추천 문구: `앱 언어는 캠페인과 별도로 저장됩니다. 기본 이름만 현재 언어를 따릅니다.` / `The app language is saved separately from campaigns. Default names follow the current language only.`
    - 표시 요약도 `언어: 한국어` / `Language: English`보다 `기본 이름 언어: 한국어` / `Default name language: English`처럼 변경하는 것을 권장한다.
  - `src/__tests__/campaignPersistence.test.ts`
    - 모든 current envelope fixture의 `schemaVersion`을 `5`로 갱신하고 `settings: { language: 'ko' }`를 추가한다.
    - `createEmptyEnvelope()` 검증 기대값이 새 settings를 포함하도록 조정한다.
    - v1~v4 migration 기대값을 `schemaVersion: 5`로 변경한다.
    - active campaign language에서 `settings.language`를 만드는 migration 테스트를 추가한다.
    - active campaign이 없을 때 첫 캠페인 language로 fallback하는 migration 테스트 또는 빈 envelope에서 `'ko'` fallback을 검증한다.
  - 선택 사항: `src/__tests__/campaignPersistence.test.ts` 또는 신규 테스트에서 전역 설정 검증만 담당하는 테스트를 추가한다. 신규 파일은 필수는 아니다.

- Files to be deleted or moved:
  - 없음.

- Configuration file updates:
  - 없음. `package.json`, `tsconfig.json`, `vite.config.ts` 변경은 필요 없다.

[Functions]
저장 migration helper와 앱 언어 변경 함수의 동작을 수정한다.

- New functions:
  - `isLanguageCode(value: unknown): value is LanguageCode`
    - File: `src/services/localCache.ts`
    - Suggested signature:
      ```ts
      function isLanguageCode(value: unknown): value is LanguageCode
      ```
    - Purpose: legacy envelope/campaign에서 안전하게 `'en' | 'ko'`만 선택한다.
  - `resolveEnvelopeLanguage(envelope: { activeCampaignId?: unknown; campaigns?: unknown[]; settings?: unknown }): LanguageCode`
    - File: `src/services/localCache.ts`
    - Suggested signature:
      ```ts
      function resolveEnvelopeLanguage(envelope: { activeCampaignId?: unknown; campaigns?: unknown[]; settings?: unknown }): LanguageCode
      ```
    - Purpose: v1~v4 또는 partially shaped envelope에서 전역 언어 기본값을 결정한다.
    - Logic:
      1. If `settings` has valid `language`, return it.
      2. If `activeCampaignId` is a string and a matching campaign has valid `language`, return it.
      3. If first campaign has valid `language`, return it.
      4. Return `'ko'`.
  - `migrateEnvelopeToV5(value: unknown): unknown`
    - File: `src/services/localCache.ts`
    - Suggested signature:
      ```ts
      function migrateEnvelopeToV5(value: unknown): unknown
      ```
    - Purpose: existing v1~v4 envelopes into current v5 envelope with global settings.
    - Logic:
      1. Call `migrateEnvelopeToV4(value)` first.
      2. If appId mismatch, return original value so schema parse rejects it as before.
      3. If schemaVersion is already `5`, return envelope unchanged except optionally normalizing missing/invalid settings is not recommended for strict current schema.
      4. If schemaVersion is not `4`, return envelope so schema parse rejects unsupported versions.
      5. Return `{ ...envelope, schemaVersion: 5, settings: { language: resolveEnvelopeLanguage(envelope) } }`.

- Modified functions:
  - `validatePersistedEnvelope(value: unknown): PersistedEnvelope`
    - File: `src/services/localCache.ts`
    - Current behavior: `persistedEnvelopeSchema.parse(migrateEnvelopeToV4(value))`
    - Required change: parse `migrateEnvelopeToV5(value)`.
  - `createEmptyEnvelope(): PersistedEnvelope`
    - File: `src/services/localCache.ts`
    - Required change: return v5 envelope with `settings: { language: 'ko' }`.
  - `setLanguage(nextLanguage: LanguageCode)`
    - File: `src/App.tsx`
    - Current behavior: returns early without active campaign and writes `campaign.language`/`updatedAt`.
    - Required change: always update `current.settings.language` on the envelope and do not mutate any campaign.
    - Suggested body:
      ```ts
      function setLanguage(nextLanguage: LanguageCode) {
        updateEnvelope((current) => ({
          ...current,
          settings: { ...current.settings, language: nextLanguage }
        }));
      }
      ```
  - `App()` language derivation
    - File: `src/App.tsx`
    - Current behavior: `const language: LanguageCode = activeCampaign?.language ?? 'ko';`
    - Required change: `const language: LanguageCode = envelope.settings.language;`

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
새 패키지나 버전 변경은 필요하지 않으며 기존 TypeScript, Zod, Vitest만 사용한다.

- New packages:
  - 없음.

- Version changes:
  - 없음.

- Integration requirements:
  - `src/types/sync.ts`는 `LanguageCode` type import를 추가해야 한다.
  - `src/services/localCache.ts`는 이미 `zod`를 사용하므로 settings schema 추가에 새 dependency가 필요 없다.
  - GitHub gist sync는 `PersistedEnvelope` 전체를 push/pull하므로 v5 settings가 자동 포함된다.
  - 기존 gist의 v1~v4 데이터는 pull 시 `validatePersistedEnvelope()`에서 v5로 migrate되어야 한다.
  - `createInitialCampaign()`의 `language` input은 이번 변경에서 유지한다. 단, UI 언어 source of truth로 사용하지 않는다.

[Testing]
저장 schema migration과 전역 언어 동작을 단위 테스트로 검증하고 전체 테스트/빌드를 실행한다.

테스트 요구사항:

- Test file: `src/__tests__/campaignPersistence.test.ts`
- Existing tests updates:
  - `validates an empty envelope`: `createEmptyEnvelope()`가 `{ schemaVersion: 5, settings: { language: 'ko' }, campaigns: [] }` 형태임을 포함해 검증한다.
  - `validates an envelope with a campaign`: envelope fixture에 `settings`를 추가하고 schemaVersion을 5로 변경한다.
  - `migrates v1 envelopes...`, `migrates v2...`, `migrates v3...`: migrated schemaVersion expectation을 5로 변경한다.
  - `rejects unsupported schema versions`: unsupported version은 6 등으로 조정한다.
- New tests:
  - `migrates active campaign language into global settings`
    - v4 envelope with two campaigns: first `en`, active campaign `ko`.
    - Expect `migrated.settings.language === 'ko'`.
  - `falls back to first campaign language when active campaign is missing`
    - v4 envelope with no `activeCampaignId` or a non-matching one, first campaign `en`.
    - Expect `migrated.settings.language === 'en'`.
  - `defaults global settings language to Korean for empty legacy envelopes`
    - v4 envelope with empty campaigns and no settings.
    - Expect `migrated.settings.language === 'ko'`.
  - `keeps campaign language separate from global settings`
    - v5 envelope with `settings.language: 'en'` and campaign `language: 'ko'` validates with both values preserved.

Optional UI-level test is not required because the repository currently has domain/persistence Vitest coverage but no React Testing Library app tests. If adding an app-level test, it should verify language selector changes with no active campaign, but this is optional and may increase scope.

Validation commands:

1. `npm test`
2. `npm run build`

Commit workflow:

- 구현 전 `git status --short | cat`으로 작업 트리 상태를 확인한다.
- 관련 없는 변경이 있으면 stage/commit 전에 사용자에게 확인한다.
- 관련 파일만 stage한다: `src/types/sync.ts`, `src/services/localCache.ts`, `src/App.tsx`, `src/components/NewCampaignWizard.tsx`, `src/__tests__/campaignPersistence.test.ts`, `implementation_plan.md`.
- 테스트와 빌드가 통과하면 atomic commit을 생성한다.
- 권장 커밋 메시지: `Store language as global setting`
- `.clinerules`에 따라 commit 후 현재 branch에 push한다.

[Implementation Order]
저장 타입과 migration을 먼저 확장한 뒤 앱 언어 source of truth를 전환하고 테스트/검증/커밋한다.

1. `git status --short | cat`으로 작업 트리 상태를 확인하고 관련 없는 변경이 있으면 사용자에게 확인한다.
2. `src/types/sync.ts`에 `AppSettings`를 추가하고 `PersistedEnvelope`를 schemaVersion 5 + `settings` 필드로 갱신한다.
3. `src/services/localCache.ts`에 `appSettingsSchema`, `isLanguageCode`, `resolveEnvelopeLanguage`, `migrateEnvelopeToV5`를 추가하고 current schema/empty envelope/validation path를 v5로 변경한다.
4. `src/__tests__/campaignPersistence.test.ts`의 existing fixture를 v5에 맞게 업데이트하고 v4→v5 settings migration 테스트를 추가한다.
5. `src/App.tsx`에서 UI 언어를 `envelope.settings.language`에서 읽고 `setLanguage()`가 envelope settings만 변경하도록 수정한다.
6. `src/components/NewCampaignWizard.tsx`의 언어 관련 안내 문구를 전역 언어와 캠페인 저장값 분리 의미에 맞게 조정한다.
7. `npm test`를 실행해 persistence migration 및 기존 도메인 테스트를 검증한다.
8. `npm run build`를 실행해 TypeScript와 production build를 검증한다.
9. `git status --short | cat`으로 변경 파일을 확인하고 관련 파일만 stage한다.
10. 테스트가 통과한 상태로 atomic commit을 생성하고 현재 branch에 push한다.
