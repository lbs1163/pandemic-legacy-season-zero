import { describe, expect, it } from 'vitest';
import { createInitialCampaign } from '../domain/createInitialCampaign';
import { applySupportedEventEffect } from '../domain/events';
import { recordInitialThreatSetup } from '../domain/threatDeck';
import { threatCards } from '../data/cards/threats';

const eventCardId = 'event-counterintelligence-team';
const targetThreatCardId = threatCards[0].id;
const now = '2026-05-09T00:00:00.000Z';

function createCampaignWithCounterintelligenceInHand() {
  const campaign = createInitialCampaign({
    campaignName: 'Event effects',
    language: 'ko',
    players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
  });

  return {
    ...campaign,
    playerDeck: {
      ...campaign.playerDeck,
      cardStates: {
        ...campaign.playerDeck.cardStates,
        [eventCardId]: {
          cardId: eventCardId,
          zone: 'player-hand' as const,
          ownerPlayerId: 'p1',
          updatedAt: now
        }
      }
    },
    threatDeck: recordInitialThreatSetup(campaign.threatDeck, threatCards.slice(0, 9).map((card) => card.id))
  };
}

describe('event effects domain', () => {
  it('moves a used hand event to player discard while applying its threat effect', () => {
    const campaign = createCampaignWithCounterintelligenceInHand();

    const next = applySupportedEventEffect(campaign, {
      eventCardId,
      targetCardId: targetThreatCardId,
      now
    });

    expect(next.threatDeck.discardCardIds).not.toContain(targetThreatCardId);
    expect(next.threatDeck.gameEndAreaCardIds).toContain(targetThreatCardId);
    expect(next.playerDeck.cardStates[eventCardId]).toMatchObject({
      cardId: eventCardId,
      zone: 'player-discard',
      updatedAt: now
    });
    expect(next.playerDeck.cardStates[eventCardId].ownerPlayerId).toBeUndefined();
    expect(next.updatedAt).toBe(now);
  });

  it('rejects applying an event effect when the event card is not in hand', () => {
    const campaign = createCampaignWithCounterintelligenceInHand();
    const used = applySupportedEventEffect(campaign, {
      eventCardId,
      targetCardId: targetThreatCardId,
      now
    });

    expect(() => applySupportedEventEffect(used, {
      eventCardId,
      targetCardId: threatCards[1].id,
      now: '2026-05-09T01:00:00.000Z'
    })).toThrow(/in hand/);
  });
});