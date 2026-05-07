import { describe, expect, it } from 'vitest';
import { createInitialPlayerDeckState } from '../domain/playerDeck';
import { createInitialThreatDeckState, getThreatLevel, recordInitialThreatSetup } from '../domain/threatDeck';
import { completePlayerDrawStep, completeThreatDrawStep } from '../domain/turnFlow';
import type { CampaignState } from '../types/campaign';

function createCampaign(): CampaignState {
  const playerDeck = createInitialPlayerDeckState({
    playerCardIds: Array.from({ length: 20 }, (_, index) => `card-${index + 1}`),
    playerCount: 4,
    escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
    now: '2026-01-01T00:00:00.000Z'
  });
  const threatDeck = recordInitialThreatSetup(
    createInitialThreatDeckState(Array.from({ length: 20 }, (_, index) => `threat-${index + 1}`), '2026-01-01T00:00:00.000Z'),
    Array.from({ length: 9 }, (_, index) => `threat-${index + 1}`)
  );

  return {
    schemaVersion: 1,
    campaignId: 'campaign-1',
    campaignName: 'Test campaign',
    language: 'ko',
    players: [{ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' }],
    playerDeck,
    threatDeck,
    turnFlow: { step: 'player-draw', turnNumber: 1 },
    ruleToggles: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('turn flow domain', () => {
  it('forces exactly two player cards before threat reveal', () => {
    const campaign = createCampaign();

    expect(() => completePlayerDrawStep(campaign, [
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' }
    ])).toThrow(/exactly 2/);
  });

  it('moves from two player draws to threat draw step', () => {
    const next = completePlayerDrawStep(createCampaign(), [
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' },
      { kind: 'player-card', cardId: 'card-2', destination: 'player-hand' }
    ]);

    expect(next.playerDeck.cardStates['card-1'].zone).toBe('player-hand');
    expect(next.playerDeck.cardStates['card-2'].zone).toBe('player-hand');
    expect(next.turnFlow).toEqual({ step: 'threat-draw', turnNumber: 1 });
  });

  it('rejects duplicate player card selections', () => {
    expect(() => completePlayerDrawStep(createCampaign(), [
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' },
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' }
    ])).toThrow(/duplicate Player cards/);
  });

  it('resolves one escalation with threat level increase, bottom draw, and intensify', () => {
    const next = completePlayerDrawStep(createCampaign(), [
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' },
      { kind: 'escalation', cardId: 'e1', bottomThreatCardId: 'threat-10' }
    ]);

    expect(next.playerDeck.cardStates.e1.zone).toBe('player-drawn-escalation');
    expect(next.threatDeck.threatLevelIndex).toBe(1);
    expect(getThreatLevel(next.threatDeck)).toBe(2);
    expect(next.threatDeck.discardCardIds).toEqual([]);
    expect(next.threatDeck.knownTopStackCardIds).toContain('threat-10');
  });

  it('resolves two escalations sequentially', () => {
    const next = completePlayerDrawStep(createCampaign(), [
      { kind: 'escalation', cardId: 'e1', bottomThreatCardId: 'threat-10' },
      { kind: 'escalation', cardId: 'e2', bottomThreatCardId: 'threat-11' }
    ]);

    expect(next.threatDeck.threatLevelIndex).toBe(2);
    expect(next.threatDeck.knownTopStacks).toEqual([['threat-11'], [...Array.from({ length: 9 }, (_, index) => `threat-${index + 1}`), 'threat-10']]);
    expect(next.threatDeck.knownTopStackCardIds[0]).toBe('threat-11');
    expect(next.threatDeck.knownTopStackCardIds).toContain('threat-10');
  });

  it('rejects duplicate bottom threat cards for escalations', () => {
    expect(() => completePlayerDrawStep(createCampaign(), [
      { kind: 'escalation', cardId: 'e1', bottomThreatCardId: 'threat-10' },
      { kind: 'escalation', cardId: 'e2', bottomThreatCardId: 'threat-10' }
    ])).toThrow(/same bottom Threat card/);
  });

  it('reveals current threat level count and advances the turn', () => {
    const afterPlayerDraw = completePlayerDrawStep(createCampaign(), [
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' },
      { kind: 'player-card', cardId: 'card-2', destination: 'player-hand' }
    ]);
    const next = completeThreatDrawStep(afterPlayerDraw, ['threat-10', 'threat-11']);

    expect(next.threatDeck.discardCardIds.slice(-2)).toEqual(['threat-10', 'threat-11']);
    expect(next.turnFlow).toEqual({ step: 'player-draw', turnNumber: 2 });
  });

  it('allows threat reveal selections from a known top shuffled stack in any order', () => {
    const afterPlayerDraw = completePlayerDrawStep(createCampaign(), [
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' },
      { kind: 'escalation', cardId: 'e1', bottomThreatCardId: 'threat-10' }
    ]);

    const next = completeThreatDrawStep(afterPlayerDraw, ['threat-2', 'threat-1']);

    expect(next.threatDeck.discardCardIds).toEqual(['threat-2', 'threat-1']);
    expect(next.threatDeck.knownTopStackCardIds).toEqual([
      'threat-3',
      'threat-4',
      'threat-5',
      'threat-6',
      'threat-7',
      'threat-8',
      'threat-9',
      'threat-10'
    ]);
    expect(next.turnFlow).toEqual({ step: 'player-draw', turnNumber: 2 });
  });

  it('rejects duplicate threat card selections', () => {
    const afterPlayerDraw = completePlayerDrawStep(createCampaign(), [
      { kind: 'player-card', cardId: 'card-1', destination: 'player-hand' },
      { kind: 'player-card', cardId: 'card-2', destination: 'player-hand' }
    ]);

    expect(() => completeThreatDrawStep(afterPlayerDraw, ['threat-10', 'threat-10'])).toThrow(/duplicate Threat cards/);
  });
});