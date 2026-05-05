# Implementation Plan

[Overview]
Pandemic Legacy Season 0 deck counter MVP will convert the existing English and Korean PDF rulebooks into committed markdown references, then implement a browser web app that tracks the Player deck and Threat deck with GitHub OAuth + private gist persistence and rule-toggle-ready data structures.

The repository currently contains only two source documents: `docs/en/pandemic_legacy_season_0_rulebook_english.pdf` and `docs/ko/pandemic_legacy_season_0_rulebook_korean.pdf`; there is no existing application code, dependency manifest, test setup, or build configuration. The implementation therefore starts by creating a new TypeScript browser application in the repository root while preserving the existing `docs/` layout.

The user’s requested long-term workflow is that newly discovered Legacy rules are continuously added to markdown rule files, and the deck counter updates from those rule definitions. The MVP should not attempt to fully automate arbitrary natural-language rule interpretation. Instead, it should establish a maintainable bridge: human-readable markdown rulebooks and rule updates live under `docs/`, while app-consumable structured rule metadata lives under `src/data/rules/`. Each structured rule can reference one or more markdown anchors and can be enabled or disabled through the UI.

The MVP scope is intentionally limited to deck-counter functionality. It should track Player deck counts, Player discard/removed/hand-visible card state where useful, Escalation card setup across piles, Threat deck draw/discard/top-stack behavior, Threat cards moved to the Game End area by incidents, and probability/risk summaries. City board state such as agents, incidents, surveillance, safehouses, teams, and objectives should be represented only as future extension points, not implemented as full board simulation in this first phase.

Persistence should avoid a custom database. The selected approach is GitHub OAuth plus private gist storage. Because a browser-only app cannot safely hold a GitHub OAuth client secret, the plan uses a static-site-friendly OAuth device flow or a token-based GitHub authentication strategy appropriate for public clients. The app stores campaign/deck state as JSON in a private gist owned by the authenticated GitHub user. A local fallback cache should be used for offline resilience and recovery, but the source of truth after sign-in is the private gist.

[Types]
The type system will define explicit domain models for cards, deck zones, campaign state, rule toggles, GitHub gist synchronization, and UI-safe derived summaries.

```ts
// src/types/cards.ts
export type LanguageCode = 'en' | 'ko';

export type CardKind = 'city' | 'event' | 'escalation' | 'threat';

export type Affiliation = 'allied' | 'neutral' | 'soviet';

export type Region =
  | 'north-america'
  | 'south-america'
  | 'europe'
  | 'africa'
  | 'asia'
  | 'pacific';

export interface LocalizedText {
  en: string;
  ko: string;
}

export interface BaseCard {
  id: string;                 // Stable unique id, kebab-case, never localized.
  kind: CardKind;
  name: LocalizedText;
  notes?: LocalizedText;
}

export interface CityCard extends BaseCard {
  kind: 'city';
  region: Region;
  affiliation: Affiliation;
  country?: LocalizedText;
}

export interface EventCard extends BaseCard {
  kind: 'event';
  initialSet: boolean;        // true for the initial five Event cards mentioned in setup.
}

export interface EscalationCard extends BaseCard {
  kind: 'escalation';
  escalationNumber: number;   // 1..5 for MVP setup.
}

export interface ThreatCard extends BaseCard {
  kind: 'threat';
  cityCardId: string;         // References matching CityCard.id.
  incidentEffect?: LocalizedText;
}

export type PlayerCard = CityCard | EventCard | EscalationCard;
```

```ts
// src/types/deck.ts
export type PlayerCardZone =
  | 'player-deck-unknown'
  | 'player-hand'
  | 'player-discard'
  | 'player-removed'
  | 'player-drawn-escalation';

export type ThreatCardZone =
  | 'threat-deck-unknown'
  | 'threat-discard'
  | 'threat-top-stack-known'
  | 'threat-game-end-area'
  | 'threat-removed';

export interface CardInstanceState {
  cardId: string;
  zone: PlayerCardZone | ThreatCardZone;
  ownerPlayerId?: string;     // only for player-hand zone.
  order?: number;             // known ordering within a known stack; lower means nearer top.
  updatedAt: string;          // ISO timestamp.
}

export interface PlayerDeckPile {
  id: string;                 // e.g. pile-1..pile-5.
  initialUnknownCount: number;
  remainingUnknownCount: number;
  escalationCardId?: string;
  escalationResolved: boolean;
}

export interface PlayerDeckState {
  totalInitialCount: number;
  drawCountPerTurn: 2;
  piles: PlayerDeckPile[];
  cardStates: Record<string, CardInstanceState>;
  currentPileIndex: number;   // 0-based pile currently being drawn from.
}

export interface ThreatDeckState {
  totalInitialCount: number;
  unknownDrawPileCount: number;
  discardCardIds: string[];
  knownTopStackCardIds: string[]; // produced after Escalation intensify.
  gameEndAreaCardIds: string[];
  removedCardIds: string[];
}
```

