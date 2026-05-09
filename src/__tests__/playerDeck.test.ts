import { describe, expect, it } from 'vitest';
import { calculateCurrentPileEscalationRisk } from '../domain/probabilities';
import {
  configureStartingHands,
  createInitialPlayerDeckState,
  getPlayerDeckRemaining,
  getUnidentifiedTargetCityCandidates,
  prepareUnidentifiedTargetCities,
  prepareUnidentifiedTargetCity,
  recordPlayerCardDraw,
  resolveEscalationDraw
} from '../domain/playerDeck';
import type { CityCard } from '../types/cards';

const testCities: CityCard[] = [
  { id: 'asia-1', kind: 'city', name: { en: 'Asia 1', ko: '아시아 1' }, region: 'asia', affiliation: 'neutral' },
  { id: 'asia-2', kind: 'city', name: { en: 'Asia 2', ko: '아시아 2' }, region: 'asia', affiliation: 'soviet' },
  { id: 'europe-1', kind: 'city', name: { en: 'Europe 1', ko: '유럽 1' }, region: 'europe', affiliation: 'neutral' }
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
