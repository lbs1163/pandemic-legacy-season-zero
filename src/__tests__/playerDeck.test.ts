import { describe, expect, it } from 'vitest';
import { calculateCurrentPileEscalationRisk } from '../domain/probabilities';
import {
  createInitialPlayerDeckState,
  getPlayerDeckRemaining,
  recordPlayerCardDraw,
  resolveEscalationDraw
} from '../domain/playerDeck';

describe('player deck domain', () => {
  it('creates five escalation piles and derives remaining count', () => {
    const state = createInitialPlayerDeckState({
      playerCardCount: 53,
      startingHandCardCount: 8,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
      now: '2026-01-01T00:00:00.000Z'
    });

    expect(state.piles).toHaveLength(5);
    expect(getPlayerDeckRemaining(state)).toBe(50);
    expect(state.piles.every((pile) => pile.escalationResolved === false)).toBe(true);
  });

  it('records known player card draws and reduces current pile count', () => {
    const state = createInitialPlayerDeckState({
      playerCardCount: 20,
      startingHandCardCount: 0,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    const next = recordPlayerCardDraw(state, 'atlanta', 'player-hand');

    expect(next.cardStates.atlanta.zone).toBe('player-hand');
    expect(next.piles[0].remainingUnknownCount).toBe(state.piles[0].remainingUnknownCount - 1);
  });

  it('resolves escalation and reports zero risk for resolved pile', () => {
    const state = createInitialPlayerDeckState({
      playerCardCount: 20,
      startingHandCardCount: 0,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    const next = resolveEscalationDraw(state, 'e1');

    expect(next.cardStates.e1.zone).toBe('player-drawn-escalation');
    expect(next.piles[0].escalationResolved).toBe(true);
    expect(calculateCurrentPileEscalationRisk(next)).toBe(0);
  });

  it('calculates next two-card draw escalation risk for unresolved pile', () => {
    const state = createInitialPlayerDeckState({
      playerCardCount: 20,
      startingHandCardCount: 0,
      escalationCardIds: ['e1', 'e2', 'e3', 'e4', 'e5']
    });

    expect(calculateCurrentPileEscalationRisk(state)).toBeCloseTo(2 / state.piles[0].remainingUnknownCount);
  });
});