```ts
// src/types/rules.ts
export type RuleCategory = 'base' | 'legacy' | 'month' | 'house-rule';

export interface RuleReference {
  language: LanguageCode;
  markdownPath: string;       // e.g. docs/en/rulebook.md.
  anchor: string;             // markdown heading anchor.
}

export interface RuleToggle {
  id: string;                 // e.g. base.escalation, legacy.prologue.incidents.
  label: LocalizedText;
  description: LocalizedText;
  category: RuleCategory;
  defaultEnabled: boolean;
  enabled: boolean;
  introducedBy?: string;      // e.g. prologue, january, user-added.
  references: RuleReference[];
  affects: Array<'player-deck' | 'threat-deck' | 'sync' | 'ui'>;
}
```

```ts
// src/types/campaign.ts
export interface PlayerProfile {
  id: string;
  name: string;
}

export interface CampaignState {
  schemaVersion: 1;
  campaignId: string;
  campaignName: string;
  language: LanguageCode;
  players: PlayerProfile[];
  currentMonth?: string;
  fundingLevel?: number;
  playerDeck: PlayerDeckState;
  threatDeck: ThreatDeckState;
  ruleToggles: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface DeckCounterSummary {
  playerDeckRemaining: number;
  playerDeckDiscardCount: number;
  unresolvedEscalations: number;
  currentPileEscalationRisk: number; // 0..1.
  threatDeckUnknownRemaining: number;
  threatDiscardCount: number;
  threatKnownTopStackCount: number;
  gameEndAreaCount: number;
}
```

```ts
// src/types/sync.ts
export interface GitHubUser {
  login: string;
  avatarUrl: string;
}

export interface AuthState {
  status: 'signed-out' | 'pending-device-flow' | 'signed-in' | 'error';
  accessToken?: string;       // stored only in browser storage; never committed.
  user?: GitHubUser;
  errorMessage?: string;
}

export interface GistSyncMetadata {
  gistId?: string;
  fileName: 'pandemic-legacy-season-zero-state.json';
  etag?: string;
  lastPulledAt?: string;
  lastPushedAt?: string;
  dirty: boolean;
}

export interface PersistedEnvelope {
  appId: 'pandemic-legacy-season-zero-deck-counter';
  schemaVersion: 1;
  campaigns: CampaignState[];
  activeCampaignId?: string;
}
```

Validation rules:
- All ids must be stable lowercase kebab-case strings.
- `CampaignState.schemaVersion` and `PersistedEnvelope.schemaVersion` must be checked before loading.
- Count fields must never be negative.
- `PlayerDeckState.piles.length` must be 5 for the MVP because the base setup shuffles 5 Escalation cards into 5 piles.
- `currentPileEscalationRisk` must be derived, not manually edited.
- A `ThreatCard.cityCardId` must reference an existing `CityCard.id`.
- Unknown card ordering must not be inferred unless the user explicitly records a known top stack.

[Files]
The implementation will create a new TypeScript React/Vite application, add markdown rulebook outputs, add structured game/rule data, and add GitHub gist synchronization modules.

