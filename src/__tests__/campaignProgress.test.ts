import { describe, expect, it } from 'vitest';
import { createInitialCampaign } from '../domain/createInitialCampaign';
import {
  applyGameResult,
  calculateNextCampaignFundingLevel,
  calculateNextFundingLevel,
  calculatePerformanceRating,
  clampFundingLevel,
  createGameDecksForMonth,
  getAvailableEventCardsForMonth,
  getMonthSetupDefaults,
  isCampaignMonthSetupComplete
} from '../domain/campaignProgress';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import { threatCards } from '../data/cards/threats';
import type { MissionResult, PerformanceRating } from '../types/campaign';

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
    expect(calculateNextFundingLevel(5, 'success')).toMatchObject({ fundingLevel: 4, secretFile14Required: false });
    expect(calculateNextFundingLevel(5, 'adequate')).toMatchObject({ fundingLevel: 6, secretFile14Required: false });
    expect(calculateNextFundingLevel(9, 'failure')).toMatchObject({ fundingLevel: 10, secretFile14Required: true });
  });

  it('keeps campaign funding fixed at 5 for prologue results', () => {
    expect(calculateNextCampaignFundingLevel('prologue', 5, 'success')).toEqual({
      rawFundingLevel: 5,
      fundingLevel: 5,
      secretFile14Required: false
    });
    expect(calculateNextCampaignFundingLevel('prologue', 5, 'adequate')).toEqual({
      rawFundingLevel: 5,
      fundingLevel: 5,
      secretFile14Required: false
    });
    expect(calculateNextCampaignFundingLevel('prologue', 10, 'failure')).toEqual({
      rawFundingLevel: 5,
      fundingLevel: 5,
      secretFile14Required: false
    });
  });

  it('advances after success or adequate result and records game history', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Progress',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const preparedCampaign = {
      ...campaign,
      ...createGameDecksForMonth({
        campaign,
        players: campaign.players,
        startingHands: [
          ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
          ...eventCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p2' }))
        ],
        initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
      })
    };
    expect(isCampaignMonthSetupComplete(preparedCampaign)).toBe(true);

    const next = applyGameResult(preparedCampaign, {
      playedAt: '2026-05-09',
      characters: [{ id: 'c1', name: 'Agent', playerId: 'p1' }],
      missionResults: [{ missionId: 'm1', succeeded: true }, { missionId: 'm2', succeeded: true }],
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(next.progress.currentMonth).toBe('january');
    expect(next.progress.currentAttempt).toBe(1);
    expect(next.progress.fundingLevel).toBe(5);
    expect(next.progress.gameRecords[0]).toMatchObject({
      month: 'prologue',
      attempt: 1,
      fundingLevel: 5,
      playedAt: '2026-05-09',
      performanceRating: 'success'
    });
    expect(isCampaignMonthSetupComplete(next)).toBe(false);
    expect(next.playerDeck.startingHand.configured).toBe(false);
    expect(next.playerDeck.cardStates['event-counterintelligence-team']).toBeDefined();
    expect(next.threatDeck.discardCardIds).toEqual([]);
    expect(next.threatDeck.gameEndAreaCardIds).toEqual([]);
    expect(next.turnFlow).toEqual({ step: 'player-draw', turnNumber: 1 });
  });

  it('retries after first failure and advances after second failure', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Retry',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const failedMissions = [{ missionId: 'm1', succeeded: false }, { missionId: 'm2', succeeded: false }];

    const preparedCampaign = {
      ...campaign,
      ...createGameDecksForMonth({
        campaign,
        players: campaign.players,
        startingHands: [
          ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
          ...eventCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p2' }))
        ],
        initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
      })
    };

    const retry = applyGameResult(preparedCampaign, { characters: [], missionResults: failedMissions, now: '2026-05-09T00:00:00.000Z' });
    const advance = applyGameResult(retry, { characters: [], missionResults: failedMissions, now: '2026-05-10T00:00:00.000Z' });

    expect(retry.progress.currentMonth).toBe('prologue');
    expect(retry.progress.currentAttempt).toBe(2);
    expect(retry.progress.fundingLevel).toBe(5);
    expect(isCampaignMonthSetupComplete(retry)).toBe(false);
    expect(retry.playerDeck.startingHand.configured).toBe(false);
    expect(retry.threatDeck.discardCardIds).toEqual([]);
    expect(retry.turnFlow).toEqual({ step: 'player-draw', turnNumber: 1 });
    expect(advance.progress.currentMonth).toBe('january');
    expect(advance.progress.currentAttempt).toBe(1);
    expect(advance.progress.fundingLevel).toBe(5);
    expect(isCampaignMonthSetupComplete(advance)).toBe(false);
    expect(advance.progress.gameRecords).toHaveLength(2);
  });

  it('keeps funding at 5 when prologue result advances to january', () => {
    const missionCases: { expectedRating: PerformanceRating; missionResults: MissionResult[] }[] = [
      {
        expectedRating: 'success',
        missionResults: [{ missionId: 'm1', succeeded: true }, { missionId: 'm2', succeeded: true }]
      },
      {
        expectedRating: 'adequate',
        missionResults: [{ missionId: 'm1', succeeded: false }, { missionId: 'm2', succeeded: true }]
      }
    ];

    for (const testCase of missionCases) {
      const campaign = createInitialCampaign({
        campaignName: `Prologue ${testCase.expectedRating}`,
        language: 'ko',
        players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
      });

      const next = applyGameResult(campaign, {
        characters: [],
        missionResults: testCase.missionResults,
        now: `2026-05-09T00:00:00.000Z`
      });

      expect(next.progress.currentMonth).toBe('january');
      expect(next.progress.currentAttempt).toBe(1);
      expect(next.progress.fundingLevel).toBe(5);
      expect(next.progress.gameRecords[0]).toMatchObject({
        month: 'prologue',
        fundingLevel: 5,
        performanceRating: testCase.expectedRating
      });
    }

    const failedMissions = [{ missionId: 'm1', succeeded: false }, { missionId: 'm2', succeeded: false }];
    const campaign = createInitialCampaign({
      campaignName: 'Prologue failure',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });

    const retry = applyGameResult(campaign, { characters: [], missionResults: failedMissions, now: '2026-05-09T00:00:00.000Z' });
    const next = applyGameResult(retry, { characters: [], missionResults: failedMissions, now: '2026-05-10T00:00:00.000Z' });

    expect(retry.progress.currentMonth).toBe('prologue');
    expect(retry.progress.currentAttempt).toBe(2);
    expect(retry.progress.fundingLevel).toBe(5);
    expect(next.progress.currentMonth).toBe('january');
    expect(next.progress.currentAttempt).toBe(1);
    expect(next.progress.fundingLevel).toBe(5);
  });

  it('applies result-based funding changes after january', () => {
    const campaign = createInitialCampaign({
      campaignName: 'January funding',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const januaryCampaign = {
      ...campaign,
      currentMonth: 'january' as const,
      fundingLevel: 5,
      progress: {
        ...campaign.progress,
        currentMonth: 'january' as const,
        currentAttempt: 1,
        fundingLevel: 5
      }
    };

    const next = applyGameResult(januaryCampaign, {
      characters: [],
      missionResults: [{ missionId: 'm1', succeeded: true }, { missionId: 'm2', succeeded: true }],
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(next.progress.currentMonth).toBe('february');
    expect(next.progress.currentAttempt).toBe(1);
    expect(next.progress.fundingLevel).toBe(4);
    expect(next.progress.gameRecords[0]).toMatchObject({
      month: 'january',
      fundingLevel: 5,
      performanceRating: 'success'
    });
  });

  it('filters event card availability by month', () => {
    expect(getAvailableEventCardsForMonth(eventCards, 'prologue')).toHaveLength(5);
    expect(getAvailableEventCardsForMonth(eventCards, 'february')).toHaveLength(9);
  });

  it('defines February event card effect descriptions', () => {
    const februaryEventExpectations = [
      {
        id: 'event-dispatch-teams',
        ko: '모든 작전팀 말을 해당 말이 현재 위치한 도시에서 최대 3칸 떨어진 도시로 이동시킵니다.',
        en: 'Move every team pawn to a city up to 3 connections away from the city that pawn is currently in.'
      },
      {
        id: 'event-weekend-rendezvous',
        ko: '아무 캐릭터 말 하나 또는 여럿을 다른 캐릭터 말이 있는 도시 1곳으로 옮길 수 있습니다.',
        en: 'You may move one or more character pawns to one city containing another character pawn.'
      },
      {
        id: 'event-coded-message',
        ko: '플레이어 2명을 선택합니다. 그 둘이 각자 손에 든 플레이어 카드 1장씩을 골라 서로 교환합니다.',
        en: 'Choose 2 players. Each chooses 1 Player card from their hand, then they exchange those cards.'
      },
      {
        id: 'event-bureaucratic-trap',
        ko: '게임판에서 소련 비밀요원 말 1개 또는 2개를 제거합니다.',
        en: 'Remove 1 or 2 Soviet agent pawns from the board.'
      }
    ];

    for (const expectation of februaryEventExpectations) {
      const card = eventCards.find((eventCard) => eventCard.id === expectation.id);

      expect(card).toBeDefined();
      expect(card?.availability).toEqual({ fromMonth: 'february' });
      expect(card?.effect?.kind).toBe('informational');
      expect(card?.effect?.description.ko).toBe(expectation.ko);
      expect(card?.effect?.description.en).toBe(expectation.en);
      expect(card?.effect?.description.ko).not.toMatch(/카드에 적힌 효과/);
      expect(card?.effect?.description.en).not.toMatch(/Resolve this event card according to its card text/);
    }
  });

  it('stores hidden city setup defaults for prologue through february', () => {
    expect(getMonthSetupDefaults('prologue').defaultFundingLevel).toBe(5);
    expect(getMonthSetupDefaults('january').defaultFundingLevel).toBe(5);
    expect(getMonthSetupDefaults('prologue').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'europe' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('january').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'asia' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('february').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'africa' }, hiddenRemovedCount: 0, revealedRemovedCount: 3 },
      { enabled: true, filter: { type: 'region', value: 'north-america' }, hiddenRemovedCount: 1 }
    ]);
  });

  it('creates February decks with revealed Soviet test cards removed from the player deck', () => {
    const campaign = createInitialCampaign({
      campaignName: 'February revealed setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const februaryCampaign = {
      ...campaign,
      progress: { ...campaign.progress, currentMonth: 'february' as const, fundingLevel: 4 },
      currentMonth: 'february' as const,
      fundingLevel: 4
    };
    const selectedEventCardIds = eventCards.filter((card) => card.availability?.fromMonth !== 'march').slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards.filter((card) => !['khartoum', 'lagos', 'cairo'].includes(card.id)).slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign: februaryCampaign,
      players: februaryCampaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      unidentifiedTargetCitySelections: [
        { filter: { type: 'region', value: 'africa' }, hiddenRemovedCount: 0, revealedRemovedCardIds: ['khartoum', 'lagos', 'cairo'] },
        { filter: { type: 'region', value: 'north-america' }, hiddenRemovedCount: 1 }
      ],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    expect(decks.playerDeck.cardStates.khartoum.zone).toBe('player-removed');
    expect(decks.playerDeck.cardStates.lagos.zone).toBe('player-removed');
    expect(decks.playerDeck.cardStates.cairo.zone).toBe('player-removed');
    expect(decks.playerDeck.unidentifiedTargetCities?.[0].revealedRemovedCardIds).toEqual(['khartoum', 'lagos', 'cairo']);
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

  it('creates current-month player deck with selected funded events only', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Selected events',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const availableEventIds = eventCards.slice(0, 5).map((card) => card.id);
    const selectedEventCardIds = availableEventIds;
    const startingHands = [
      ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.slice(0, 4).map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign,
      players: campaign.players,
      startingHands,
      selectedEventCardIds,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    for (const cardId of selectedEventCardIds) {
      expect(decks.playerDeck.cardStates[cardId]).toBeDefined();
    }
    for (const assignment of startingHands) {
      expect(decks.playerDeck.cardStates[assignment.cardId]).toMatchObject({
        zone: 'player-hand',
        ownerPlayerId: assignment.playerId
      });
    }
  });

  it('creates current-month decks using an overridden setup funding level', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Funding override',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const selectedEventCardIds = eventCards.slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign,
      players: campaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    for (const cardId of selectedEventCardIds) {
      expect(decks.playerDeck.cardStates[cardId]).toBeDefined();
    }
  });

  it('rejects selected event cards that do not match overridden setup funding level', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Funding override mismatch',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });

    expect(() => createGameDecksForMonth({
      campaign,
      players: campaign.players,
      startingHands: cityCards.slice(0, 8).map((card, index) => ({ cardId: card.id, playerId: index < 4 ? 'p1' : 'p2' })),
      selectedEventCardIds: eventCards.slice(0, 5).map((card) => card.id),
      fundingLevel: 4,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    })).toThrow(/Expected 4 event card/);
  });

  it('rejects selected event cards that do not match funding count', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Funding mismatch',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const baseInput = {
      campaign,
      players: campaign.players,
      startingHands: cityCards.slice(0, 8).map((card, index) => ({ cardId: card.id, playerId: index < 4 ? 'p1' : 'p2' })),
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    };

    expect(() => createGameDecksForMonth({ ...baseInput, selectedEventCardIds: eventCards.slice(0, 4).map((card) => card.id) })).toThrow(/Expected 5 event card/);
    expect(() => createGameDecksForMonth({ ...baseInput, selectedEventCardIds: eventCards.slice(0, 6).map((card) => card.id) })).toThrow(/Expected 5 event card/);
  });

  it('rejects event cards unavailable for the current month', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Unavailable event',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const selectedEventCardIds = [
      'event-counterintelligence-team',
      'event-forecast',
      'event-in-the-shadows',
      'event-war-relics',
      'event-dispatch-teams'
    ];

    expect(() => createGameDecksForMonth({
      campaign,
      players: campaign.players,
      startingHands: cityCards.slice(0, 8).map((card, index) => ({ cardId: card.id, playerId: index < 4 ? 'p1' : 'p2' })),
      selectedEventCardIds,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    })).toThrow(/not available/);
  });

  it('rejects duplicate selected event cards', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Duplicate event',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });

    expect(() => createGameDecksForMonth({
      campaign,
      players: campaign.players,
      startingHands: cityCards.slice(0, 8).map((card, index) => ({ cardId: card.id, playerId: index < 4 ? 'p1' : 'p2' })),
      selectedEventCardIds: ['event-counterintelligence-team', 'event-counterintelligence-team', 'event-forecast', 'event-airlift', 'event-war-relics'],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    })).toThrow(/Duplicate/);
  });

  it('creates current-month player deck using the monthly player count', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Monthly player changes',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const monthlyPlayers = [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' },
      { id: 'p3', name: 'Player 3' }
    ];
    const startingHands = [
      ...cityCards.slice(0, 3).map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...eventCards.slice(0, 3).map((card) => ({ cardId: card.id, playerId: 'p2' })),
      ...cityCards.slice(3, 6).map((card) => ({ cardId: card.id, playerId: 'p3' }))
    ];

    const decks = createGameDecksForMonth({
      campaign,
      players: monthlyPlayers,
      startingHands,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    expect(decks.playerDeck.startingHand.requiredPerPlayer).toBe(3);
    expect(decks.playerDeck.startingHand.requiredTotal).toBe(9);
  });

  it('reports month setup incomplete until starting hands and initial threats are configured', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Setup gate',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });

    expect(isCampaignMonthSetupComplete(campaign)).toBe(false);

    const decks = createGameDecksForMonth({
      campaign,
      players: campaign.players,
      startingHands: [
        ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
        ...eventCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p2' }))
      ],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    expect(isCampaignMonthSetupComplete({ ...campaign, ...decks })).toBe(true);
  });
});