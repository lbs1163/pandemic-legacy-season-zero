import { describe, expect, it } from 'vitest';
import { createInitialCampaign } from '../domain/createInitialCampaign';
import {
  applyGameResult,
  calculateNextFundingLevel,
  calculatePerformanceRating,
  clampFundingLevel,
  createGameDecksForMonth,
  getAvailableEventCardsForMonth,
  getMonthSetupDefaults
} from '../domain/campaignProgress';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import { threatCards } from '../data/cards/threats';

describe('campaign progress domain', () => {
  it('clamps funding levels to the supported 1..10 range', () => {
    expect(clampFundingLevel(-2)).toBe(1);
    expect(clampFundingLevel(4.8)).toBe(4);
    expect(clampFundingLevel(12)).toBe(10);
  });

  it('calculates performance rating from failed mission count', () => {
    expect(calculatePerformanceRating([{ missionId: 'a', succeeded: true }, { missionId: 'b', succeeded: true }])).toBe('success');
    expect(calculatePerformanceRating([{ missionId: 'a', succeeded: false }, { missionId: 'b', succeeded: true }])).toBe('adequate');
    expect(calculatePerformanceRating([{ missionId: 'a', succeeded: false }, { missionId: 'b', succeeded: false }])).toBe('failure');
  });

  it('calculates next funding and flags secret file 14 without revealing content', () => {
    expect(calculateNextFundingLevel(4, 'success')).toMatchObject({ fundingLevel: 3, secretFile14Required: false });
    expect(calculateNextFundingLevel(4, 'adequate')).toMatchObject({ fundingLevel: 5, secretFile14Required: false });
    expect(calculateNextFundingLevel(9, 'failure')).toMatchObject({ fundingLevel: 10, secretFile14Required: true });
  });

  it('advances after success or adequate result and records game history', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Progress',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });

    const next = applyGameResult(campaign, {
      playedAt: '2026-05-09',
      characters: [{ id: 'c1', name: 'Agent', playerId: 'p1' }],
      missionResults: [{ missionId: 'm1', succeeded: true }, { missionId: 'm2', succeeded: true }],
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(next.progress.currentMonth).toBe('january');
    expect(next.progress.currentAttempt).toBe(1);
    expect(next.progress.fundingLevel).toBe(3);
    expect(next.progress.gameRecords[0]).toMatchObject({
      month: 'prologue',
      attempt: 1,
      fundingLevel: 4,
      playedAt: '2026-05-09',
      performanceRating: 'success'
    });
  });

  it('retries after first failure and advances after second failure', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Retry',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const failedMissions = [{ missionId: 'm1', succeeded: false }, { missionId: 'm2', succeeded: false }];

    const retry = applyGameResult(campaign, { characters: [], missionResults: failedMissions, now: '2026-05-09T00:00:00.000Z' });
    const advance = applyGameResult(retry, { characters: [], missionResults: failedMissions, now: '2026-05-10T00:00:00.000Z' });

    expect(retry.progress.currentMonth).toBe('prologue');
    expect(retry.progress.currentAttempt).toBe(2);
    expect(advance.progress.currentMonth).toBe('january');
    expect(advance.progress.currentAttempt).toBe(1);
    expect(advance.progress.gameRecords).toHaveLength(2);
  });

  it('filters event card availability by month', () => {
    expect(getAvailableEventCardsForMonth(eventCards, 'prologue')).toHaveLength(5);
    expect(getAvailableEventCardsForMonth(eventCards, 'february')).toHaveLength(9);
  });

  it('stores hidden city setup defaults for prologue through february', () => {
    expect(getMonthSetupDefaults('prologue').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'europe' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('january').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'asia' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('february').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'africa' }, hiddenRemovedCount: 3 },
      { enabled: true, filter: { type: 'region', value: 'north-america' }, hiddenRemovedCount: 1 }
    ]);
  });

  it('creates current-month decks with initial threats, starting hands, and turn flow', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Monthly setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const startingHands = [
      ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...eventCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p2' }))
    ];
    const initialThreatCardIds = threatCards.slice(0, 9).map((card) => card.id);

    const decks = createGameDecksForMonth({
      campaign,
      players: campaign.players,
      startingHands,
      initialThreatCardIds,
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(decks.threatDeck.discardCardIds).toEqual(initialThreatCardIds);
    for (const assignment of startingHands) {
      expect(decks.playerDeck.cardStates[assignment.cardId]).toMatchObject({
        zone: 'player-hand',
        ownerPlayerId: assignment.playerId
      });
    }
    expect(decks.turnFlow).toEqual({ step: 'player-draw', turnNumber: 1 });
  });
});