import { describe, expect, it } from 'vitest';
import { createInitialCampaign } from '../domain/createInitialCampaign';
import { createEmptyEnvelope, validatePersistedEnvelope } from '../services/localCache';

describe('campaign persistence validation', () => {
  it('validates an empty envelope', () => {
    const envelope = createEmptyEnvelope();

    expect(validatePersistedEnvelope(envelope)).toEqual(envelope);
  });

  it('validates an envelope with a campaign', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Prologue',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const envelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 2 as const,
      activeCampaignId: campaign.campaignId,
      campaigns: [campaign]
    };

    expect(validatePersistedEnvelope(envelope).campaigns[0].campaignName).toBe('Prologue');
  });

  it('migrates v1 envelopes to v2 card-state decks', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Legacy local state',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const legacyEnvelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 1 as const,
      activeCampaignId: campaign.campaignId,
      campaigns: [{
        ...campaign,
        playerDeck: { ...campaign.playerDeck, startingHand: undefined },
        threatDeck: {
          totalInitialCount: 28,
          unknownDrawPileCount: 28,
          discardCardIds: [],
          knownTopStackCardIds: [],
          gameEndAreaCardIds: [],
          removedCardIds: []
        }
      }]
    };

    const migrated = validatePersistedEnvelope(legacyEnvelope);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.campaigns[0].playerDeck.startingHand.configured).toBe(false);
    expect(Object.keys(migrated.campaigns[0].threatDeck.cardStates).length).toBeGreaterThan(0);
  });

  it('rejects unsupported schema versions', () => {
    expect(() => validatePersistedEnvelope({
      appId: 'pandemic-legacy-season-zero-deck-counter',
      schemaVersion: 3,
      campaigns: []
    })).toThrow();
  });
});
