import { describe, expect, it } from 'vitest';
import {
  clearThreatGameEndArea,
  createInitialThreatDeckState,
  intensifyThreatDiscard,
  recordThreatBottomDrawToDiscard,
  recordThreatBottomDrawToGameEndArea,
  recordThreatDraw
} from '../domain/threatDeck';

describe('threat deck domain', () => {
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

  it('intensifies discard into known top stack and clears discard', () => {
    const state = recordThreatDraw(recordThreatDraw(createInitialThreatDeckState(['a', 'b']), 'a'), 'b');
    const next = intensifyThreatDiscard(state, ['b', 'a']);

    expect(next.discardCardIds).toEqual([]);
    expect(next.knownTopStackCardIds).toEqual(['b', 'a']);
  });

  it('moves game end area cards to discard after game', () => {
    const state = recordThreatBottomDrawToGameEndArea(createInitialThreatDeckState(['threat-london']), 'threat-london');
    const next = clearThreatGameEndArea(state);

    expect(next.gameEndAreaCardIds).toEqual([]);
    expect(next.discardCardIds).toEqual(['threat-london']);
  });
});
