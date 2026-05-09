import { describe, expect, it } from 'vitest';
import {
  clearThreatGameEndArea,
  createInitialThreatDeckState,
  intensifyThreatDiscard,
  moveDiscardedThreatCardToGameEndArea,
  moveThreatCardToGameEndArea,
  recordInitialThreatSetup,
  recordThreatBottomDrawToDiscard,
  recordThreatBottomDrawToGameEndArea,
  recordThreatDraw
} from '../domain/threatDeck';

describe('threat deck domain', () => {
  it('records initial threat setup with exactly 9 revealed cards to discard', () => {
    const initialThreats = Array.from({ length: 12 }, (_, index) => `threat-${index + 1}`);
    const setupThreats = initialThreats.slice(0, 9);
    const state = createInitialThreatDeckState(initialThreats);
    const next = recordInitialThreatSetup(state, setupThreats);

    expect(next.discardCardIds).toEqual(setupThreats);
    expect(Object.values(next.cardStates).filter((card) => card.zone === 'threat-discard')).toHaveLength(9);
    expect(Object.values(next.cardStates).filter((card) => card.zone === 'threat-deck-unknown')).toHaveLength(3);
  });

  it('rejects invalid initial threat setup card counts and duplicates', () => {
    const state = createInitialThreatDeckState(Array.from({ length: 12 }, (_, index) => `threat-${index + 1}`));

    expect(() => recordInitialThreatSetup(state, Array.from({ length: 8 }, (_, index) => `threat-${index + 1}`))).toThrow(/exactly 9/);
    expect(() => recordInitialThreatSetup(state, ['threat-1', 'threat-1', ...Array.from({ length: 7 }, (_, index) => `threat-${index + 2}`)])).toThrow(/duplicate/);
  });

  it('records normal threat draws to discard', () => {
    const state = createInitialThreatDeckState(['threat-atlanta', ...Array.from({ length: 9 }, (_, index) => `threat-${index + 1}`)]);
    const next = recordThreatDraw(state, 'threat-atlanta');

    expect(Object.values(next.cardStates).filter((card) => card.zone === 'threat-deck-unknown')).toHaveLength(9);
    expect(next.discardCardIds).toEqual(['threat-atlanta']);
  });

  it('records escalation bottom draw to discard', () => {
    const state = createInitialThreatDeckState(['threat-paris', ...Array.from({ length: 9 }, (_, index) => `threat-${index + 1}`)]);
    const next = recordThreatBottomDrawToDiscard(state, 'threat-paris');

    expect(next.cardStates['threat-paris'].zone).toBe('threat-discard');
    expect(next.discardCardIds).toEqual(['threat-paris']);
  });

  it('records incident bottom draw to game end area', () => {
    const state = createInitialThreatDeckState(['threat-moscow', ...Array.from({ length: 9 }, (_, index) => `threat-${index + 1}`)]);
    const next = recordThreatBottomDrawToGameEndArea(state, 'threat-moscow');

    expect(next.cardStates['threat-moscow'].zone).toBe('threat-game-end-area');
    expect(next.gameEndAreaCardIds).toEqual(['threat-moscow']);
    expect(next.discardCardIds).toEqual([]);
  });

  it('moves any tracked threat card from discard to the game end area', () => {
    const state = recordThreatDraw(createInitialThreatDeckState(['threat-seoul', 'threat-tokyo']), 'threat-seoul');
    const next = moveThreatCardToGameEndArea(state, 'threat-seoul');

    expect(next.cardStates['threat-seoul'].zone).toBe('threat-game-end-area');
    expect(next.gameEndAreaCardIds).toEqual(['threat-seoul']);
    expect(next.discardCardIds).toEqual([]);
  });

  it('moves a discarded threat card to game end area via discard-only event helper', () => {
    const state = recordThreatDraw(createInitialThreatDeckState(['threat-seoul', 'threat-tokyo']), 'threat-seoul');
    const next = moveDiscardedThreatCardToGameEndArea(state, 'threat-seoul');

    expect(next.cardStates['threat-seoul'].zone).toBe('threat-game-end-area');
    expect(next.gameEndAreaCardIds).toEqual(['threat-seoul']);
    expect(next.discardCardIds).toEqual([]);
  });

  it('rejects non-discard threat cards via discard-only event helper', () => {
    const unknownState = createInitialThreatDeckState(['threat-lagos']);
    expect(() => moveDiscardedThreatCardToGameEndArea(unknownState, 'threat-lagos')).toThrow(/discard area/);

    const knownTopState = intensifyThreatDiscard(recordThreatDraw(createInitialThreatDeckState(['a', 'b']), 'a'));
    expect(() => moveDiscardedThreatCardToGameEndArea(knownTopState, 'a')).toThrow(/discard area/);

    const gameEndState = recordThreatBottomDrawToGameEndArea(createInitialThreatDeckState(['threat-london']), 'threat-london');
    expect(() => moveDiscardedThreatCardToGameEndArea(gameEndState, 'threat-london')).toThrow(/discard area/);
  });

  it('moves any tracked threat card from known top stacks to the game end area', () => {
    const state = {
      ...createInitialThreatDeckState(['a', 'b', 'c']),
      knownTopStacks: [['c', 'b'], ['a']],
      knownTopStackCardIds: ['c', 'b', 'a'],
      cardStates: {
        a: { cardId: 'a', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
        b: { cardId: 'b', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
        c: { cardId: 'c', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' }
      }
    };

    const next = moveThreatCardToGameEndArea(state, 'b');

    expect(next.cardStates.b.zone).toBe('threat-game-end-area');
    expect(next.gameEndAreaCardIds).toEqual(['b']);
    expect(next.knownTopStacks).toEqual([['c'], ['a']]);
    expect(next.knownTopStackCardIds).toEqual(['c', 'a']);
  });

  it('moves any tracked threat card from the unknown deck to the game end area', () => {
    const state = createInitialThreatDeckState(['threat-lagos']);
    const next = moveThreatCardToGameEndArea(state, 'threat-lagos');

    expect(next.cardStates['threat-lagos'].zone).toBe('threat-game-end-area');
    expect(next.gameEndAreaCardIds).toEqual(['threat-lagos']);
    expect(Object.values(next.cardStates).filter((card) => card.zone === 'threat-deck-unknown')).toHaveLength(0);
  });

  it('does not duplicate a threat card already in the game end area', () => {
    const state = recordThreatBottomDrawToGameEndArea(createInitialThreatDeckState(['threat-london']), 'threat-london');
    const next = moveThreatCardToGameEndArea(state, 'threat-london');

    expect(next.gameEndAreaCardIds).toEqual(['threat-london']);
  });

  it('intensifies discard into known top stack and clears discard', () => {
    const state = recordThreatDraw(recordThreatDraw(createInitialThreatDeckState(['a', 'b']), 'a'), 'b');
    const next = intensifyThreatDiscard(state, ['b', 'a']);

    expect(next.discardCardIds).toEqual([]);
    expect(next.knownTopStacks).toEqual([['b', 'a']]);
    expect(next.knownTopStackCardIds).toEqual(['b', 'a']);
  });

  it('keeps multiple known top stacks when intensifying before the previous stack is exhausted', () => {
    const firstStack = intensifyThreatDiscard(
      recordThreatDraw(recordThreatDraw(createInitialThreatDeckState(['a', 'b', 'c', 'd']), 'a'), 'b'),
      ['b', 'a']
    );
    const afterOneKnownDraw = recordThreatDraw(firstStack, 'b');
    const withNewDiscard = recordThreatBottomDrawToDiscard(recordThreatBottomDrawToDiscard(afterOneKnownDraw, 'c'), 'd');
    const next = intensifyThreatDiscard(withNewDiscard, ['d', 'c', 'b']);

    expect(next.knownTopStacks).toEqual([['d', 'c', 'b'], ['a']]);
    expect(next.knownTopStackCardIds).toEqual(['d', 'c', 'b', 'a']);
  });

  it('draws any card from the newest known top shuffled stack before older known stacks', () => {
    const state = {
      ...createInitialThreatDeckState(['a', 'b', 'c']),
      knownTopStacks: [['c', 'b'], ['a']],
      knownTopStackCardIds: ['c', 'b', 'a'],
      cardStates: {
        a: { cardId: 'a', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
        b: { cardId: 'b', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
        c: { cardId: 'c', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' }
      }
    };

    const afterB = recordThreatDraw(state, 'b');
    const afterC = recordThreatDraw(afterB, 'c');
    const afterA = recordThreatDraw(afterC, 'a');

    expect(afterB.knownTopStacks).toEqual([['c'], ['a']]);
    expect(afterC.knownTopStacks).toEqual([['a']]);
    expect(afterA.knownTopStacks).toEqual([]);
    expect(afterA.discardCardIds).toEqual(['b', 'c', 'a']);
  });

  it('rejects drawing from an older known top stack before the current shuffled stack is exhausted', () => {
    const state = {
      ...createInitialThreatDeckState(['a', 'b', 'c']),
      knownTopStacks: [['c', 'b'], ['a']],
      knownTopStackCardIds: ['c', 'b', 'a'],
      cardStates: {
        a: { cardId: 'a', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
        b: { cardId: 'b', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' },
        c: { cardId: 'c', zone: 'threat-top-stack-known' as const, updatedAt: '2026-01-01T00:00:00.000Z' }
      }
    };

    expect(() => recordThreatDraw(state, 'a')).toThrow(/current known top stack/);
  });

  it('moves game end area cards to discard after game', () => {
    const state = recordThreatBottomDrawToGameEndArea(createInitialThreatDeckState(['threat-london']), 'threat-london');
    const next = clearThreatGameEndArea(state);

    expect(next.gameEndAreaCardIds).toEqual([]);
    expect(next.discardCardIds).toEqual(['threat-london']);
  });
});
