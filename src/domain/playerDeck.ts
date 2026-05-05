import type { PlayerCardZone, PlayerDeckPile, PlayerDeckState } from '../types/deck';

export interface PlayerDeckSetupConfig {
  playerCardCount: number;
  startingHandCardCount: number;
  escalationCardIds: string[];
  now?: string;
}

const nowIso = (now?: string) => now ?? new Date().toISOString();

export function createInitialPlayerDeckState(config: PlayerDeckSetupConfig): PlayerDeckState {
  const pileCount = config.escalationCardIds.length;
  if (pileCount !== 5) throw new Error('MVP setup requires exactly 5 Escalation cards.');
  const remainingAfterHands = Math.max(0, config.playerCardCount - config.startingHandCardCount);
  const basePileSize = Math.floor(remainingAfterHands / pileCount);
  const remainder = remainingAfterHands % pileCount;
  const piles: PlayerDeckPile[] = config.escalationCardIds.map((escalationCardId, index) => ({
    id: `pile-${index + 1}`,
    initialUnknownCount: basePileSize + (index < remainder ? 1 : 0) + 1,
    remainingUnknownCount: basePileSize + (index < remainder ? 1 : 0) + 1,
    escalationCardId,
    escalationResolved: false
  }));

  return {
    totalInitialCount: remainingAfterHands + pileCount,
    drawCountPerTurn: 2,
    piles,
    cardStates: Object.fromEntries(
      config.escalationCardIds.map((cardId) => [
        cardId,
        { cardId, zone: 'player-deck-unknown', updatedAt: nowIso(config.now) }
      ])
    ),
    currentPileIndex: 0
  };
}

function updateCurrentPile(state: PlayerDeckState, updater: (pile: PlayerDeckPile) => PlayerDeckPile): PlayerDeckState {
  const piles = state.piles.map((pile, index) => (index === state.currentPileIndex ? updater(pile) : pile));
  return { ...state, piles };
}

function advancePastResolvedEmptyPiles(state: PlayerDeckState): PlayerDeckState {
  let currentPileIndex = state.currentPileIndex;
  while (
    currentPileIndex < state.piles.length - 1 &&
    state.piles[currentPileIndex].remainingUnknownCount <= 0 &&
    state.piles[currentPileIndex].escalationResolved
  ) {
    currentPileIndex += 1;
  }
  return { ...state, currentPileIndex };
}

export function recordPlayerCardDraw(
  state: PlayerDeckState,
  cardId: string,
  destination: 'player-hand' | 'player-discard' | 'player-removed'
): PlayerDeckState {
  const updated = updateCurrentPile(state, (pile) => ({
    ...pile,
    remainingUnknownCount: Math.max(0, pile.remainingUnknownCount - 1)
  }));
  return advancePastResolvedEmptyPiles({
    ...updated,
    cardStates: {
      ...updated.cardStates,
      [cardId]: { cardId, zone: destination, updatedAt: nowIso() }
    }
  });
}

export function resolveEscalationDraw(state: PlayerDeckState, escalationCardId: string): PlayerDeckState {
  const pileIndex = state.piles.findIndex((pile) => pile.escalationCardId === escalationCardId);
  if (pileIndex === -1) throw new Error(`Unknown Escalation card: ${escalationCardId}`);
  const piles = state.piles.map((pile, index) => index === pileIndex ? {
    ...pile,
    escalationResolved: true,
    remainingUnknownCount: Math.max(0, pile.remainingUnknownCount - 1)
  } : pile);
  return advancePastResolvedEmptyPiles({
    ...state,
    piles,
    currentPileIndex: Math.max(state.currentPileIndex, pileIndex),
    cardStates: {
      ...state.cardStates,
      [escalationCardId]: { cardId: escalationCardId, zone: 'player-drawn-escalation', updatedAt: nowIso() }
    }
  });
}

export function movePlayerCard(
  state: PlayerDeckState,
  cardId: string,
  zone: PlayerCardZone,
  ownerPlayerId?: string
): PlayerDeckState {
  return {
    ...state,
    cardStates: {
      ...state.cardStates,
      [cardId]: { cardId, zone, ownerPlayerId, updatedAt: nowIso() }
    }
  };
}

export function getPlayerDeckRemaining(state: PlayerDeckState): number {
  return state.piles.reduce((sum, pile) => sum + pile.remainingUnknownCount, 0);
}
