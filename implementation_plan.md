# Implementation Plan

[Overview]
Separate campaign creation from per-game/month setup, move campaign timeline access behind the settings menu, and remove duplicate/manual Threat deck controls so users follow the controlled turn-flow UI.

The current app mixes two distinct workflows: `src/components/NewCampaignWizard.tsx` creates the campaign and also asks for Prologue initial Threat reveal and starting hand assignments, while `src/components/MonthGameSetupWizard.tsx` performs a similar monthly game setup flow. This causes the first campaign creation modal to do too much and makes the creation path different from later month setup. The implementation should make campaign creation minimal: campaign name, app language, player count, and player names only. Immediately after creation, the active campaign page should remain selected and expose the existing “현재 월 준비 / Set up month” entry point so initial Threat cards and starting hands are configured through the same current-month setup flow used every month.

The dashboard currently always renders `CampaignTimelinePanel` in `src/components/DeckCounterDashboard.tsx`, taking prominent space even though the user wants it available only on demand. The implementation should move this panel into a dialog controlled by `src/App.tsx` and opened from the settings dropdown in `src/components/AppTopBar.tsx`. This keeps progress history accessible without permanently occupying the campaign page.

The Threat deck panel currently exposes low-level mutation actions in `src/components/ThreatDeckPanel.tsx`: normal Threat draw, bottom draw to discard, bottom draw to Game End, direct move to Game End, intensify, and after-game cleanup. Several of these duplicate controlled flows already implemented elsewhere: `TurnFlowPanel` performs normal Threat reveal and escalation bottom-card handling through `completeThreatDrawStep` and `completePlayerDrawStep`; `EventCardsPanel` applies supported event effects through `moveDiscardedThreatCardToGameEndArea`; `GameResultDialog` and month setup represent higher-level game lifecycle actions. The UI should remove these direct buttons/selectors from `ThreatDeckPanel` and prune now-unused callback plumbing from `DeckCounterDashboard` and `App`, while preserving domain functions and tests because they remain valid backend operations used by controlled flows or future lifecycle automation.

[Types]
Type changes are limited to component prop interfaces and callback input shapes; persisted state types should not change.

`src/components/NewCampaignWizard.tsx` must narrow `NewCampaignWizardProps['onCreate']` to accept only:

```ts
{
  campaignName: string;
  players: PlayerProfile[];
}
```

The wizard must stop importing or referencing `StartingHandAssignment`, `UnidentifiedTargetCitySelection`, `InitialThreatSetupEditor`, `StartingHandAssignmentEditor`, `cityCards`, `eventCards`, `threatCards`, and `monthSetupDefaults`. Validation rules: trimmed campaign name must be non-empty; player count must be one of `2 | 3 | 4`; `players.length` must equal `playerCount`; every trimmed player name must be non-empty. Player IDs continue to use the existing stable `p${index + 1}` convention.

`src/App.tsx` must narrow `createCampaignFromWizard(input)` to the same minimal shape:

```ts
{
  campaignName: string;
  players: PlayerProfile[];
}
```

It should call `createInitialCampaign({ campaignName, language, players })` and append the resulting campaign without configuring starting hands or initial Threat cards.

`src/components/DeckCounterDashboard.tsx` must remove these props from its `Props` interface because direct Threat deck mutations will no longer be exposed there:

```ts
onThreatDraw: (cardId: string) => void;
onThreatBottomToDiscard: (cardId: string) => void;
onThreatBottomToGameEnd: (cardId: string) => void;
onThreatMoveToGameEnd: (cardId: string) => void;
onThreatIntensify: () => void;
onCleanupGameEnd: () => void;
```

`src/components/ThreatDeckPanel.tsx` must remove all mutation callbacks from `Props`, leaving only read-only display/search inputs:

```ts
interface Props {
  state: ThreatDeckState;
  text: UiText;
  language: LanguageCode;
  cityCards: CityCard[];
  threatCards: ThreatCard[];
}
```

`src/components/AppTopBar.tsx` must add one new callback prop:

```ts
onOpenCampaignTimeline: () => void;
```

No changes should be made to `src/types/deck.ts`, `src/types/campaign.ts`, persisted envelope schemas in `src/services/localCache.ts`, or domain state structures. `ThreatDeckState.gameEndAreaCardIds`, `knownTopStacks`, and related fields remain because event effects and controlled escalation/cleanup logic still depend on them or may depend on them later.

[Files]
File modifications are concentrated in the React component wiring and the implementation plan/test files; no persisted schema migration is required.

- New files to be created:
  - None.

