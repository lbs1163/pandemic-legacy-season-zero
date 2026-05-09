# Implementation Status and Forward Plan

## Overview

This document now tracks the current implementation status of the Pandemic Legacy Season 0 deck counter and the forward plan for campaign content that will be added as play progresses.

The original plan described building a single-game MVP deck counter from scratch. The app has since moved beyond that baseline: it now includes a campaign-progress model, month setup defaults, game result history, event-card metadata, multi-card unidentified city support, and persistence migration.

The remaining work is mostly about replacing spoiler-safe placeholders with real campaign data when it becomes available during play, then adding automation for newly revealed monthly rules, event cards, legacy cards, and setup changes.

## Before / After Summary

### Before

- One saved campaign effectively represented one deck-counter game.
- The app tracked the Player deck, Threat deck, turn flow, rule toggles, local/GitHub persistence, and basic rule references.
- Legacy campaign progression existed mostly as future extension space.

### After

- One saved campaign now represents an ongoing Prologue-through-December campaign.
- The active month attempt still powers the visible Player deck, Threat deck, and turn flow.
- Campaign-level progress now tracks:
  - current month
  - current attempt
  - funding level
  - historical game records
  - characters used
  - mission results
  - performance rating
  - non-spoiler warnings
- Month and event data are intentionally extensible and placeholder-friendly so future revealed content can be appended without restructuring the app.

## Current Implementation Status

### Campaign progress model

Implemented in:

- `src/types/campaign.ts`
- `src/domain/campaignProgress.ts`
- `src/domain/createInitialCampaign.ts`

Current support:

- `CampaignMonthId` covers `prologue` through `december`.
- `CampaignProgressState` tracks current month, attempt, funding, game records, opened legacy card ids, and non-spoiler warnings.
- `CampaignGameRecord` stores month, attempt, funding, players, characters, play date, mission results, and rating.
- Funding is clamped to 1–10.
- Performance rating is calculated from mission failures:
  - 0 failed missions: `success`
  - 1 failed mission: `adequate`
  - 2+ failed missions: `failure`
- Result application behavior is implemented:
  - success/adequate advances to the next month
  - first failure retries the same month
  - second failure advances to the next month
- Secret File 14 is not revealed; if funding would exceed 10, the app records a non-spoiler warning only.

### Month setup defaults

Implemented in:

- `src/types/campaignSetup.ts`
- `src/data/campaign/months.ts`
- `src/components/MonthGameSetupWizard.tsx`

Current support:

- Ordered campaign months are defined from Prologue through December.
- Localized month labels exist in English and Korean.
- Prologue, January, and February have initial default structures.
- February includes the special unidentified target city setup:
  - filter: Africa region
  - hidden removed count: 3
  - warning if the default setup is changed
- March through December intentionally use spoiler-safe empty placeholders.

### Player deck and unidentified target city behavior

Implemented in:

- `src/types/deck.ts`
- `src/domain/playerDeck.ts`
- `src/domain/probabilities.ts`
- `src/__tests__/playerDeck.test.ts`

Current support:

- Unidentified target city setup supports arbitrary hidden removed counts, not just one card.
- Starting-hand validation ensures enough candidate cards remain hidden for the configured removal count.
- Player deck remaining/composition calculations account for hidden removed counts.
- February-style hidden removal of 3 Africa city cards is tested.

### Event card metadata and effects

Implemented in:

- `src/types/cards.ts`
- `src/data/cards/events.ts`
- `src/domain/campaignProgress.ts`
- `src/domain/events.ts`
- `src/components/EventCardsPanel.tsx`

Current support:

- Event cards can define availability by campaign month.
- Event cards can define effect metadata.
- Available events are filtered by the current campaign month.
- Prologue currently has 5 available event card slots.
- February currently adds 4 additional placeholder event card slots.
- `방첩 부대 / Counterintelligence Team` has a supported effect:
  - choose 1 card from the Threat discard area
  - move it to the Game End area
- Unsupported/unknown event effects are displayed as placeholders and do not automate behavior yet.

### Threat deck event helper

Implemented in:

- `src/domain/threatDeck.ts`
- `src/__tests__/threatDeck.test.ts`

Current support:

- Generic manual movement to the Game End area remains available for correction/manual tracking.
- Event-specific movement is stricter:
  - the target card must be in the Threat discard area
  - cards in the unknown deck, known top stack, removed area, or already in Game End are rejected for this event helper

### Persistence and migration

Implemented in:

- `src/types/sync.ts`
- `src/services/localCache.ts`
- `src/__tests__/campaignPersistence.test.ts`

Current support:

- Persisted envelope schema is now version 3.
- Campaign schema is now version 2.
- Older persisted data is migrated forward.
- Campaign progress is seeded from older state using existing month/funding fields where possible.
- Local cache validation uses zod schemas.

### UI integration

Implemented in:

- `src/App.tsx`
- `src/components/AppTopBar.tsx`
- `src/components/DeckCounterDashboard.tsx`
- `src/components/CampaignTimelinePanel.tsx`
- `src/components/GameResultDialog.tsx`
- `src/components/MonthGameSetupWizard.tsx`
- `src/components/EventCardsPanel.tsx`

Current support:

- Top-bar actions exist for:
  - creating campaigns
  - setting up the current month
  - recording a game result
  - editing starting hands
  - rule options
  - undo/redo
  - local/GitHub persistence actions
- Dashboard shows the current campaign month, attempt, and funding level.
- Campaign timeline displays recorded game results.
- Current month setup wizard can rebuild decks for the active month attempt.
- Game result dialog records played date, characters, and mission success/failure.
- Event card panel lists currently available events and exposes supported event actions.

