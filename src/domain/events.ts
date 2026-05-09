import { eventCards } from '../data/cards/events';
import type { CampaignState } from '../types/campaign';
import { movePlayerCard } from './playerDeck';
import { moveDiscardedThreatCardToGameEndArea } from './threatDeck';

export function applySupportedEventEffect(
  campaign: CampaignState,
  input: { eventCardId: string; targetCardId?: string; now?: string }
): CampaignState {
  const eventCard = eventCards.find((card) => card.id === input.eventCardId);
  if (!eventCard) throw new Error(`Unknown event card: ${input.eventCardId}`);
  if (eventCard.effect?.kind !== 'move-threat-discard-to-game-end') {
    throw new Error(`Unsupported event effect: ${input.eventCardId}`);
  }
  if (!input.targetCardId) throw new Error('This event requires a target Threat card.');
  const eventState = campaign.playerDeck.cardStates[input.eventCardId];
  if (!eventState) throw new Error(`Unknown player card: ${input.eventCardId}`);
  if (eventState.zone !== 'player-hand') {
    throw new Error(`Event card must be in hand before it can be used: ${input.eventCardId}`);
  }
  const timestamp = input.now ?? new Date().toISOString();

  return {
    ...campaign,
    threatDeck: moveDiscardedThreatCardToGameEndArea(campaign.threatDeck, input.targetCardId),
    playerDeck: movePlayerCard(campaign.playerDeck, input.eventCardId, 'player-discard', undefined, timestamp),
    updatedAt: timestamp
  };
}