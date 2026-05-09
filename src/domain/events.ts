import { eventCards } from '../data/cards/events';
import type { CampaignState } from '../types/campaign';
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
  return {
    ...campaign,
    threatDeck: moveDiscardedThreatCardToGameEndArea(campaign.threatDeck, input.targetCardId),
    updatedAt: input.now ?? new Date().toISOString()
  };
}