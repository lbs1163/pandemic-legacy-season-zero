import { resolveEscalationDraw, recordPlayerCardDraw } from './playerDeck';
import { getThreatLevel, recordThreatBottomDrawToGameEndArea, recordThreatDraw, resolveEscalationThreatEffects } from './threatDeck';
import type { CampaignState } from '../types/campaign';
import type { PlayerCardDestination } from '../types/deck';

export type PlayerDrawSelection =
  | { kind: 'player-card'; cardId: string; destination: PlayerCardDestination }
  | { kind: 'escalation'; cardId: string; bottomThreatCardId: string };

function assertUniqueCardIds(cardIds: string[], message: string) {
  if (new Set(cardIds).size !== cardIds.length) {
    throw new Error(message);
  }
}

export function completePlayerDrawStep(campaign: CampaignState, selections: PlayerDrawSelection[]): CampaignState {
  if (selections.length !== campaign.playerDeck.drawCountPerTurn) {
    throw new Error(`Player draw step requires exactly ${campaign.playerDeck.drawCountPerTurn} cards.`);
  }

  assertUniqueCardIds(selections.map((selection) => selection.cardId), 'Player draw step cannot contain duplicate Player cards.');
  assertUniqueCardIds(
    selections
      .filter((selection): selection is Extract<PlayerDrawSelection, { kind: 'escalation' }> => selection.kind === 'escalation')
      .map((selection) => selection.bottomThreatCardId),
    'Escalation draws cannot reveal the same bottom Threat card more than once.'
  );

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

  assertUniqueCardIds(threatCardIds, 'Threat draw step cannot contain duplicate Threat cards.');

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

export function skipThreatDrawStep(campaign: CampaignState): CampaignState {
  const turnFlow = campaign.turnFlow ?? { step: 'player-draw' as const, turnNumber: 1 };
  if (turnFlow.step !== 'threat-draw') {
    throw new Error('Threat draw step can only be skipped during the Threat draw step.');
  }

  return {
    ...campaign,
    turnFlow: { step: 'player-draw', turnNumber: turnFlow.turnNumber + 1 }
  };
}

export function recordIncidentBottomThreatDraw(campaign: CampaignState, bottomThreatCardId: string): CampaignState {
  return {
    ...campaign,
    threatDeck: recordThreatBottomDrawToGameEndArea(campaign.threatDeck, bottomThreatCardId)
  };
}