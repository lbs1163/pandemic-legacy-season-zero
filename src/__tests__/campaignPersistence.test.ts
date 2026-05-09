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
      schemaVersion: 5 as const,
      settings: { language: 'ko' as const },
      activeCampaignId: campaign.campaignId,
      campaigns: [campaign]
    };

    expect(validatePersistedEnvelope(envelope).campaigns[0].campaignName).toBe('Prologue');
    expect(validatePersistedEnvelope(envelope).campaigns[0].schemaVersion).toBe(2);
  });

  it('hydrates legacy single known top stack arrays into grouped known top stacks', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Known stacks',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const envelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 5 as const,
      settings: { language: 'ko' as const },
      activeCampaignId: campaign.campaignId,
      campaigns: [{
        ...campaign,
        threatDeck: {
          ...campaign.threatDeck,
          knownTopStacks: undefined,
          knownTopStackCardIds: ['threat-city-atlanta', 'threat-city-chicago']
        }
      }]
    };

    const hydrated = validatePersistedEnvelope(envelope);

    expect(hydrated.campaigns[0].threatDeck.knownTopStacks).toEqual([['threat-city-atlanta', 'threat-city-chicago']]);
    expect(hydrated.campaigns[0].threatDeck.knownTopStackCardIds).toEqual(['threat-city-atlanta', 'threat-city-chicago']);
  });

  it('migrates v1 envelopes to v5 campaign progress, card-state decks, and settings', () => {
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

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.settings.language).toBe('ko');
    expect(migrated.campaigns[0].schemaVersion).toBe(2);
    expect(migrated.campaigns[0].progress.currentMonth).toBe('prologue');
    expect(migrated.campaigns[0].progress.currentAttempt).toBe(1);
    expect(migrated.campaigns[0].progress.fundingLevel).toBe(5);
    expect(migrated.campaigns[0].progress.gameRecords).toEqual([]);
    expect(migrated.campaigns[0].playerDeck.startingHand.configured).toBe(false);
    expect(Object.keys(migrated.campaigns[0].threatDeck.cardStates).length).toBeGreaterThan(0);
  });

  it('migrates v2 campaign state without progress to v5/v2 progress state', () => {
    const campaign = createInitialCampaign({
      campaignName: 'January legacy',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const { progress: _progress, characters: _characters, ...legacyCampaign } = campaign;
    const legacyEnvelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 2 as const,
      activeCampaignId: campaign.campaignId,
      campaigns: [{
        ...legacyCampaign,
        schemaVersion: 1 as const,
        currentMonth: 'january',
        fundingLevel: 7
      }]
    };

    const migrated = validatePersistedEnvelope(legacyEnvelope);

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.settings.language).toBe('ko');
    expect(migrated.campaigns[0].schemaVersion).toBe(2);
    expect(migrated.campaigns[0].progress.currentMonth).toBe('january');
    expect(migrated.campaigns[0].progress.fundingLevel).toBe(7);
    expect(migrated.campaigns[0].characters).toEqual([]);
  });

  it('migrates v3 single unidentified target city setup to v4 array setup', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Single setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const singleSetup = {
      configured: true,
      filter: { type: 'region' as const, value: 'europe' as const },
      candidateCardIds: ['city-london', 'city-paris'],
      hiddenRemovedCount: 1
    };
    const legacyEnvelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 3 as const,
      activeCampaignId: campaign.campaignId,
      campaigns: [{
        ...campaign,
        playerDeck: {
          ...campaign.playerDeck,
          unidentifiedTargetCity: singleSetup,
          unidentifiedTargetCities: undefined
        }
      }]
    };

    const migrated = validatePersistedEnvelope(legacyEnvelope);

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.settings.language).toBe('ko');
    expect(migrated.campaigns[0].playerDeck.unidentifiedTargetCities).toEqual([singleSetup]);
  });

  it('migrates active campaign language into global settings', () => {
    const englishCampaign = createInitialCampaign({
      campaignName: 'English campaign',
      language: 'en',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const koreanCampaign = {
      ...createInitialCampaign({
      campaignName: 'Korean campaign',
      language: 'ko',
      players: [{ id: 'p1', name: '플레이어 1' }, { id: 'p2', name: '플레이어 2' }]
      }),
      campaignId: 'active-korean-campaign'
    };
    const legacyEnvelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 4 as const,
      activeCampaignId: koreanCampaign.campaignId,
      campaigns: [englishCampaign, koreanCampaign]
    };

    const migrated = validatePersistedEnvelope(legacyEnvelope);

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.settings.language).toBe('ko');
  });

  it('falls back to first campaign language when active campaign is missing', () => {
    const campaign = createInitialCampaign({
      campaignName: 'English campaign',
      language: 'en',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const legacyEnvelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 4 as const,
      activeCampaignId: 'missing-campaign-id',
      campaigns: [campaign]
    };

    const migrated = validatePersistedEnvelope(legacyEnvelope);

    expect(migrated.settings.language).toBe('en');
  });

  it('defaults global settings language to Korean for empty legacy envelopes', () => {
    const migrated = validatePersistedEnvelope({
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 4 as const,
      campaigns: []
    });

    expect(migrated.settings.language).toBe('ko');
  });

  it('keeps campaign language separate from global settings', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Korean campaign',
      language: 'ko',
      players: [{ id: 'p1', name: '플레이어 1' }, { id: 'p2', name: '플레이어 2' }]
    });
    const envelope = {
      appId: 'pandemic-legacy-season-zero-deck-counter' as const,
      schemaVersion: 5 as const,
      settings: { language: 'en' as const },
      activeCampaignId: campaign.campaignId,
      campaigns: [campaign]
    };

    const validated = validatePersistedEnvelope(envelope);

    expect(validated.settings.language).toBe('en');
    expect(validated.campaigns[0].language).toBe('ko');
  });

  it('rejects unsupported schema versions', () => {
    expect(() => validatePersistedEnvelope({
      appId: 'pandemic-legacy-season-zero-deck-counter',
      schemaVersion: 6,
      settings: { language: 'ko' },
      campaigns: []
    })).toThrow();
  });
});
