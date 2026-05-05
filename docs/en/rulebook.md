# Pandemic Legacy Season 0 Rulebook Notes

> Markdown reference generated for the deck-counter assistant from the English rulebook PDF. This file is intentionally organized around stable anchors used by the app. Verify against the official rulebook during play.

## Setup {#setup}

- Build the Player deck from available City and Event cards.
- Deal starting hands according to player count.
- Divide the remaining Player deck into five roughly equal piles, shuffle one Escalation card into each pile, and stack the piles into a single Player deck.
- Prepare the Threat deck and Threat discard area.

## Player Turn {#player-turn}

A player turn includes actions, drawing Player cards, and drawing Threat cards. The deck counter focuses only on card movement and risk visibility.

## Player Deck {#player-deck}

- Players normally draw two Player cards at the end of their turn.
- Non-Escalation Player cards can become known when drawn, discarded, removed, or held in a visible hand.
- The app should not infer the identity or order of unknown Player deck cards.

## Escalation Cards {#escalation-cards}

When an Escalation card is drawn:

1. Resolve the increase step required by the current rule set.
2. Draw the required Threat card from the bottom of the Threat deck and place it in the Threat discard pile.
3. Intensify by shuffling the Threat discard pile and placing it on top of the Threat deck.
4. Remove/resolve the drawn Escalation card and continue tracking the next Player deck pile.

## Threat Cards {#threat-cards}

- Threat cards are drawn from the Threat deck and placed into the Threat discard pile unless a rule says otherwise.
- After intensify, the previously discarded Threat cards become the next known high-risk stack on top of the Threat deck if the user records their order.
- Unknown ordering must remain unknown unless the players explicitly track it.

## Incidents {#incidents}

Some effects draw Threat cards from the bottom of the Threat deck and move them to a Game End area instead of the discard pile. These cards should remain separated during the game.

## Game End {#game-end}

The game can end through normal success/failure conditions. The deck counter should preserve the final state for review.

## After the Game {#after-the-game}

After-game cleanup moves cards in the Game End area to the Threat discard pile unless a legacy rule says otherwise. Campaign-specific changes should be added to `legacy-rules.md` and mirrored in structured rule toggles.
