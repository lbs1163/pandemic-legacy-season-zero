import type { ThreatDeckState } from '../types/deck';

const nowIso = (now?: string) => now ?? new Date().toISOString();
export const THREAT_LEVELS = [2, 2, 2, 3, 3, 4] as const;

export function createInitialThreatDeckState(threatCardIds: string[], now?: string): ThreatDeckState {
  const timestamp = nowIso(now);
  return {
    totalInitialCount: threatCardIds.length,
    threatLevelIndex: 0,
    cardStates: Object.fromEntries(threatCardIds.map((cardId) => [
      cardId,
      { cardId, zone: 'threat-deck-unknown', updatedAt: timestamp }
    ])),
    discardCardIds: [],
    knownTopStacks: [],
    knownTopStackCardIds: [],
    gameEndAreaCardIds: [],
    removedCardIds: []
  };
}

function normalizeKnownTopStacks(state: ThreatDeckState): string[][] {
  if (state.knownTopStacks?.length) return state.knownTopStacks.filter((stack) => stack.length > 0);
  return state.knownTopStackCardIds.length ? [state.knownTopStackCardIds] : [];
}

function flattenKnownTopStacks(stacks: string[][]): string[] {
  return stacks.flat();
}

function withKnownTopStacks(state: ThreatDeckState, stacks: string[][]): ThreatDeckState {
  const normalizedStacks = stacks.filter((stack) => stack.length > 0).map((stack) => [...stack]);
  return {
    ...state,
    knownTopStacks: normalizedStacks,
    knownTopStackCardIds: flattenKnownTopStacks(normalizedStacks)
  };
}

export function getThreatLevel(state: ThreatDeckState): number {
  const index = Math.min(Math.max(state.threatLevelIndex ?? 0, 0), THREAT_LEVELS.length - 1);
  return THREAT_LEVELS[index];
}

export function increaseThreatLevel(state: ThreatDeckState): ThreatDeckState {
  return {
    ...state,
    threatLevelIndex: Math.min((state.threatLevelIndex ?? 0) + 1, THREAT_LEVELS.length - 1)
  };
}

export function recordInitialThreatSetup(state: ThreatDeckState, cardIds: string[]): ThreatDeckState {
  if (cardIds.length !== 9) throw new Error('Initial threat setup requires exactly 9 Threat cards.');
  const uniqueCardIds = new Set(cardIds);
  if (uniqueCardIds.size !== cardIds.length) throw new Error('Initial threat setup cannot contain duplicate Threat cards.');
  for (const cardId of cardIds) {
    assertThreatCardInUnknownDeck(state, cardId);
  }
  const now = nowIso();
  return {
    ...state,
    discardCardIds: [...state.discardCardIds, ...cardIds],
    cardStates: {
      ...state.cardStates,
      ...Object.fromEntries(cardIds.map((cardId) => [
        cardId,
        { cardId, zone: 'threat-discard' as const, updatedAt: now }
      ]))
    }
  };
}

function drawFromKnownTopStack(state: ThreatDeckState, cardId: string): ThreatDeckState {
  const knownTopStacks = normalizeKnownTopStacks(state);
  if (knownTopStacks.length > 0) {
    const [firstStack, ...remainingStacks] = knownTopStacks;
    if (!firstStack.includes(cardId)) {
      throw new Error(`Threat card is not in the current known top stack: ${cardId}`);
    }
    const firstStackRest = firstStack.filter((knownCardId) => knownCardId !== cardId);
    return withKnownTopStacks({
      ...state,
      cardStates: {
        ...state.cardStates,
        [cardId]: { cardId, zone: 'threat-discard', updatedAt: nowIso() }
      }
    }, firstStackRest.length ? [firstStackRest, ...remainingStacks] : remainingStacks);
  }
  return state;
}

function assertThreatCardInUnknownDeck(state: ThreatDeckState, cardId: string) {
  const existing = state.cardStates[cardId];
  if (!existing) throw new Error(`Unknown threat card: ${cardId}`);
  if (existing.zone !== 'threat-deck-unknown') throw new Error(`Threat card is not in the unknown deck: ${cardId}`);
}

