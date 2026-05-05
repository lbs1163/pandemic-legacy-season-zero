import type { ThreatDeckState } from '../types/deck';

export function createInitialThreatDeckState(threatCardCount: number): ThreatDeckState {
  return {
    totalInitialCount: threatCardCount,
    unknownDrawPileCount: threatCardCount,
    discardCardIds: [],
    knownTopStackCardIds: [],
    gameEndAreaCardIds: [],
    removedCardIds: []
  };
}

function drawFromThreatDeck(state: ThreatDeckState): ThreatDeckState {
  if (state.knownTopStackCardIds.length > 0) {
    return { ...state, knownTopStackCardIds: state.knownTopStackCardIds.slice(1) };
  }
  return { ...state, unknownDrawPileCount: Math.max(0, state.unknownDrawPileCount - 1) };
}

export function recordThreatDraw(state: ThreatDeckState, cardId: string): ThreatDeckState {
  const drawn = drawFromThreatDeck(state);
  return { ...drawn, discardCardIds: [...drawn.discardCardIds, cardId] };
}

export function recordThreatBottomDrawToDiscard(state: ThreatDeckState, cardId: string): ThreatDeckState {
  return {
    ...state,
    unknownDrawPileCount: Math.max(0, state.unknownDrawPileCount - 1),
    discardCardIds: [...state.discardCardIds, cardId]
  };
}

export function recordThreatBottomDrawToGameEndArea(state: ThreatDeckState, cardId: string): ThreatDeckState {
  return {
    ...state,
    unknownDrawPileCount: Math.max(0, state.unknownDrawPileCount - 1),
    gameEndAreaCardIds: [...state.gameEndAreaCardIds, cardId]
  };
}

export function intensifyThreatDiscard(state: ThreatDeckState, orderedCardIds?: string[]): ThreatDeckState {
  const stack = orderedCardIds?.length ? orderedCardIds : [...state.discardCardIds];
  return {
    ...state,
    discardCardIds: [],
    knownTopStackCardIds: [...stack, ...state.knownTopStackCardIds]
  };
}

export function clearThreatGameEndArea(state: ThreatDeckState): ThreatDeckState {
  return {
    ...state,
    discardCardIds: [...state.discardCardIds, ...state.gameEndAreaCardIds],
    gameEndAreaCardIds: []
  };
}
