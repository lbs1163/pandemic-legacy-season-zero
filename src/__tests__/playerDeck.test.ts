import { describe, expect, it } from 'vitest';
import { calculateCurrentPileEscalationRisk } from '../domain/probabilities';
import {
  configureStartingHands,
  createInitialPlayerDeckState,
  getPlayerDeckRemaining,
  recordPlayerCardDraw,
  resolveEscalationDraw
} from '../domain/playerDeck';

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
});