- Existing files to be modified:
  - `src/components/NewCampaignWizard.tsx`: reduce from a 4-step setup wizard to a minimal 2-step creation wizard. Keep campaign details and player setup sections. Remove initial Threat reveal and starting hand sections, their state, validation, summary text tied to hand sizes, and all related imports. Update dialog description to `Step 1 of 2` / `1 / 2단계` and a concise player summary. The final button should create on step 1 instead of step 3.
  - `src/App.tsx`: remove imports of `recordInitialThreatSetup`, `recordThreatDraw`, `recordThreatBottomDrawToDiscard`, `recordThreatBottomDrawToGameEndArea`, `moveThreatCardToGameEndArea`, `intensifyThreatDiscard`, and `clearThreatGameEndArea` if they become unused. Add `campaignTimelineOpen` state. Simplify `createCampaignFromWizard` so it only creates and selects the campaign. Pass `onOpenCampaignTimeline` to `AppTopBar`. Stop passing removed Threat mutation props to `DeckCounterDashboard`. Add a `Dialog` rendering `CampaignTimelinePanel` for the active campaign. Keep `MonthGameSetupWizard` modal unchanged for now so the current-month setup entry point continues to collect initial Threat cards and starting hands.
  - `src/components/DeckCounterDashboard.tsx`: remove the `CampaignTimelinePanel` import and permanent render. Remove direct Threat mutation props from `Props` and from the `ThreatDeckPanel` invocation. Keep the existing current-month header with `onOpenMonthSetup` and `onOpenGameResult` buttons because it is the desired page-level entry point after campaign creation.
  - `src/components/AppTopBar.tsx`: add `onOpenCampaignTimeline` prop and add a settings dropdown item labeled `캠페인 진행 기록` / `Campaign timeline`, disabled when no active campaign is selected. It should be near `recordGameResult` or `ruleOptions` because it is campaign-specific.
  - `src/components/ThreatDeckPanel.tsx`: convert to a read-only status/search panel. Remove `selectedCardId`, `selectedMoveCardId`, `execute`, `executeMoveToGameEnd`, `selectableThreats`, `threatOptions`, `moveToGameEndOptions`, and the button sections currently around the bottom of the component. Remove `Button` and `SearchableSelect` imports if unused. Keep the summary cards, search field, grouped zone display, and known top summary.
  - `src/i18n/uiText.ts`: direct Threat action labels (`drawThreat`, `bottomDrawToDiscard`, `bottomDrawToGameEnd`, `moveThreatToGameEnd`, `intensifyDiscard`, `afterGameCleanup`) may remain if still referenced in domain-adjacent UI or tests, but should be removed only if TypeScript confirms no references. Add optional text keys only if the implementation chooses to centralize the new campaign timeline dropdown label; otherwise inline bilingual labels are acceptable, matching current `AppTopBar` style.
  - `src/__tests__/campaignProgress.test.ts`: add coverage that `createGameDecksForMonth` still records initial Threat setup and starting hands through the month setup domain path, if not already covered elsewhere. This protects the separated workflow.
  - `src/__tests__/threatDeck.test.ts`: keep existing domain tests unchanged unless TypeScript/lint requires import cleanup. Do not remove domain behavior tests merely because UI buttons are removed.
  - `implementation_plan.md`: this file contains the plan and should remain in the repository unless the user asks to remove it.

- Files to be deleted or moved:
  - None. `CampaignTimelinePanel` should be reused inside a dialog, not moved or deleted.

- Configuration file updates:
  - None expected. `package.json`, `tsconfig.json`, and `vite.config.ts` do not need changes.

[Functions]
Function modifications remove duplicate UI entry points while preserving domain functions used by controlled workflows.

- New functions:
  - None required. If desired for clarity in `src/App.tsx`, a local handler `openCampaignTimeline()` can be introduced with signature `function openCampaignTimeline(): void`, but direct `setCampaignTimelineOpen(true)` is sufficient.

- Modified functions:
  - `NewCampaignWizard` in `src/components/NewCampaignWizard.tsx`: remove setup-specific state (`startingHands`, `initialThreatCardIds`), derived hand-size calculations, and the `create()` payload fields for starting hands, unidentified target city selections, and initial Threat IDs. It should reset only campaign name, player count, and players when opened.
  - `changePlayerCount` in `src/components/NewCampaignWizard.tsx`: remove `setStartingHands([])` because starting hands are no longer part of this wizard.
  - `create` in `src/components/NewCampaignWizard.tsx`: call `onCreate({ campaignName: trimmedCampaignName, players: trimmedPlayers })` only.
  - `createCampaignFromWizard` in `src/App.tsx`: remove calls to `prepareUnidentifiedTargetCities`, `configureStartingHands`, and `recordInitialThreatSetup`. Append the `createInitialCampaign` result directly and set it active.
  - `DeckCounterDashboard` in `src/components/DeckCounterDashboard.tsx`: remove permanent `CampaignTimelinePanel` render and pass only read-only props to `ThreatDeckPanel`.
  - `ThreatDeckPanel` in `src/components/ThreatDeckPanel.tsx`: remove action-related local state and helper functions so the component only displays deck counts, searchable zones, and known top cards.
  - `AppTopBar` in `src/components/AppTopBar.tsx`: render a new dropdown item invoking `onOpenCampaignTimeline` when an active campaign exists.
  - `App` in `src/App.tsx`: add timeline dialog state and JSX, remove obsolete Threat mutation callbacks from `DeckCounterDashboard` props.