New files to be created:
- `package.json`: npm scripts and project dependencies for the browser app.
- `package-lock.json`: locked dependency graph after installation.
- `tsconfig.json`: TypeScript compiler configuration.
- `tsconfig.node.json`: Vite/node-specific TypeScript configuration if required by the chosen Vite template.
- `vite.config.ts`: Vite build/test configuration.
- `index.html`: root HTML entrypoint.
- `.gitignore`: excludes `node_modules`, build outputs, env files, local caches, and generated temporary extraction files.
- `.env.example`: documents required public GitHub OAuth/device-flow settings if any.
- `docs/en/rulebook.md`: English markdown conversion of `docs/en/pandemic_legacy_season_0_rulebook_english.pdf`.
- `docs/ko/rulebook.md`: Korean markdown conversion of `docs/ko/pandemic_legacy_season_0_rulebook_korean.pdf`.
- `docs/en/legacy-rules.md`: human-maintained English additions discovered during campaign play.
- `docs/ko/legacy-rules.md`: human-maintained Korean additions discovered during campaign play.
- `docs/rule-authoring.md`: explains how to add new markdown rule sections and corresponding structured toggles.
- `scripts/extract-rulebooks.mjs`: converts PDFs to raw text/markdown-friendly files using local tooling or Node packages.
- `src/main.tsx`: React entrypoint.
- `src/App.tsx`: top-level app shell.
- `src/styles.css`: global styling.
- `src/types/cards.ts`: card and localization domain types.
- `src/types/deck.ts`: deck zone and deck state types.
- `src/types/rules.ts`: rule toggle/reference types.
- `src/types/campaign.ts`: campaign state and derived summary types.
- `src/types/sync.ts`: GitHub auth/gist sync types.
- `src/data/cards/cities.ts`: base city card metadata in English and Korean.
- `src/data/cards/events.ts`: initial event card metadata; can use placeholders where exact event names require manual confirmation.
- `src/data/cards/escalations.ts`: five Escalation card definitions.
- `src/data/cards/threats.ts`: threat card metadata linked to cities, including incident effect placeholders where extraction is unreliable.
- `src/data/rules/baseRules.ts`: structured base rule toggles for deck setup, Escalation, Threat draws, incidents/Game End area.
- `src/data/rules/legacyRules.ts`: initial empty or sample legacy rule toggle registry for future monthly rules.
- `src/domain/createInitialCampaign.ts`: creates a validated default campaign/deck state.
- `src/domain/playerDeck.ts`: pure functions for Player deck operations.
- `src/domain/threatDeck.ts`: pure functions for Threat deck operations.
- `src/domain/probabilities.ts`: pure functions for risk summaries.
- `src/domain/ruleToggles.ts`: applies and lists enabled/disabled rules.
- `src/services/githubAuth.ts`: GitHub sign-in/device-flow logic.
- `src/services/gistStorage.ts`: private gist CRUD for persisted state.
- `src/services/localCache.ts`: local fallback cache.
- `src/components/AuthPanel.tsx`: sign-in/sign-out/sync status UI.
- `src/components/CampaignSelector.tsx`: campaign selection and creation UI.
- `src/components/DeckCounterDashboard.tsx`: page layout for deck counters and summaries.
- `src/components/PlayerDeckPanel.tsx`: Player deck state display and actions.
- `src/components/ThreatDeckPanel.tsx`: Threat deck state display and actions.
- `src/components/RuleTogglePanel.tsx`: rule options UI.
- `src/components/RuleReferencePanel.tsx`: links active rules to markdown reference sections.
- `src/components/SyncStatus.tsx`: shows dirty/synced/conflict/error status.
- `src/__tests__/playerDeck.test.ts`: tests Player deck operations and probability calculations.
- `src/__tests__/threatDeck.test.ts`: tests Threat deck discard/top-stack/Game End behavior.
- `src/__tests__/campaignPersistence.test.ts`: tests serialization and migration-safe loading.

Existing files to be modified:
- `docs/en/pandemic_legacy_season_0_rulebook_english.pdf`: no content modification; used as source.
- `docs/ko/pandemic_legacy_season_0_rulebook_korean.pdf`: no content modification; used as source.
- `implementation_plan.md`: this plan document may be updated if implementation scope changes.

Files to be deleted or moved:
- None.

Configuration file updates:
- `package.json` should include scripts: `dev`, `build`, `preview`, `test`, `lint`, `extract:rules`.
- `.gitignore` should exclude `.env`, `.env.local`, `dist/`, `node_modules/`, and temporary extraction artifacts.

[Functions]
The implementation will add pure domain functions for deck state transitions, derived risk calculations, rule toggle handling, and persistence adapters.

