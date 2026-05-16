import { describe, expect, it } from 'vitest';
import { createInitialCampaign } from '../domain/createInitialCampaign';
import {
  applyGameResult,
  calculateNextCampaignFundingLevel,
  calculateNextFundingLevel,
  calculatePerformanceRating,
  clampFundingLevel,
  createGameDecksForMonth,
  getCampaignMonthSetupDefaults,
  getAvailableEventCardsForMonth,
  getDefaultAvailableEventCardsForCampaign,
  getDefaultSurveillanceSatelliteSelectionForMonth,
  getMonthSetupDefaults,
  isCampaignMonthSetupComplete
} from '../domain/campaignProgress';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import { surveillanceSatelliteCards } from '../data/cards/surveillanceSatellites';
import { getInfectionCardIdForCity, threatCards } from '../data/cards/threats';
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

  it('filters initial event card availability by static month only', () => {
    expect(getAvailableEventCardsForMonth(eventCards, 'prologue')).toHaveLength(5);
    expect(getAvailableEventCardsForMonth(eventCards, 'february')).toHaveLength(5);
    expect(getAvailableEventCardsForMonth(eventCards, 'march').map((card) => card.id)).not.toContain('event-diversion');
    expect(getAvailableEventCardsForMonth(eventCards, 'march').map((card) => card.id)).not.toContain('event-one-quiet-night');
    expect(getAvailableEventCardsForMonth(eventCards, 'april').map((card) => card.id)).not.toContain('event-one-quiet-night');
    expect(getAvailableEventCardsForMonth(eventCards, 'april').map((card) => card.id)).not.toContain('event-time-extension');
    expect(getAvailableEventCardsForMonth(eventCards, 'april').map((card) => card.id)).not.toContain('event-unauthorized-action');
    expect(getAvailableEventCardsForMonth(eventCards, 'may').map((card) => card.id)).not.toContain('event-time-extension');
    expect(getAvailableEventCardsForMonth(eventCards, 'may').map((card) => card.id)).not.toContain('event-unauthorized-action');
    expect(getAvailableEventCardsForMonth(eventCards, 'june').map((card) => card.id)).not.toContain('event-test-vaccine');
    expect(getAvailableEventCardsForMonth(eventCards, 'july').map((card) => card.id)).not.toContain('event-test-vaccine');
  });

  it('unlocks additional event cards only after their month has been played', () => {
    const campaign = createInitialCampaign({
      campaignName: 'Event unlocks',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const februaryFirstAttempt = {
      ...campaign,
      currentMonth: 'february' as const,
      progress: { ...campaign.progress, currentMonth: 'february' as const, fundingLevel: 4 }
    };
    const februaryRetry = {
      ...februaryFirstAttempt,
      progress: { ...februaryFirstAttempt.progress, currentAttempt: 2 }
    };
    const marchCampaign = {
      ...februaryFirstAttempt,
      currentMonth: 'march' as const,
      progress: {
        ...februaryFirstAttempt.progress,
        currentMonth: 'march' as const,
        currentAttempt: 1,
        gameRecords: [{
          id: 'february-record',
          month: 'february' as const,
          attempt: 1,
          fundingLevel: 4,
          players: februaryFirstAttempt.players,
          characters: [],
          missionResults: [],
          performanceRating: 'success' as const,
          createdAt: '2026-05-09T00:00:00.000Z',
          updatedAt: '2026-05-09T00:00:00.000Z'
        }]
      }
    };

    expect(getDefaultAvailableEventCardsForCampaign(februaryFirstAttempt).map((card) => card.id)).not.toContain('event-dispatch-teams');
    expect(getDefaultAvailableEventCardsForCampaign(februaryRetry).map((card) => card.id)).toEqual(expect.arrayContaining([
      'event-dispatch-teams',
      'event-weekend-rendezvous',
      'event-coded-message',
      'event-bureaucratic-trap'
    ]));
    expect(getDefaultAvailableEventCardsForCampaign(marchCampaign).map((card) => card.id)).toContain('event-dispatch-teams');
    expect(getDefaultAvailableEventCardsForCampaign(marchCampaign).map((card) => card.id)).not.toContain('event-diversion');
  });

  it('defines post-February, post-March, and post-April event card effect descriptions', () => {
    const diversion = eventCards.find((eventCard) => eventCard.id === 'event-diversion');
    const quietNight = eventCards.find((eventCard) => eventCard.id === 'event-one-quiet-night');
    const timeExtension = eventCards.find((eventCard) => eventCard.id === 'event-time-extension');
    const unauthorizedAction = eventCards.find((eventCard) => eventCard.id === 'event-unauthorized-action');
    const testVaccine = eventCards.find((eventCard) => eventCard.id === 'event-test-vaccine');
    const spectrumInterference = eventCards.find((eventCard) => eventCard.id === 'event-spectrum-interference');

    expect(diversion).toMatchObject({
      availability: { afterMonthPlayed: 'march' },
      effect: {
        kind: 'informational',
        description: {
          ko: '게임판에 있는 사건 토큰 최대 3개를 게임판의 도시 1곳으로 옮깁니다.',
          en: 'Move up to 3 incident tokens on the board to 1 city on the board.'
        }
      }
    });
    expect(quietNight).toMatchObject({
      availability: { afterMonthPlayed: 'april' },
      effect: {
        kind: 'skip-current-threat-draw-step',
        description: {
          ko: "이번 차례의 5번 '위협 카드 공개' 단계를 건너뜁니다.",
          en: "Skip step 5, 'Reveal Threat cards,' this turn."
        }
      }
    });
    expect(timeExtension).toMatchObject({
      availability: { afterMonthPlayed: 'may' },
      effect: {
        kind: 'informational',
        description: {
          ko: '공급처에서 행동 토큰 2개를 가져와 현재 차례를 진행 중인 플레이어에게 줍니다.',
          en: 'Take 2 action tokens from the supply and give them to the player currently taking their turn.'
        }
      }
    });
    expect(unauthorizedAction).toMatchObject({
      availability: { afterMonthPlayed: 'may' },
      effect: {
        kind: 'informational',
        description: {
          ko: '제약 카드 1장을 창고로 옮깁니다. 해당 제약 카드는 이번 게임에 더 이상 영향을 미치지 않습니다.',
          en: 'Move 1 restriction card to the depot. That restriction card has no further effect during this game.'
        }
      }
    });
    expect(testVaccine).toMatchObject({
      availability: { afterMonthPlayed: 'july' },
      effect: {
        kind: 'informational',
        description: {
          ko: '게임판에서 질병 큐브 2개를 제거합니다.',
          en: 'Remove 2 disease cubes from the board.'
        }
      }
    });
    expect(spectrumInterference).toMatchObject({
      availability: { afterMonthPlayed: 'july' },
      effect: {
        kind: 'informational',
        description: {
          ko: '현재 게임판 위에 놓인 감시위성 토큰 최대 2개를 창고에 되돌려 놓습니다.',
          en: 'Return up to 2 surveillance satellite tokens currently on the board to the depot.'
        }
      }
    });
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
      expect(card?.availability).toEqual({ afterMonthPlayed: 'february' });
      expect(card?.effect?.kind).toBe('informational');
      expect(card?.effect?.description.ko).toBe(expectation.ko);
      expect(card?.effect?.description.en).toBe(expectation.en);
      expect(card?.effect?.description.ko).not.toMatch(/카드에 적힌 효과/);
      expect(card?.effect?.description.en).not.toMatch(/Resolve this event card according to its card text/);
    }
  });

  it('stores hidden and revealed city setup defaults through June', () => {
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
    expect(getMonthSetupDefaults('april').missions.map((mission) => mission.id)).toEqual(['april-mission-1', 'april-mission-2']);
    expect(getMonthSetupDefaults('april').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'south-america' }, hiddenRemovedCount: 0, revealedRemovedCount: 3 },
      { enabled: true, filter: { type: 'region', value: 'europe' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('may').missions.map((mission) => mission.id)).toEqual(['may-mission-1', 'may-mission-2', 'may-mission-3']);
    expect(getMonthSetupDefaults('may').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'south-america' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('may').eventCardIdsAvailable).toEqual(expect.arrayContaining([
      'event-time-extension',
      'event-unauthorized-action'
    ]));
    expect(getMonthSetupDefaults('june').missions.map((mission) => mission.id)).toEqual(['june-mission-1', 'june-mission-2', 'june-mission-3']);
    expect(getMonthSetupDefaults('june').missions[1]).toMatchObject({
      name: { ko: '사빅의 안전가옥 잠입' },
      description: { ko: expect.stringContaining('멕시코시티') }
    });
    expect(getMonthSetupDefaults('june').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'europe' }, hiddenRemovedCount: 0, revealedRemovedCount: 4 },
      { enabled: true, filter: { type: 'region', value: 'asia' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('june').eventCardIdsAvailable).toEqual(expect.arrayContaining([
      'event-time-extension',
      'event-unauthorized-action'
    ]));
    expect(getMonthSetupDefaults('june').eventCardIdsAvailable).not.toContain('event-test-vaccine');
    expect(getMonthSetupDefaults('july').eventCardIdsAvailable).toEqual(expect.arrayContaining([
      'event-test-vaccine',
      'event-spectrum-interference'
    ]));
    expect(getMonthSetupDefaults('july').surveillanceSatelliteRegions).toEqual(['europe', 'south-america', 'asia']);
    expect(getMonthSetupDefaults('july').legacyCardIdsApplied).toContain('legacy-surveillance-satellite-cards');
    expect(getMonthSetupDefaults('august').missions.map((mission) => mission.id)).toEqual(['august-mission-1', 'august-mission-2', 'august-mission-3']);
    expect(getMonthSetupDefaults('august').missions[0]).toMatchObject({
      name: { ko: '소련 4차 시험 저지' },
      description: { ko: '아시아 내 시험 대상 도시 1~4곳에서 동시에 시험을 저지합니다.' }
    });
    expect(getMonthSetupDefaults('august').missions[1]).toMatchObject({
      name: { ko: '사빅의 작전본부 잠입' },
      description: { ko: '이 임무는 덱 카운터와 무관합니다.' }
    });
    expect(getMonthSetupDefaults('august').missions[2]).toMatchObject({
      name: { ko: '관제소 도청' },
      description: { ko: '북아메리카 내 미식별 도시 1곳에서 표적을 확보합니다.' }
    });
    expect(getMonthSetupDefaults('august').unidentifiedTargetCities).toMatchObject([
      { enabled: true, filter: { type: 'region', value: 'asia' }, hiddenRemovedCount: 0, revealedRemovedCount: 4 },
      { enabled: true, filter: { type: 'region', value: 'north-america' }, hiddenRemovedCount: 1 }
    ]);
    expect(getMonthSetupDefaults('august').surveillanceSatelliteRegions).toEqual(['europe', 'south-america', 'asia']);
    expect(getMonthSetupDefaults('december').eventCardIdsAvailable).toEqual(expect.arrayContaining([
      'event-test-vaccine',
      'event-spectrum-interference'
    ]));
    expect(getMonthSetupDefaults('december').surveillanceSatelliteRegions).toEqual(['europe', 'south-america', 'asia']);
  });

  it('creates July decks with default Surveillance Satellite cards in the rightmost piles', () => {
    const campaign = createInitialCampaign({
      campaignName: 'July satellites',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const julyCampaign = {
      ...campaign,
      currentMonth: 'july' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'july' as const,
        currentAttempt: 2,
        fundingLevel: 4
      }
    };
    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(julyCampaign).slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign: julyCampaign,
      players: julyCampaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    expect(getDefaultSurveillanceSatelliteSelectionForMonth('july')).toEqual({
      candidateCardIds: [
        'surveillance-satellite-europe',
        'surveillance-satellite-south-america',
        'surveillance-satellite-asia'
      ],
      hiddenRemovedCount: 0
    });
    expect(decks.playerDeck.surveillanceSatelliteSetup).toMatchObject({
      configured: true,
      candidateCardIds: [
        'surveillance-satellite-europe',
        'surveillance-satellite-south-america',
        'surveillance-satellite-asia'
      ],
      hiddenRemovedCount: 0
    });
    expect(decks.playerDeck.piles.map((pile) => pile.initialUnknownCount)).toEqual([10, 10, 11, 11, 10]);
    expect(decks.playerDeck.cardStates['surveillance-satellite-europe'].zone).toBe('player-deck-unknown');
    expect(surveillanceSatelliteCards.find((card) => card.id === 'surveillance-satellite-europe')?.name.ko).toBe('유럽 상공으로 감시위성 발사');
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
    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(februaryCampaign).slice(0, 4).map((card) => card.id);
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

  it('creates April decks with revealed second-test cards and hidden European target removed from the player deck', () => {
    const campaign = createInitialCampaign({
      campaignName: 'April revealed setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const aprilCampaign = {
      ...campaign,
      progress: { ...campaign.progress, currentMonth: 'april' as const, currentAttempt: 2, fundingLevel: 4 },
      currentMonth: 'april' as const,
      fundingLevel: 4
    };
    const revealedSouthAmericaCityIds = ['lima', 'santiago', 'sao-paulo'];
    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(aprilCampaign).slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards.filter((card) => !revealedSouthAmericaCityIds.includes(card.id) && card.region !== 'europe').slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign: aprilCampaign,
      players: aprilCampaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      unidentifiedTargetCitySelections: [
        { filter: { type: 'region', value: 'south-america' }, hiddenRemovedCount: 0, revealedRemovedCardIds: revealedSouthAmericaCityIds },
        { filter: { type: 'region', value: 'europe' }, hiddenRemovedCount: 1 }
      ],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    expect(decks.playerDeck.cardStates.lima.zone).toBe('player-removed');
    expect(decks.playerDeck.cardStates.santiago.zone).toBe('player-removed');
    expect(decks.playerDeck.cardStates['sao-paulo'].zone).toBe('player-removed');
    expect(decks.playerDeck.unidentifiedTargetCities?.[0].revealedRemovedCardIds).toEqual(revealedSouthAmericaCityIds);
    expect(decks.playerDeck.unidentifiedTargetCities?.[1]).toMatchObject({
      filter: { type: 'region', value: 'europe' },
      hiddenRemovedCount: 1
    });
  });

  it('creates May decks without removing Istanbul and Beijing for Sabik subordinate agents', () => {
    const campaign = createInitialCampaign({
      campaignName: 'May Sabik agents setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const mayCampaign = {
      ...campaign,
      progress: { ...campaign.progress, currentMonth: 'may' as const, currentAttempt: 2, fundingLevel: 4 },
      currentMonth: 'may' as const,
      fundingLevel: 4
    };
    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(mayCampaign).slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards
        .filter((card) => card.region !== 'south-america' && !['istanbul', 'beijing'].includes(card.id))
        .slice(0, 4)
        .map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign: mayCampaign,
      players: mayCampaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      unidentifiedTargetCitySelections: [
        { filter: { type: 'region', value: 'south-america' }, hiddenRemovedCount: 1 }
      ],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    expect(decks.playerDeck.cardStates.istanbul.zone).toBe('player-deck-unknown');
    expect(decks.playerDeck.cardStates.beijing.zone).toBe('player-deck-unknown');
    expect(decks.playerDeck.unidentifiedTargetCities).toHaveLength(1);
    expect(decks.playerDeck.unidentifiedTargetCities?.[0]).toMatchObject({
      filter: { type: 'region', value: 'south-america' },
      hiddenRemovedCount: 1,
      revealedRemovedCardIds: []
    });
  });

  it('creates June decks with revealed European third-test cards and hidden Asian target removed from the player deck', () => {
    const campaign = createInitialCampaign({
      campaignName: 'June revealed setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const juneCampaign = {
      ...campaign,
      progress: { ...campaign.progress, currentMonth: 'june' as const, currentAttempt: 2, fundingLevel: 4 },
      currentMonth: 'june' as const,
      fundingLevel: 4
    };
    const revealedEuropeCityIds = ['london', 'madrid', 'paris', 'rome'];
    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(juneCampaign).slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards
        .filter((card) => !revealedEuropeCityIds.includes(card.id) && card.region !== 'asia')
        .slice(0, 4)
        .map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign: juneCampaign,
      players: juneCampaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      unidentifiedTargetCitySelections: [
        { filter: { type: 'region', value: 'europe' }, hiddenRemovedCount: 0, revealedRemovedCardIds: revealedEuropeCityIds },
        { filter: { type: 'region', value: 'asia' }, hiddenRemovedCount: 1 }
      ],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    for (const cityId of revealedEuropeCityIds) {
      expect(decks.playerDeck.cardStates[cityId].zone).toBe('player-removed');
    }
    expect(decks.playerDeck.unidentifiedTargetCities?.[0].revealedRemovedCardIds).toEqual(revealedEuropeCityIds);
    expect(decks.playerDeck.unidentifiedTargetCities?.[1]).toMatchObject({
      filter: { type: 'region', value: 'asia' },
      hiddenRemovedCount: 1,
      revealedRemovedCardIds: []
    });
  });

  it('defines July missions with Warsaw, Madrid, and hidden Africa target setup', () => {
    const julyDefaults = getMonthSetupDefaults('july');

    expect(julyDefaults.missions).toHaveLength(3);
    expect(julyDefaults.missions.map((mission) => mission.id)).toEqual([
      'july-mission-1',
      'july-mission-2',
      'july-mission-3'
    ]);
    expect(julyDefaults.missions[0]).toMatchObject({
      name: { ko: '기밀을 빼돌리려는 망명자 저지' },
      description: { ko: '이 임무는 덱 카운터와 무관합니다.' }
    });
    expect(julyDefaults.missions[1]).toMatchObject({
      name: { ko: '소련 장교들에게 복수하려는 사빅 저지' },
      description: { ko: '바르샤바, 마드리드 2곳에서 동시에 표적을 확보합니다.' }
    });
    expect(julyDefaults.missions[2]).toMatchObject({
      name: { ko: '관제소 도청' },
      description: { ko: '아프리카 내 미식별 도시 1곳에서 표적을 확보합니다.' }
    });
    expect(julyDefaults.unidentifiedTargetCities).toMatchObject([
      {
        enabled: true,
        filter: { type: 'city-ids', value: ['warsaw', 'madrid'] },
        hiddenRemovedCount: 0,
        revealedRemovedCount: 2
      },
      {
        enabled: true,
        filter: { type: 'region', value: 'africa' },
        hiddenRemovedCount: 1
      }
    ]);
  });

  it('creates July decks with Warsaw, Madrid, and one hidden Africa target removed from the player deck', () => {
    const campaign = createInitialCampaign({
      campaignName: 'July target setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const julyCampaign = {
      ...campaign,
      progress: { ...campaign.progress, currentMonth: 'july' as const, currentAttempt: 2, fundingLevel: 4 },
      currentMonth: 'july' as const,
      fundingLevel: 4
    };
    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(julyCampaign).slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards
        .filter((card) => !['warsaw', 'madrid'].includes(card.id) && card.region !== 'africa')
        .slice(0, 4)
        .map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign: julyCampaign,
      players: julyCampaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      unidentifiedTargetCitySelections: [
        { filter: { type: 'city-ids', value: ['warsaw', 'madrid'] }, hiddenRemovedCount: 0, revealedRemovedCardIds: ['warsaw', 'madrid'] },
        { filter: { type: 'region', value: 'africa' }, hiddenRemovedCount: 1 }
      ],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    expect(decks.playerDeck.cardStates.warsaw.zone).toBe('player-removed');
    expect(decks.playerDeck.cardStates.madrid.zone).toBe('player-removed');
    expect(decks.playerDeck.unidentifiedTargetCities).toMatchObject([
      {
        filter: { type: 'city-ids', value: ['warsaw', 'madrid'] },
        hiddenRemovedCount: 0,
        revealedRemovedCardIds: ['warsaw', 'madrid']
      },
      {
        filter: { type: 'region', value: 'africa' },
        hiddenRemovedCount: 1,
        revealedRemovedCardIds: []
      }
    ]);
  });

  it('creates August decks with revealed Asian fourth-test cards and hidden North America target removed from the player deck', () => {
    const campaign = createInitialCampaign({
      campaignName: 'August target setup',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const augustCampaign = {
      ...campaign,
      progress: { ...campaign.progress, currentMonth: 'august' as const, currentAttempt: 1, fundingLevel: 4 },
      currentMonth: 'august' as const,
      fundingLevel: 4
    };
    const revealedAsiaCityIds = ['calcutta', 'delhi', 'hanoi', 'karachi'];
    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(augustCampaign).slice(0, 4).map((card) => card.id);
    const startingHands = [
      ...cityCards
        .filter((card) => !revealedAsiaCityIds.includes(card.id) && card.region !== 'north-america')
        .slice(0, 4)
        .map((card) => ({ cardId: card.id, playerId: 'p1' })),
      ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' }))
    ];

    const decks = createGameDecksForMonth({
      campaign: augustCampaign,
      players: augustCampaign.players,
      startingHands,
      selectedEventCardIds,
      fundingLevel: 4,
      unidentifiedTargetCitySelections: [
        { filter: { type: 'region', value: 'asia' }, hiddenRemovedCount: 0, revealedRemovedCardIds: revealedAsiaCityIds },
        { filter: { type: 'region', value: 'north-america' }, hiddenRemovedCount: 1 }
      ],
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id)
    });

    for (const cityId of revealedAsiaCityIds) {
      expect(decks.playerDeck.cardStates[cityId].zone).toBe('player-removed');
    }
    expect(decks.playerDeck.unidentifiedTargetCities).toMatchObject([
      {
        filter: { type: 'region', value: 'asia' },
        hiddenRemovedCount: 0,
        revealedRemovedCardIds: revealedAsiaCityIds
      },
      {
        filter: { type: 'region', value: 'north-america' },
        hiddenRemovedCount: 1,
        revealedRemovedCardIds: []
      }
    ]);
  });

  it('unlocks July event cards after a failed first July attempt and keeps them in August', () => {
    const campaign = createInitialCampaign({
      campaignName: 'July event unlocks',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const julyCampaign = {
      ...campaign,
      currentMonth: 'july' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'july' as const,
        currentAttempt: 1,
        fundingLevel: 4
      }
    };

    expect(getDefaultAvailableEventCardsForCampaign(julyCampaign).map((card) => card.id)).not.toContain('event-test-vaccine');
    expect(getDefaultAvailableEventCardsForCampaign(julyCampaign).map((card) => card.id)).not.toContain('event-spectrum-interference');

    const retry = applyGameResult(julyCampaign, {
      characters: [],
      missionResults: [
        { missionId: 'july-mission-1', succeeded: false },
        { missionId: 'july-mission-2', succeeded: false },
        { missionId: 'july-mission-3', succeeded: false }
      ],
      julyAfricaControlCenterCityId: 'cairo',
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(retry.progress.currentMonth).toBe('july');
    expect(retry.progress.currentAttempt).toBe(2);
    expect(getDefaultAvailableEventCardsForCampaign(retry).map((card) => card.id)).toEqual(expect.arrayContaining([
      'event-test-vaccine',
      'event-spectrum-interference'
    ]));
    expect(retry.playerDeck.cardStates['event-test-vaccine']).toBeDefined();
    expect(retry.playerDeck.cardStates['event-spectrum-interference']).toBeDefined();

    const august = applyGameResult(retry, {
      characters: [],
      missionResults: [
        { missionId: 'july-mission-1', succeeded: true },
        { missionId: 'july-mission-2', succeeded: true },
        { missionId: 'july-mission-3a', succeeded: true }
      ],
      now: '2026-05-10T00:00:00.000Z'
    });

    expect(august.progress.currentMonth).toBe('august');
    expect(getDefaultAvailableEventCardsForCampaign(august).map((card) => card.id)).toEqual(expect.arrayContaining([
      'event-test-vaccine',
      'event-spectrum-interference'
    ]));
  });

  it('records the hidden Africa control center city after a failed first July attempt', () => {
    const campaign = createInitialCampaign({
      campaignName: 'July retry control center',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const julyCampaign = {
      ...campaign,
      currentMonth: 'july' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'july' as const,
        currentAttempt: 1,
        fundingLevel: 4
      }
    };

    const retry = applyGameResult(julyCampaign, {
      characters: [],
      missionResults: [
        { missionId: 'july-mission-1', succeeded: false },
        { missionId: 'july-mission-2', succeeded: false },
        { missionId: 'july-mission-3', succeeded: false }
      ],
      julyAfricaControlCenterCityId: 'cairo',
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(retry.progress.currentMonth).toBe('july');
    expect(retry.progress.currentAttempt).toBe(2);
    expect(retry.progress.julyAfricaControlCenterCityId).toBe('cairo');
    expect(getCampaignMonthSetupDefaults(retry).missions.map((mission) => mission.id)).toEqual([
      'july-mission-1',
      'july-mission-2',
      'july-mission-3a'
    ]);
    expect(getCampaignMonthSetupDefaults(retry).missions[2]).toMatchObject({
      name: { ko: '완공된 아프리카 관제소 도청' },
      description: { ko: '아프리카 내 관제소가 있는 도시에서 표적 확보' }
    });
  });

  it('requires an Africa control center city after a failed first July attempt', () => {
    const campaign = createInitialCampaign({
      campaignName: 'July retry validation',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const julyCampaign = {
      ...campaign,
      currentMonth: 'july' as const,
      progress: {
        ...campaign.progress,
        currentMonth: 'july' as const,
        currentAttempt: 1
      }
    };
    const failedMissions = [
      { missionId: 'july-mission-1', succeeded: false },
      { missionId: 'july-mission-2', succeeded: false },
      { missionId: 'july-mission-3', succeeded: false }
    ];

    expect(() => applyGameResult(julyCampaign, {
      characters: [],
      missionResults: failedMissions,
      now: '2026-05-09T00:00:00.000Z'
    })).toThrow(/requires the Africa control center city/);

    expect(() => applyGameResult(julyCampaign, {
      characters: [],
      missionResults: failedMissions,
      julyAfricaControlCenterCityId: 'istanbul',
      now: '2026-05-09T00:00:00.000Z'
    })).toThrow(/must be an Africa city/);
  });

  it('records the hidden South America control center city after a failed first May attempt', () => {
    const campaign = createInitialCampaign({
      campaignName: 'May retry control center',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const mayCampaign = {
      ...campaign,
      currentMonth: 'may' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'may' as const,
        currentAttempt: 1,
        fundingLevel: 4
      }
    };

    const retry = applyGameResult(mayCampaign, {
      characters: [],
      missionResults: [
        { missionId: 'may-mission-1', succeeded: false },
        { missionId: 'may-mission-2', succeeded: false },
        { missionId: 'may-mission-3', succeeded: false }
      ],
      maySouthAmericaControlCenterCityId: 'bogota',
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(retry.progress.currentMonth).toBe('may');
    expect(retry.progress.currentAttempt).toBe(2);
    expect(retry.progress.maySouthAmericaControlCenterCityId).toBe('bogota');
    expect(getCampaignMonthSetupDefaults(retry).missions.map((mission) => mission.id)).toEqual([
      'may-mission-1',
      'may-mission-2',
      'may-mission-3a'
    ]);
    expect(getCampaignMonthSetupDefaults(retry).missions[2]).toMatchObject({
      name: { ko: '완공된 남아메리카 관제소 도청' },
      description: { ko: '남아메리카 관제소가 있는 도시에서 표적 확보 행동을 수행합니다.' }
    });
  });

  it('requires a South America control center city after a failed first May attempt', () => {
    const campaign = createInitialCampaign({
      campaignName: 'May retry validation',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const mayCampaign = {
      ...campaign,
      currentMonth: 'may' as const,
      progress: {
        ...campaign.progress,
        currentMonth: 'may' as const,
        currentAttempt: 1
      }
    };
    const failedMissions = [
      { missionId: 'may-mission-1', succeeded: false },
      { missionId: 'may-mission-2', succeeded: false },
      { missionId: 'may-mission-3', succeeded: false }
    ];

    expect(() => applyGameResult(mayCampaign, {
      characters: [],
      missionResults: failedMissions,
      now: '2026-05-09T00:00:00.000Z'
    })).toThrow(/requires the South America control center city/);

    expect(() => applyGameResult(mayCampaign, {
      characters: [],
      missionResults: failedMissions,
      maySouthAmericaControlCenterCityId: 'istanbul',
      now: '2026-05-09T00:00:00.000Z'
    })).toThrow(/must be a South America city/);
  });

  it('adds infection cards for failed February first-test cities and starts them in threat discard next setup', () => {
    const campaign = createInitialCampaign({
      campaignName: 'February infections',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const februaryCampaign = {
      ...campaign,
      currentMonth: 'february' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'february' as const,
        fundingLevel: 4
      },
      playerDeck: {
        ...campaign.playerDeck,
        unidentifiedTargetCities: [{
          configured: true,
          filter: { type: 'region' as const, value: 'africa' as const },
          candidateCardIds: ['khartoum', 'lagos', 'cairo'],
          hiddenRemovedCount: 0,
          revealedRemovedCardIds: ['khartoum', 'lagos', 'cairo']
        }]
      }
    };

    const next = applyGameResult(februaryCampaign, {
      characters: [],
      missionResults: [
        {
          missionId: 'february-mission-1',
          succeeded: false,
          cityResults: [
            { cityCardId: 'khartoum', succeeded: true },
            { cityCardId: 'lagos', succeeded: false },
            { cityCardId: 'cairo', succeeded: false }
          ]
        },
        { missionId: 'february-mission-2', succeeded: true }
      ],
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(next.progress.infectionCardIds).toEqual([
      getInfectionCardIdForCity('lagos'),
      getInfectionCardIdForCity('cairo')
    ]);

    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(next).slice(0, 5).map((card) => card.id);
    const decks = createGameDecksForMonth({
      campaign: next,
      players: next.players,
      startingHands: [
        ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
        ...selectedEventCardIds.slice(0, 4).map((cardId) => ({ cardId, playerId: 'p2' }))
      ],
      selectedEventCardIds,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id),
      now: '2026-05-10T00:00:00.000Z'
    });

    expect(decks.threatDeck.discardCardIds).toEqual([
      ...threatCards.slice(0, 9).map((card) => card.id),
      'infection-lagos',
      'infection-cairo'
    ]);
    expect(decks.threatDeck.cardStates['infection-lagos'].zone).toBe('threat-discard');
    expect(decks.threatDeck.cardStates['infection-cairo'].zone).toBe('threat-discard');
  });

  it('adds infection cards for failed April second-test cities and starts them in threat discard next setup', () => {
    const campaign = createInitialCampaign({
      campaignName: 'April infections',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const aprilCampaign = {
      ...campaign,
      currentMonth: 'april' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'april' as const,
        fundingLevel: 4
      },
      playerDeck: {
        ...campaign.playerDeck,
        unidentifiedTargetCities: [{
          configured: true,
          filter: { type: 'region' as const, value: 'south-america' as const },
          candidateCardIds: ['lima', 'santiago', 'sao-paulo'],
          hiddenRemovedCount: 0,
          revealedRemovedCardIds: ['lima', 'santiago', 'sao-paulo']
        }]
      }
    };

    const next = applyGameResult(aprilCampaign, {
      characters: [],
      missionResults: [
        {
          missionId: 'april-mission-1',
          succeeded: true,
          cityResults: [
            { cityCardId: 'lima', succeeded: true },
            { cityCardId: 'santiago', succeeded: false },
            { cityCardId: 'sao-paulo', succeeded: false }
          ]
        },
        { missionId: 'april-mission-2', succeeded: true }
      ],
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(next.progress.currentMonth).toBe('may');
    expect(next.progress.infectionCardIds).toEqual([
      getInfectionCardIdForCity('santiago'),
      getInfectionCardIdForCity('sao-paulo')
    ]);

    const selectedEventCardIds = getDefaultAvailableEventCardsForCampaign(next).slice(0, 3).map((card) => card.id);
    const decks = createGameDecksForMonth({
      campaign: next,
      players: next.players,
      startingHands: [
        ...cityCards.slice(0, 4).map((card) => ({ cardId: card.id, playerId: 'p1' })),
        ...selectedEventCardIds.map((cardId) => ({ cardId, playerId: 'p2' })),
        { cardId: cityCards[4].id, playerId: 'p2' }
      ],
      selectedEventCardIds,
      initialThreatCardIds: threatCards.slice(0, 9).map((card) => card.id),
      now: '2026-05-10T00:00:00.000Z'
    });

    expect(decks.threatDeck.discardCardIds).toEqual([
      ...threatCards.slice(0, 9).map((card) => card.id),
      'infection-santiago',
      'infection-sao-paulo'
    ]);
    expect(decks.threatDeck.cardStates['infection-santiago'].zone).toBe('threat-discard');
    expect(decks.threatDeck.cardStates['infection-sao-paulo'].zone).toBe('threat-discard');
  });

  it('adds infection cards for failed June third-test cities', () => {
    const campaign = createInitialCampaign({
      campaignName: 'June infections',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const juneCampaign = {
      ...campaign,
      currentMonth: 'june' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'june' as const,
        fundingLevel: 4
      },
      playerDeck: {
        ...campaign.playerDeck,
        unidentifiedTargetCities: [{
          configured: true,
          filter: { type: 'region' as const, value: 'europe' as const },
          candidateCardIds: ['london', 'madrid', 'paris', 'rome'],
          hiddenRemovedCount: 0,
          revealedRemovedCardIds: ['london', 'madrid', 'paris', 'rome']
        }]
      }
    };

    const next = applyGameResult(juneCampaign, {
      characters: [],
      missionResults: [
        {
          missionId: 'june-mission-1',
          succeeded: true,
          cityResults: [
            { cityCardId: 'london', succeeded: true },
            { cityCardId: 'madrid', succeeded: false },
            { cityCardId: 'paris', succeeded: true },
            { cityCardId: 'rome', succeeded: false }
          ]
        },
        { missionId: 'june-mission-2', succeeded: true },
        { missionId: 'june-mission-3', succeeded: true }
      ],
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(next.progress.currentMonth).toBe('july');
    expect(next.progress.infectionCardIds).toEqual([
      getInfectionCardIdForCity('madrid'),
      getInfectionCardIdForCity('rome')
    ]);
  });

  it('adds infection cards for failed August fourth-test cities', () => {
    const campaign = createInitialCampaign({
      campaignName: 'August infections',
      language: 'ko',
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    const augustCampaign = {
      ...campaign,
      currentMonth: 'august' as const,
      fundingLevel: 4,
      progress: {
        ...campaign.progress,
        currentMonth: 'august' as const,
        fundingLevel: 4
      },
      playerDeck: {
        ...campaign.playerDeck,
        unidentifiedTargetCities: [{
          configured: true,
          filter: { type: 'region' as const, value: 'asia' as const },
          candidateCardIds: ['calcutta', 'delhi', 'hanoi', 'karachi'],
          hiddenRemovedCount: 0,
          revealedRemovedCardIds: ['calcutta', 'delhi', 'hanoi', 'karachi']
        }]
      }
    };

    const next = applyGameResult(augustCampaign, {
      characters: [],
      missionResults: [
        {
          missionId: 'august-mission-1',
          succeeded: true,
          cityResults: [
            { cityCardId: 'calcutta', succeeded: true },
            { cityCardId: 'delhi', succeeded: false },
            { cityCardId: 'hanoi', succeeded: true },
            { cityCardId: 'karachi', succeeded: false }
          ]
        },
        { missionId: 'august-mission-2', succeeded: true },
        { missionId: 'august-mission-3', succeeded: true }
      ],
      now: '2026-05-09T00:00:00.000Z'
    });

    expect(next.progress.currentMonth).toBe('september');
    expect(next.progress.infectionCardIds).toEqual([
      getInfectionCardIdForCity('delhi'),
      getInfectionCardIdForCity('karachi')
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