export function recordThreatDraw(state: ThreatDeckState, cardId: string): ThreatDeckState {
  const knownTopStacks = normalizeKnownTopStacks(state);
  if (knownTopStacks.length > 0) {
    if (!knownTopStacks[0].includes(cardId)) {
      throw new Error(`Threat card must be in the current known top stack.`);
    }
    const drawn = drawFromKnownTopStack(state, cardId);
    return { ...drawn, discardCardIds: [...drawn.discardCardIds, cardId] };
  }
  assertThreatCardInUnknownDeck(state, cardId);
  return {
    ...state,
    discardCardIds: [...state.discardCardIds, cardId],
    cardStates: {
      ...state.cardStates,
      [cardId]: { cardId, zone: 'threat-discard', updatedAt: nowIso() }
    }
  };
}

export function recordThreatBottomDrawToDiscard(state: ThreatDeckState, cardId: string): ThreatDeckState {
  assertThreatCardInUnknownDeck(state, cardId);
  return {
    ...state,
    discardCardIds: [...state.discardCardIds, cardId],
    cardStates: {
      ...state.cardStates,
      [cardId]: { cardId, zone: 'threat-discard', updatedAt: nowIso() }
    }
  };
}

export function recordThreatBottomDrawToGameEndArea(state: ThreatDeckState, cardId: string): ThreatDeckState {
  assertThreatCardInUnknownDeck(state, cardId);
  return {
    ...state,
    gameEndAreaCardIds: [...state.gameEndAreaCardIds, cardId],
    cardStates: {
      ...state.cardStates,
      [cardId]: { cardId, zone: 'threat-game-end-area', updatedAt: nowIso() }
    }
  };
}

export function moveThreatCardToGameEndArea(state: ThreatDeckState, cardId: string): ThreatDeckState {
  const existing = state.cardStates[cardId];
  if (!existing) throw new Error(`Unknown threat card: ${cardId}`);

  const knownTopStacks = normalizeKnownTopStacks(state)
    .map((stack) => stack.filter((knownCardId) => knownCardId !== cardId))
    .filter((stack) => stack.length > 0);

  return withKnownTopStacks({
    ...state,
    discardCardIds: state.discardCardIds.filter((discardCardId) => discardCardId !== cardId),
    gameEndAreaCardIds: state.gameEndAreaCardIds.includes(cardId)
      ? state.gameEndAreaCardIds
      : [...state.gameEndAreaCardIds, cardId],
    removedCardIds: state.removedCardIds.filter((removedCardId) => removedCardId !== cardId),
    cardStates: {
      ...state.cardStates,
      [cardId]: { cardId, zone: 'threat-game-end-area', updatedAt: nowIso() }
    }
  }, knownTopStacks);
}

export function intensifyThreatDiscard(state: ThreatDeckState, orderedCardIds?: string[]): ThreatDeckState {
  const stack = orderedCardIds?.length ? orderedCardIds : [...state.discardCardIds];
  const discardSet = new Set(state.discardCardIds);
  for (const cardId of stack) {
    if (!discardSet.has(cardId)) throw new Error(`Cannot intensify non-discarded threat card: ${cardId}`);
  }
  const knownTopStacks = normalizeKnownTopStacks(state);
  return withKnownTopStacks({
    ...state,
    discardCardIds: [],
    cardStates: {
      ...state.cardStates,
      ...Object.fromEntries(stack.map((cardId, order) => [
        cardId,
        { cardId, zone: 'threat-top-stack-known' as const, order, updatedAt: nowIso() }
      ]))
    }
  }, [stack, ...knownTopStacks]);
}

export function resolveEscalationThreatEffects(
  state: ThreatDeckState,
  bottomThreatCardId: string,
  orderedCardIds?: string[]
): ThreatDeckState {
  const increased = increaseThreatLevel(state);
  const withBottomDraw = recordThreatBottomDrawToDiscard(increased, bottomThreatCardId);
  return intensifyThreatDiscard(withBottomDraw, orderedCardIds);
}

export function clearThreatGameEndArea(state: ThreatDeckState): ThreatDeckState {
  const now = nowIso();
  return {
    ...state,
    discardCardIds: [...state.discardCardIds, ...state.gameEndAreaCardIds],
    gameEndAreaCardIds: [],
    cardStates: {
      ...state.cardStates,
      ...Object.fromEntries(state.gameEndAreaCardIds.map((cardId) => [
        cardId,
        { cardId, zone: 'threat-discard' as const, updatedAt: now }
      ]))
    }
  };
}

export function getThreatDeckUnknownCount(state: ThreatDeckState): number {
  return Object.values(state.cardStates).filter((card) => card.zone === 'threat-deck-unknown').length;
}
