import { describe, expect, it } from 'vitest';
import { calculateCurrentPileEscalationRisk, calculatePlayerDeckComposition } from '../domain/probabilities';
import {
  configureStartingHands,
  createInitialPlayerDeckState,
  getPlayerDeckRemaining,
  getUnidentifiedTargetCityCandidates,
  prepareUnidentifiedTargetCities,
  prepareSurveillanceSatellites,
  prepareUnidentifiedTargetCity,
  recordPlayerCardDraw,
  resolveEscalationDraw
} from '../domain/playerDeck';
import type { CityCard, EventCard } from '../types/cards';

const testCities: CityCard[] = [
  { id: 'asia-1', kind: 'city', name: { en: 'Asia 1', ko: '아시아 1' }, region: 'asia', affiliation: 'neutral' },
  { id: 'asia-2', kind: 'city', name: { en: 'Asia 2', ko: '아시아 2' }, region: 'asia', affiliation: 'soviet' },
  { id: 'europe-1', kind: 'city', name: { en: 'Europe 1', ko: '유럽 1' }, region: 'europe', affiliation: 'neutral' }
];

const testEvents: EventCard[] = [
  { id: 'event-1', kind: 'event', initialSet: true, name: { en: 'Event 1', ko: '이벤트 1' } },
  { id: 'event-2', kind: 'event', initialSet: true, name: { en: 'Event 2', ko: '이벤트 2' } }
];

