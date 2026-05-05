import type { CampaignState, DeckCounterSummary } from '../types/campaign';
import { getPlayerDeckRemaining } from './playerDeck';

export function calculateCurrentPileEscalationRisk(state: CampaignState['playerDeck']): number {
  const pile = state.piles[state.currentPileIndex];
  if (!pile || pile.escalationResolved || pile.remainingUnknownCount <= 0) return 0;
  const draws = Math.min(state.drawCountPerTurn, pile.remainingUnknownCount);
  return draws / pile.remainingUnknownCount;
}

export function calculateDeckCounterSummary(campaign: CampaignState): DeckCounterSummary {
  const playerCardStates = Object.values(campaign.playerDeck.cardStates);
  return {
    playerDeckRemaining: getPlayerDeckRemaining(campaign.playerDeck),
    playerDeckDiscardCount: playerCardStates.filter((card) => card.zone === 'player-discard').length,
    unresolvedEscalations: campaign.playerDeck.piles.filter((pile) => !pile.escalationResolved).length,
    currentPileEscalationRisk: calculateCurrentPileEscalationRisk(campaign.playerDeck),
    threatDeckUnknownRemaining: campaign.threatDeck.unknownDrawPileCount,
    threatDiscardCount: campaign.threatDeck.discardCardIds.length,
    threatKnownTopStackCount: campaign.threatDeck.knownTopStackCardIds.length,
    gameEndAreaCount: campaign.threatDeck.gameEndAreaCardIds.length
  };
}