- Removed functions:
  - No exported domain functions should be removed. In particular, keep `recordThreatBottomDrawToDiscard`, `recordThreatBottomDrawToGameEndArea`, `moveThreatCardToGameEndArea`, `moveDiscardedThreatCardToGameEndArea`, `intensifyThreatDiscard`, and `clearThreatGameEndArea` in `src/domain/threatDeck.ts`. They are domain primitives used by controlled flows, event effects, tests, or future automation.
  - Remove only component-local helpers in `ThreatDeckPanel`: `execute`, `executeMoveToGameEnd`, and any option builders that exist solely for the removed controls.

[Classes]
No class changes are required because this codebase uses function components and plain TypeScript functions rather than classes.

- New classes:
  - None.

- Modified classes:
  - None.

- Removed classes:
  - None.

[Dependencies]
No dependency changes are required.

The project already includes React, Radix dialogs/dropdowns, Vite, Vitest, and TypeScript. The implementation should not add packages. It should reuse existing UI primitives from `src/components/ui/dialog.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/button.tsx`, and existing panels/components. Removing direct controls from `ThreatDeckPanel` may reduce imports (`Button`, `SearchableSelect`) but does not affect package dependencies.

[Testing]
Testing should verify the separated workflow at the domain level and validate the React/TypeScript build.

Add or update tests with a focus on behavior that could regress from decoupling campaign creation and game setup:

- `src/__tests__/campaignProgress.test.ts`: add a test for `createGameDecksForMonth` that starts from `createInitialCampaign`, supplies valid `startingHands` and `initialThreatCardIds`, and asserts:
  - the returned `threatDeck.discardCardIds` contains exactly the 9 supplied initial Threat card IDs;
  - the supplied starting hand city/event card IDs have `zone: 'player-hand'` and the correct `ownerPlayerId`;
  - the returned `turnFlow` is `{ step: 'player-draw', turnNumber: 1 }`.
- Existing `src/__tests__/threatDeck.test.ts` should remain valid, proving domain operations still work even though direct UI controls are hidden.
- Run `npm test` after test changes.
- Run `npm run build` after TypeScript/React changes.

Manual validation should include:

- Opening “새 캠페인 / New campaign” shows only campaign details and player setup, then creates and selects the campaign.
- The active campaign page shows the existing “현재 월 준비 / Set up month” action, and using it opens `MonthGameSetupWizard` to collect initial Threat cards and starting hands.
- “캠페인 진행 기록 / Campaign timeline” is accessible from the settings dropdown and opens as a dialog; it is no longer always visible on the dashboard.
- `ThreatDeckPanel` no longer exposes direct action buttons for drawing, bottom drawing, intensifying, cleanup, or selected Threat-to-Game-End movement; controlled actions remain available through turn flow, month setup, game result, and event card UI.

[Implementation Order]
Implement from lower-risk UI simplification outward, then validate and commit atomically.

1. Check `git status --short` and ensure there are no unrelated user changes before editing or staging.
2. Simplify `src/components/NewCampaignWizard.tsx` to the minimal campaign/player wizard and update its `onCreate` payload type.
3. Simplify `createCampaignFromWizard` in `src/App.tsx` and remove no-longer-needed setup imports from that path.
4. Move `CampaignTimelinePanel` from permanent dashboard render into an `App` dialog and add the settings dropdown item in `src/components/AppTopBar.tsx`.
5. Remove direct Threat mutation controls from `src/components/ThreatDeckPanel.tsx`, then prune callback props from `src/components/DeckCounterDashboard.tsx` and `src/App.tsx`.
6. Add/adjust tests in `src/__tests__/campaignProgress.test.ts` to confirm month setup remains responsible for initial Threat setup and starting hands.
7. Run `npm test` and fix any failing tests caused by type or behavior changes.
8. Run `npm run build` and fix any TypeScript or production build issues.
9. Check `git status --short`, stage only files related to this task, and create an atomic commit with an imperative message such as `Separate campaign creation from game setup`.
10. Report the commit hash, branch, validation commands, and note that no push was performed unless explicitly requested.