describe('player deck domain', () => {
  it('creates five escalation piles and derives remaining count', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: Array.from({ length: 53 }, (_, index) => `card-${index + 1}`),
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
      now: '2026-01-01T00:00:00.000Z'
    });

    expect(state.piles).toHaveLength(5);
    expect(getPlayerDeckRemaining(state)).toBe(58);
    expect(state.piles.every((pile) => pile.escalationResolved === false)).toBe(true);
    expect(Object.keys(state.cardStates)).toHaveLength(58);
  });

  it('configures starting hands and rebuilds piles without those cards', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: Array.from({ length: 20 }, (_, index) => `card-${index + 1}`),
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const next = configureStartingHands(state, Array.from({ length: 8 }, (_, index) => ({
      cardId: `card-${index + 1}`,
      playerId: index < 4 ? 'p1' : 'p2'
    })));

    expect(next.startingHand.configured).toBe(true);
    expect(next.cardStates['card-1'].zone).toBe('player-hand');
    expect(next.cardStates['card-1'].ownerPlayerId).toBe('p1');
    expect(getPlayerDeckRemaining(next)).toBe(17);
  });

  it('records known player card draws and reduces current pile count', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: Array.from({ length: 20 }, (_, index) => `card-${index + 1}`),
      playerCount: 4,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    const next = recordPlayerCardDraw(state, 'card-1', 'player-hand');

    expect(next.cardStates['card-1'].zone).toBe('player-hand');
    expect(next.piles[0].remainingUnknownCount).toBe(state.piles[0].remainingUnknownCount - 1);
  });

  it('resolves escalation and reports zero risk for resolved pile', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: Array.from({ length: 20 }, (_, index) => `card-${index + 1}`),
      playerCount: 4,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    const next = resolveEscalationDraw(state, 'e1');

    expect(next.cardStates.e1.zone).toBe('player-drawn-escalation');
    expect(next.piles[0].escalationResolved).toBe(true);
    expect(calculateCurrentPileEscalationRisk(next)).toBe(0);
  });

  it('calculates next two-card draw escalation risk for unresolved pile', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: Array.from({ length: 20 }, (_, index) => `card-${index + 1}`),
      playerCount: 4,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    expect(calculateCurrentPileEscalationRisk(state)).toBeCloseTo(2 / state.piles[0].remainingUnknownCount);
  });

  it('lists remaining event card ids in player deck composition', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [...testCities.map((city) => city.id), ...testEvents.map((event) => event.id)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const next = recordPlayerCardDraw(state, 'event-1', 'player-hand');

    const composition = calculatePlayerDeckComposition(next, testCities, testEvents);

    expect(composition.remainingEvents).toBe(1);
    expect(composition.remainingEventCardIds).toEqual(['event-2']);
  });

  it('excludes starting hand cities from unidentified target candidates', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [...testCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const configured = configureStartingHands(state, [
      { cardId: 'asia-1', playerId: 'p1' },
      ...Array.from({ length: 7 }, (_, index) => ({ cardId: `event-${index + 1}`, playerId: index < 3 ? 'p1' : 'p2' }))
    ]);

    expect(getUnidentifiedTargetCityCandidates(configured, testCities, { type: 'region', value: 'asia' })).toEqual(['asia-2']);
  });

  it('supports exact city id unidentified target candidates', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [...testCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-city-id-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    const next = prepareUnidentifiedTargetCity(state, testCities, {
      filter: { type: 'city-ids', value: ['asia-1', 'europe-1'] },
      hiddenRemovedCount: 0,
      revealedRemovedCardIds: ['asia-1', 'europe-1']
    });

    expect(getUnidentifiedTargetCityCandidates(state, testCities, { type: 'city-ids', value: ['asia-1', 'europe-1'] })).toEqual(['asia-1', 'europe-1']);
    expect(next.unidentifiedTargetCity?.candidateCardIds).toEqual(['asia-1', 'europe-1']);
    expect(next.cardStates['asia-1'].zone).toBe('player-removed');
    expect(next.cardStates['europe-1'].zone).toBe('player-removed');
  });

  it('records a hidden unidentified target city removal without revealing which city', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [...testCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const configured = configureStartingHands(state, [
      { cardId: 'asia-1', playerId: 'p1' },
      ...Array.from({ length: 7 }, (_, index) => ({ cardId: `event-${index + 1}`, playerId: index < 3 ? 'p1' : 'p2' }))
    ]);
    const beforeRemaining = getPlayerDeckRemaining(configured);
    const next = prepareUnidentifiedTargetCity(configured, testCities, {
      filter: { type: 'affiliation', value: 'neutral' }
    });

    expect(next.cardStates['europe-1'].zone).toBe('player-deck-unknown');
    expect(next.unidentifiedTargetCity?.configured).toBe(true);
    expect(next.unidentifiedTargetCity?.removedCardId).toBeUndefined();
    expect(next.unidentifiedTargetCity?.hiddenRemovedCount).toBe(1);
    expect(getPlayerDeckRemaining(next)).toBe(beforeRemaining - 1);
    expect(next.piles).toHaveLength(5);
  });

  it('records multiple hidden unidentified target city removals without revealing which cities', () => {
    const africaCities: CityCard[] = Array.from({ length: 6 }, (_, index) => ({
      id: `africa-${index + 1}`,
      kind: 'city',
      name: { en: `Africa ${index + 1}`, ko: `아프리카 ${index + 1}` },
      region: 'africa',
      affiliation: 'neutral'
    }));
    const state = createInitialPlayerDeckState({
      playerCardIds: [...africaCities.map((city) => city.id), ...Array.from({ length: 12 }, (_, index) => `event-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const beforeRemaining = getPlayerDeckRemaining(state);

    const next = prepareUnidentifiedTargetCity(state, africaCities, {
      filter: { type: 'region', value: 'africa' },
      hiddenRemovedCount: 3
    });

    expect(next.unidentifiedTargetCity?.candidateCardIds).toHaveLength(6);
    expect(next.unidentifiedTargetCity?.hiddenRemovedCount).toBe(3);
    expect(getPlayerDeckRemaining(next)).toBe(beforeRemaining - 3);
  });

  it('records revealed removed target cities as removed cards and updates composition', () => {
    const africaCities: CityCard[] = Array.from({ length: 6 }, (_, index) => ({
      id: `africa-revealed-${index + 1}`,
      kind: 'city',
      name: { en: `Africa ${index + 1}`, ko: `아프리카 ${index + 1}` },
      region: 'africa',
      affiliation: index === 0 ? 'soviet' : 'neutral'
    }));
    const state = createInitialPlayerDeckState({
      playerCardIds: [...africaCities.map((city) => city.id), ...Array.from({ length: 12 }, (_, index) => `event-revealed-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const beforeRemaining = getPlayerDeckRemaining(state);

    const next = prepareUnidentifiedTargetCity(state, africaCities, {
      filter: { type: 'region', value: 'africa' },
      hiddenRemovedCount: 0,
      revealedRemovedCardIds: ['africa-revealed-1', 'africa-revealed-2', 'africa-revealed-3']
    });
    const composition = calculatePlayerDeckComposition(next, africaCities, []);

    expect(next.unidentifiedTargetCity?.hiddenRemovedCount).toBe(0);
    expect(next.unidentifiedTargetCity?.revealedRemovedCardIds).toEqual(['africa-revealed-1', 'africa-revealed-2', 'africa-revealed-3']);
    expect(next.cardStates['africa-revealed-1'].zone).toBe('player-removed');
    expect(next.cardStates['africa-revealed-2'].zone).toBe('player-removed');
    expect(next.cardStates['africa-revealed-3'].zone).toBe('player-removed');
    expect(getPlayerDeckRemaining(next)).toBe(beforeRemaining - 3);
    expect(composition.remainingByRegion.africa).toBe(3);
    expect(composition.removedCount).toBe(3);
  });

  it('preserves revealed removed cards when starting hands are configured afterward', () => {
    const africaCities: CityCard[] = Array.from({ length: 6 }, (_, index) => ({
      id: `africa-preserve-${index + 1}`,
      kind: 'city',
      name: { en: `Africa ${index + 1}`, ko: `아프리카 ${index + 1}` },
      region: 'africa',
      affiliation: 'neutral'
    }));
    const state = createInitialPlayerDeckState({
      playerCardIds: [...africaCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-preserve-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const prepared = prepareUnidentifiedTargetCity(state, africaCities, {
      filter: { type: 'region', value: 'africa' },
      hiddenRemovedCount: 0,
      revealedRemovedCardIds: ['africa-preserve-1', 'africa-preserve-2', 'africa-preserve-3']
    });

    const next = configureStartingHands(prepared, [
      ...africaCities.slice(3, 6).map((city, index) => ({ cardId: city.id, playerId: index < 2 ? 'p1' : 'p2' })),
      ...Array.from({ length: 5 }, (_, index) => ({ cardId: `event-preserve-${index + 1}`, playerId: index < 1 ? 'p1' : 'p2' }))
    ]);

    expect(next.cardStates['africa-preserve-1'].zone).toBe('player-removed');
    expect(getPlayerDeckRemaining(next)).toBe(10);
  });

  it('rejects starting hands that include revealed removed target cities', () => {
    const africaCities: CityCard[] = Array.from({ length: 6 }, (_, index) => ({
      id: `africa-reject-${index + 1}`,
      kind: 'city',
      name: { en: `Africa ${index + 1}`, ko: `아프리카 ${index + 1}` },
      region: 'africa',
      affiliation: 'neutral'
    }));
    const state = createInitialPlayerDeckState({
      playerCardIds: [...africaCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-reject-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const prepared = prepareUnidentifiedTargetCity(state, africaCities, {
      filter: { type: 'region', value: 'africa' },
      hiddenRemovedCount: 0,
      revealedRemovedCardIds: ['africa-reject-1', 'africa-reject-2', 'africa-reject-3']
    });

    expect(() => configureStartingHands(prepared, [
      ...africaCities.slice(0, 3).map((city, index) => ({ cardId: city.id, playerId: index < 2 ? 'p1' : 'p2' })),
      ...Array.from({ length: 5 }, (_, index) => ({ cardId: `event-reject-${index + 1}`, playerId: index < 1 ? 'p1' : 'p2' }))
    ])).toThrow(/Removed player cards/);
  });

  it('does not count revealed removed cards as candidates left for hidden removals', () => {
    const africaCities: CityCard[] = Array.from({ length: 4 }, (_, index) => ({
      id: `africa-mixed-${index + 1}`,
      kind: 'city',
      name: { en: `Africa ${index + 1}`, ko: `아프리카 ${index + 1}` },
      region: 'africa',
      affiliation: 'neutral'
    }));
    const state = createInitialPlayerDeckState({
      playerCardIds: [...africaCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-mixed-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const prepared = prepareUnidentifiedTargetCity(state, africaCities, {
      filter: { type: 'region', value: 'africa' },
      hiddenRemovedCount: 2,
      revealedRemovedCardIds: ['africa-mixed-1', 'africa-mixed-2']
    });

    expect(() => configureStartingHands(prepared, [
      { cardId: 'africa-mixed-3', playerId: 'p1' },
      ...Array.from({ length: 7 }, (_, index) => ({ cardId: `event-mixed-${index + 1}`, playerId: index < 3 ? 'p1' : 'p2' }))
    ])).toThrow(/at least 2 unidentified target city candidate/);
  });

  it('records multiple unidentified target city setups for the same game', () => {
    const northAmericaCities: CityCard[] = Array.from({ length: 4 }, (_, index) => ({
      id: `north-america-${index + 1}`,
      kind: 'city',
      name: { en: `North America ${index + 1}`, ko: `북미 ${index + 1}` },
      region: 'north-america',
      affiliation: 'allied'
    }));
    const africaCities: CityCard[] = Array.from({ length: 6 }, (_, index) => ({
      id: `africa-test-${index + 1}`,
      kind: 'city',
      name: { en: `Africa ${index + 1}`, ko: `아프리카 ${index + 1}` },
      region: 'africa',
      affiliation: 'neutral'
    }));
    const cities = [...northAmericaCities, ...africaCities];
    const state = createInitialPlayerDeckState({
      playerCardIds: [...cities.map((city) => city.id), ...Array.from({ length: 12 }, (_, index) => `event-multi-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const beforeRemaining = getPlayerDeckRemaining(state);

    const next = prepareUnidentifiedTargetCities(state, cities, [
      { filter: { type: 'region', value: 'africa' }, hiddenRemovedCount: 3 },
      { filter: { type: 'region', value: 'north-america' }, hiddenRemovedCount: 1 }
    ]);

    expect(next.unidentifiedTargetCities).toHaveLength(2);
    expect(next.unidentifiedTargetCities?.[0].candidateCardIds).toHaveLength(6);
    expect(next.unidentifiedTargetCities?.[1].candidateCardIds).toHaveLength(4);
    expect(getPlayerDeckRemaining(next)).toBe(beforeRemaining - 4);
  });

  it('adds surveillance satellites to piles from the rightmost pile first', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [
        ...Array.from({ length: 20 }, (_, index) => `card-${index + 1}`),
        'surveillance-satellite-europe',
        'surveillance-satellite-south-america',
        'surveillance-satellite-asia'
      ],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    const next = prepareSurveillanceSatellites(state, {
      candidateCardIds: [
        'surveillance-satellite-europe',
        'surveillance-satellite-south-america',
        'surveillance-satellite-asia'
      ]
    });

    expect(next.surveillanceSatelliteSetup).toMatchObject({
      configured: true,
      includedCardIds: [
        'surveillance-satellite-europe',
        'surveillance-satellite-south-america',
        'surveillance-satellite-asia'
      ],
      hiddenRemovedCount: 0
    });
    expect(next.piles.map((pile) => pile.initialUnknownCount)).toEqual([5, 5, 6, 6, 6]);
  });

  it('tracks one hidden returned surveillance satellite when all six are candidates', () => {
    const satelliteIds = [
      'surveillance-satellite-asia',
      'surveillance-satellite-south-america',
      'surveillance-satellite-pacific',
      'surveillance-satellite-africa',
      'surveillance-satellite-north-america',
      'surveillance-satellite-europe'
    ];
    const state = createInitialPlayerDeckState({
      playerCardIds: [...Array.from({ length: 20 }, (_, index) => `six-card-${index + 1}`), ...satelliteIds],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    const next = prepareSurveillanceSatellites(state, { candidateCardIds: satelliteIds });

    expect(next.surveillanceSatelliteSetup?.hiddenRemovedCount).toBe(1);
    expect(next.surveillanceSatelliteSetup?.includedCardIds).toHaveLength(5);
    expect(next.piles.map((pile) => pile.initialUnknownCount)).toEqual([6, 6, 6, 6, 5]);
  });

  it('rejects surveillance satellites in starting hands', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [
        ...Array.from({ length: 20 }, (_, index) => `satellite-hand-${index + 1}`),
        'surveillance-satellite-europe'
      ],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const prepared = prepareSurveillanceSatellites(state, {
      candidateCardIds: ['surveillance-satellite-europe']
    });

    expect(() => configureStartingHands(prepared, [
      { cardId: 'surveillance-satellite-europe', playerId: 'p1' },
      ...Array.from({ length: 7 }, (_, index) => ({ cardId: `satellite-hand-${index + 1}`, playerId: index < 3 ? 'p1' : 'p2' }))
    ])).toThrow(/Surveillance Satellite cards cannot be in starting hands/);
  });

  it('rejects unidentified target city hidden removal counts above available candidates', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [...testCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    expect(() => prepareUnidentifiedTargetCity(state, testCities, {
      filter: { type: 'region', value: 'asia' },
      hiddenRemovedCount: 3
    })).toThrow(/at least 3 candidate/);
  });

  it('preserves a hidden unidentified target city removal when starting hands are configured afterward', () => {
    const state = createInitialPlayerDeckState({
      playerCardIds: [...testCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const prepared = prepareUnidentifiedTargetCity(state, testCities, {
      filter: { type: 'region', value: 'asia' }
    });
    const next = configureStartingHands(prepared, [
      { cardId: 'asia-1', playerId: 'p1' },
      ...Array.from({ length: 7 }, (_, index) => ({ cardId: `event-${index + 1}`, playerId: index < 3 ? 'p1' : 'p2' }))
    ]);

    expect(next.unidentifiedTargetCity?.hiddenRemovedCount).toBe(1);
    expect(next.unidentifiedTargetCity?.candidateCardIds).toEqual(['asia-1', 'asia-2']);
    expect(getPlayerDeckRemaining(next)).toBe(9);
  });

  it('rejects starting hands that consume too many candidates for multiple hidden removals', () => {
    const africaCities: CityCard[] = Array.from({ length: 6 }, (_, index) => ({
      id: `africa-hand-${index + 1}`,
      kind: 'city',
      name: { en: `Africa ${index + 1}`, ko: `아프리카 ${index + 1}` },
      region: 'africa',
      affiliation: 'neutral'
    }));
    const state = createInitialPlayerDeckState({
      playerCardIds: [...africaCities.map((city) => city.id), ...Array.from({ length: 10 }, (_, index) => `event-hand-${index + 1}`)],
      playerCount: 2,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });
    const prepared = prepareUnidentifiedTargetCity(state, africaCities, {
      filter: { type: 'region', value: 'africa' },
      hiddenRemovedCount: 3
    });

    expect(() => configureStartingHands(prepared, [
      ...africaCities.slice(0, 4).map((city, index) => ({ cardId: city.id, playerId: index < 2 ? 'p1' : 'p2' })),
      ...Array.from({ length: 4 }, (_, index) => ({ cardId: `event-hand-${index + 1}`, playerId: index < 2 ? 'p1' : 'p2' }))
    ])).toThrow(/at least 3 unidentified target city candidate/);
  });
});