New functions:
- `createInitialCampaign(input: CreateInitialCampaignInput): CampaignState` in `src/domain/createInitialCampaign.ts`; initializes campaign state using selected language, players, funding level, and default enabled rules.
- `createInitialPlayerDeckState(config: PlayerDeckSetupConfig): PlayerDeckState` in `src/domain/playerDeck.ts`; builds five piles after initial hands/events are configured.
- `recordPlayerCardDraw(state: PlayerDeckState, cardId: string, destination: 'player-hand' | 'player-discard' | 'player-removed'): PlayerDeckState` in `src/domain/playerDeck.ts`; records a known non-Escalation draw.
- `resolveEscalationDraw(state: PlayerDeckState, escalationCardId: string): PlayerDeckState` in `src/domain/playerDeck.ts`; marks an Escalation as resolved and advances pile metadata as needed.
- `movePlayerCard(state: PlayerDeckState, cardId: string, zone: PlayerCardZone, ownerPlayerId?: string): PlayerDeckState` in `src/domain/playerDeck.ts`; moves known Player cards between zones.
- `getPlayerDeckRemaining(state: PlayerDeckState): number` in `src/domain/playerDeck.ts`; returns derived remaining count.
- `calculateCurrentPileEscalationRisk(state: PlayerDeckState): number` in `src/domain/probabilities.ts`; estimates probability that the next 2-card draw includes Escalation in the current pile based on remaining unknown count and unresolved escalation state.
- `calculateDeckCounterSummary(campaign: CampaignState): DeckCounterSummary` in `src/domain/probabilities.ts`; aggregates UI summary values.
- `recordThreatDraw(state: ThreatDeckState, cardId: string): ThreatDeckState` in `src/domain/threatDeck.ts`; moves a top/unknown Threat card to discard.
- `recordThreatBottomDrawToDiscard(state: ThreatDeckState, cardId: string): ThreatDeckState` in `src/domain/threatDeck.ts`; records Escalation add-agents bottom draw and places it in discard.
- `recordThreatBottomDrawToGameEndArea(state: ThreatDeckState, cardId: string): ThreatDeckState` in `src/domain/threatDeck.ts`; records incident bottom draw and moves it to Game End area.
- `intensifyThreatDiscard(state: ThreatDeckState, orderedCardIds?: string[]): ThreatDeckState` in `src/domain/threatDeck.ts`; moves discard to known top stack if order supplied, otherwise tracks count and known ids without pretending exact order.
- `clearThreatGameEndArea(state: ThreatDeckState): ThreatDeckState` in `src/domain/threatDeck.ts`; implements after-game movement from Game End area to discard.
- `listEnabledRules(toggles: RuleToggle[], state: CampaignState): RuleToggle[]` in `src/domain/ruleToggles.ts`; returns active rules for UI and behavior checks.
- `setRuleEnabled(campaign: CampaignState, ruleId: string, enabled: boolean): CampaignState` in `src/domain/ruleToggles.ts`; updates a rule option.
- `startGitHubDeviceFlow(): Promise<DeviceFlowStartResult>` in `src/services/githubAuth.ts`; begins GitHub OAuth for public clients.
- `pollGitHubDeviceFlow(deviceCode: string): Promise<AuthState>` in `src/services/githubAuth.ts`; completes sign-in.
- `getGitHubUser(token: string): Promise<GitHubUser>` in `src/services/githubAuth.ts`; loads signed-in user profile.
- `findOrCreateStateGist(token: string): Promise<GistSyncMetadata>` in `src/services/gistStorage.ts`; locates existing private app gist or creates one.
- `pullStateFromGist(token: string, metadata: GistSyncMetadata): Promise<PersistedEnvelope>` in `src/services/gistStorage.ts`; loads persisted state.
- `pushStateToGist(token: string, metadata: GistSyncMetadata, envelope: PersistedEnvelope): Promise<GistSyncMetadata>` in `src/services/gistStorage.ts`; saves state.
- `loadLocalCache(): PersistedEnvelope | undefined` in `src/services/localCache.ts`; loads offline fallback.
- `saveLocalCache(envelope: PersistedEnvelope): void` in `src/services/localCache.ts`; writes offline fallback.

Modified functions:
- None; no existing source functions are present.

Removed functions:
- None.

[Classes]
The implementation should prefer plain TypeScript interfaces, pure functions, and React function components; no domain classes are required for the MVP.

New classes:
- None.

Modified classes:
- None; no existing classes are present.

Removed classes:
- None.

React function components to be created instead of classes:
- `App` in `src/App.tsx`: owns top-level auth, persistence, and active campaign state.
- `AuthPanel` in `src/components/AuthPanel.tsx`: manages GitHub sign-in prompts and sign-out action.
- `CampaignSelector` in `src/components/CampaignSelector.tsx`: selects or creates a campaign.
- `DeckCounterDashboard` in `src/components/DeckCounterDashboard.tsx`: composes summary, Player deck, Threat deck, and rules panels.
- `PlayerDeckPanel` in `src/components/PlayerDeckPanel.tsx`: exposes actions for drawing cards, resolving Escalations, and moving Player cards.
- `ThreatDeckPanel` in `src/components/ThreatDeckPanel.tsx`: exposes actions for Threat draws, bottom draws, intensify, and Game End area handling.
- `RuleTogglePanel` in `src/components/RuleTogglePanel.tsx`: allows users to enable/disable optional rule modules.
- `RuleReferencePanel` in `src/components/RuleReferencePanel.tsx`: displays links or excerpts pointing to relevant markdown rule anchors.
- `SyncStatus` in `src/components/SyncStatus.tsx`: displays local/remote sync state and conflict warnings.

[Dependencies]
The implementation will add local npm dependencies for a TypeScript React/Vite web app, testing, and PDF-to-markdown extraction support without requiring a custom database.

Recommended dependencies:
- `@vitejs/plugin-react`: Vite React integration.
- `vite`: development server and production build.
- `typescript`: static typing.
- `react` and `react-dom`: UI framework.
- `lucide-react` or no icon package: optional icons; can be omitted if minimizing dependencies.
- `zod`: runtime validation for persisted JSON and future migrations.
- `@octokit/rest`: GitHub REST API client for gist operations.
- `vitest`: unit test runner.
- `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`: component tests if component testing is included.
- `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`: linting if project standardization is desired.

PDF extraction options:
- First try system/Python extraction through repository scripts. The current environment does not expose `pdftotext`; Python is available.
- If Python extraction quality is insufficient, add a local npm package such as `pdf-parse` or a maintained alternative and wire it through `scripts/extract-rulebooks.mjs`.
- The Korean PDF extraction is noisy based on initial inspection, so the markdown conversion step should include cleanup headings and sections manually where extraction fails.

GitHub OAuth/gist requirements:
- No custom app database.
- Use GitHub OAuth/device flow or a public-client-compatible OAuth flow.
- Required GitHub scopes should be minimal but must allow private gist creation/update. GitHub’s classic OAuth scope for this is typically `gist`.
- Never commit tokens or client secrets.
- Document setup in `.env.example` and app UI.

[Testing]
Testing will focus on pure deck logic, persistence validation, and critical UI workflows rather than full end-to-end automation in the MVP.

Test files and validation:
- `src/__tests__/playerDeck.test.ts` should verify initial pile creation, remaining card counts, card zone transitions, Escalation resolution, and current-pile risk calculations.
- `src/__tests__/threatDeck.test.ts` should verify Threat draws to discard, bottom draws to discard for Escalation, bottom draws to Game End area for incidents, intensify behavior, and after-game Game End cleanup.
- `src/__tests__/campaignPersistence.test.ts` should verify `PersistedEnvelope` validation, schema version checks, serialization/deserialization, and local cache compatibility.
- Component tests should cover `RuleTogglePanel` and the main deck action buttons if time permits.
- Manual validation should include starting the dev server, creating a campaign, performing a sample setup, drawing Player cards, resolving Escalation, drawing Threat cards, toggling a rule, refreshing the browser, and confirming state recovery.
- GitHub gist sync should be manually tested with a real GitHub account or mocked in unit tests to avoid network-dependent CI failures.

[Implementation Order]
The implementation should proceed from documentation extraction and project scaffolding, then domain models and tests, then UI, then GitHub gist persistence, minimizing rework and keeping the MVP usable at each stage.

1. Create the React/Vite TypeScript project scaffold at the repository root with `package.json`, TypeScript config, Vite config, `index.html`, `src/main.tsx`, and base styling.
2. Add `.gitignore` and `.env.example` before introducing auth or generated artifacts.
3. Create markdown rulebook outputs: `docs/en/rulebook.md` and `docs/ko/rulebook.md`, using the PDFs as source and preserving clear headings/anchors for Setup, Player Turn, Player Deck, Escalation Cards, Threat Cards, Incidents, Game End, and After the Game.
4. Add `docs/en/legacy-rules.md`, `docs/ko/legacy-rules.md`, and `docs/rule-authoring.md` to define the future rule update workflow.
5. Add TypeScript domain types under `src/types/` exactly covering cards, decks, rules, campaign state, and sync metadata.
6. Add base card/rule data under `src/data/`, including city metadata, five Escalation cards, initial event placeholders if needed, threat metadata, base rule toggles, and an empty legacy rule registry.
7. Implement pure domain functions in `src/domain/` for initial campaign creation, Player deck operations, Threat deck operations, probabilities, and rule toggles.
8. Add unit tests for domain functions and persistence validation; run tests and fix logic issues before building UI behavior on top.
9. Implement React components for auth shell placeholder, campaign selection, dashboard, Player deck panel, Threat deck panel, rule toggles, rule references, and sync status.
10. Wire local cache persistence first so the app is usable before GitHub sync is complete.
11. Implement GitHub OAuth/device-flow sign-in and private gist find/create/pull/push behavior with explicit sync status and error handling.
12. Integrate remote gist sync with local cache fallback, including dirty-state handling and safe overwrite/conflict prompts.
13. Run `npm test`, `npm run build`, and manual dev-server validation.
14. Update `implementation_plan.md` if scope adjustments were necessary during implementation, then create a concise handoff summary.
