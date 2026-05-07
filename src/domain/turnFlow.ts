import { resolveEscalationDraw, recordPlayerCardDraw } from './playerDeck';
import { getThreatLevel, recordThreatDraw, resolveEscalationThreatEffects } from './threatDeck';
import type { CampaignState } from '../types/campaign';
import type { PlayerCardDestination } from '../types/deck';

export type PlayerDrawSelection =
  | { kind: 'player-card'; cardId: string; destination: PlayerCardDestination }
  | { kind: 'escalation'; cardId: string; bottomThreatCardId: string };

export function completePlayerDrawStep(campaign: CampaignState, selections: PlayerDrawSelection[]): CampaignState {
  if (selections.length !== campaign.playerDeck.drawCountPerTurn) {
    throw new Error(`Player draw step requires exactly ${campaign.playerDeck.drawCountPerTurn} cards.`);
  }

  let playerDeck = campaign.playerDeck;
  let threatDeck = campaign.threatDeck;

  for (const selection of selections) {
    if (selection.kind === 'player-card') {
      playerDeck = recordPlayerCardDraw(playerDeck, selection.cardId, selection.destination);
    } else {
      playerDeck = resolveEscalationDraw(playerDeck, selection.cardId);
      threatDeck = resolveEscalationThreatEffects(threatDeck, selection.bottomThreatCardId);
    }
  }

  return {
    ...campaign,
    playerDeck,
    threatDeck,
    turnFlow: { step: 'threat-draw', turnNumber: campaign.turnFlow?.turnNumber ?? 1 }
  };
}

export function completeThreatDrawStep(campaign: CampaignState, threatCardIds: string[]): CampaignState {
  const requiredCount = getThreatLevel(campaign.threatDeck);
  if (threatCardIds.length !== requiredCount) {
    throw new Error(`Threat draw step requires exactly ${requiredCount} cards.`);
  }

  let threatDeck = campaign.threatDeck;
  for (const cardId of threatCardIds) {
    threatDeck = recordThreatDraw(threatDeck, cardId);
  }

  return {
    ...campaign,
    threatDeck,
    turnFlow: { step: 'player-draw', turnNumber: (campaign.turnFlow?.turnNumber ?? 1) + 1 }
  };
}