### Tests

Current validation result:

```bash
npm test -- --run
```

Result at review time:

- 5 test files passed
- 48 tests passed

Covered areas include:

- campaign progress
- campaign persistence/migration
- player deck behavior
- threat deck behavior
- turn flow

## Known Placeholder Data

The app intentionally avoids adding spoilers that have not been provided yet. These areas are present structurally but still need real campaign data.

### Event cards

Current event data:

- `event-counterintelligence-team`
  - English: `Counterintelligence Team`
  - Korean: `방첩 부대`
  - Supported effect is implemented.
  - Exact title/effect wording should still be verified against the real card if needed.
- Four other Prologue initial events are placeholders:
  - `event-government-grant-placeholder`
  - `event-one-quiet-night-placeholder`
  - `event-resilient-population-placeholder`
  - `event-special-orders-placeholder`
- Four February-added events are placeholders:
  - `event-february-1-placeholder`
  - `event-february-2-placeholder`
  - `event-february-3-placeholder`
  - `event-february-4-placeholder`

Needed later:

- exact card id or stable app id
- English title
- Korean title
- exact effect text
- month when the card becomes available
- whether the effect should be automated or informational only

### Monthly missions

Current month data:

- Prologue has placeholder mission names.
- January has placeholder mission names.
- February has placeholder mission names, with one mission label indicating Africa city securing.
- March through December have empty mission arrays.

Needed later:

- exact mission names
- localized mission descriptions
- number of missions for each month
- default success/failure entry behavior if any
- special result handling if a legacy rule changes normal performance calculation

### Monthly setup changes

Current setup data:

- February Africa unidentified target city setup is represented.
- Later month setup changes are not filled in.

Needed later:

- city/region/affiliation filters for any new hidden setup
- number of hidden/removed cards
- new event cards added to the Player deck
- new escalation/threat/player deck setup instructions
- any rule that changes hand size, funding, setup, or cleanup

### Legacy cards and opened files

Current support:

- `openedLegacyCardIds` exists in campaign progress.
- `legacyCardIdsApplied` exists in month setup defaults.

Current limitation:

- No real legacy card ids/effects are entered yet.
- The app does not reveal Secret File 14 content.

Needed later:

- legacy card/file id
- non-spoiler trigger condition
- opened month/timing
- app behavior change, if any
- localized text to display, if safe to include

## Future Content to Add During Campaign Play

When new campaign content is revealed, add it in small, isolated updates.

### New event cards

Add or update entries in:

- `src/data/cards/events.ts`

For each event card, capture:

```ts
{
  id: 'event-stable-kebab-case-id',
  kind: 'event',
  initialSet: false,
  availability: { fromMonth: 'february' },
  name: { en: 'English title', ko: 'Korean title' },
  notes: { en: 'Optional note', ko: '선택 메모' },
  effect: {
    kind: 'informational',
    description: { en: 'Effect text', ko: '효과 문구' }
  }
}
```

Use `effect.kind: 'unknown'` if the text is known but automation has not been decided yet. Add a new effect kind only when the behavior should be automated.

### New month setup data

Add or update entries in:

- `src/data/campaign/months.ts`

For each month, capture:

```ts
{
  month: 'march',
  name: monthLabels.march,
  missions: [
    {
      id: 'march-mission-1',
      month: 'march',
      name: { en: 'Mission name', ko: '임무 이름' },
      description: { en: 'Optional description', ko: '선택 설명' },
      defaultResult: false
    }
  ],
  eventCardIdsAvailable: ['event-existing-or-new-id'],
  legacyCardIdsApplied: ['legacy-card-id-if-safe']
}
```

### New rule or legacy effects

Depending on the effect, update one or more of:

- `src/data/rules/legacyRules.ts`
- `src/domain/campaignProgress.ts`
- `src/domain/events.ts`
- `src/domain/playerDeck.ts`
- `src/domain/threatDeck.ts`
- relevant UI components
- relevant tests

Prefer pure domain helpers first, then wire them into React components.

## Recommended User Input Format for Future Revealed Content

When providing newly revealed content, use this format to make updates straightforward.

### Event card

```md
Month available: February
English title: ...
Korean title: ...
Effect text EN: ...
Effect text KO: ...
Should automate?: yes/no
If automate, what should happen in app state?: ...
```

### Month mission/setup

```md
Month: March
Missions:
1. EN / KO / description if any
2. EN / KO / description if any

Setup changes:
- ...

New event cards:
- ...

Legacy cards/files opened:
- ...
```

### Rule change

```md
Introduced by: month/card/file
Rule summary:
Exact text if safe:
Affected area:
- Player deck / Threat deck / Turn flow / Result handling / Setup / UI only
Automation desired?: yes/no
```

## Next Implementation Priorities

1. Replace known placeholder event cards with exact titles/effects as soon as card data is available.
2. Replace Prologue, January, and February placeholder mission names with exact mission text.
3. Add March and later month setup data only when revealed during play.
4. Add automated event effect kinds one at a time, with domain tests.
5. Move remaining hard-coded campaign UI labels into `src/i18n/uiText.ts` for consistency.
6. Add tests whenever a new rule changes deck behavior, result handling, or persistence.
7. Continue validating with:

```bash
npm test
npm run build
```

## Commit and Validation Notes

Per `.clinerules`:

- Check `git status --short` before staging.
- Stage only task-related files.
- Run relevant validation before commits.
- Use atomic commits with concise imperative messages.
- Push only when requested or when delivery/persistence is explicitly requested.
