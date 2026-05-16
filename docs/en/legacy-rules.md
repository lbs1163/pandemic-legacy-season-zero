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

## Surveillance Satellite cards {#surveillance-satellite-cards}

- Rule id: `legacy-surveillance-satellite-cards`
- Introduced by: End of June / legacy rule D
- Default enabled: yes
- Affects: player-deck | ui
- Text:
  - During setup step 8, when adding Escalation cards, also perform this rule.
  - Take all Surveillance Satellite cards for continents containing control centers and return the other Surveillance Satellite cards to the depot.
  - There is one Surveillance Satellite card per continent: Asia, South America, Pacific Rim, Africa, North America, and Europe.
  - Shuffle the Surveillance Satellite cards you took.
  - If you took 6 Surveillance Satellite cards, return the remaining 1 to the depot without looking at its front.
  - Add 1 Surveillance Satellite card to each Player deck pile, starting with the rightmost pile, and shuffle it into that pile. If you took fewer than 5 Surveillance Satellite cards, some left-side piles will not have a Surveillance Satellite card.
  - The default July setup uses the Europe, South America, and Asia Surveillance Satellite cards for the control centers created through June.

## Template {#template}

- Rule id:
- Introduced by:
- Default enabled:
- Affects: player-deck | threat-deck | sync | ui
- Text:
