# Legacy Rule Additions

Use this file for English campaign rule additions discovered during play. Each rule that affects the app should also have a matching structured toggle in `src/data/rules/legacyRules.ts`.

## Infection cards {#infection-cards}

- Rule id: `legacy-infection-cards`
- Introduced by: End of February / legacy rules B and Y
- Default enabled: yes
- Affects: threat-deck | ui
- Text:
  - During setup step B, fifth step, place all Infection cards that have city names face up in the Threat discard area.
  - At the end of February, record success/failure for each of the three first-test target cities from the first mission.
  - Add one Infection card to the campaign for each city where the test was not stopped.
  - Infection cards start in the Threat discard area, unlike normal Threat cards, so they cannot be drawn before the first Escalation intensifies the discard area.
  - After being shuffled in, Infection cards and Threat cards share the same Threat deck flow.
  - During Threat reveal step Y, fifth step, when an Infection card is drawn, place 1 disease cube in that city. This app tracks decks only, so it displays this instruction without storing disease cube counts.

## Template {#template}

- Rule id:
- Introduced by:
- Default enabled:
- Affects: player-deck | threat-deck | sync | ui
- Text:
