import type {
  UnidentifiedTargetCityFilter,
  UnidentifiedTargetCitySelection,
  PlayerCardDestination,
  PlayerCardZone,
  PlayerDeckPile,
  PlayerDeckState,
  StartingHandAssignment
} from '../types/deck';
import type { CityCard } from '../types/cards';

export interface PlayerDeckSetupConfig {
  playerCardIds: string[];
  playerCount: number;
  escalationCardIds: string[];
  now?: string;
}

const nowIso = (now?: string) => now ?? new Date().toISOString();

export function createInitialPlayerDeckState(config: PlayerDeckSetupConfig): PlayerDeckState {
  const pileCount = config.escalationCardIds.length;
  if (pileCount !== 5) throw new Error('MVP setup requires exactly 5 Escalation cards.');
  const requiredPerPlayer = startingHandSizeForPlayers(config.playerCount);
  const piles = buildPiles(config.playerCardIds.length, config.escalationCardIds);
  const timestamp = nowIso(config.now);

  return {
    totalInitialCount: config.playerCardIds.length + pileCount,
    drawCountPerTurn: 2,
    piles,
    cardStates: Object.fromEntries(
      [...config.playerCardIds, ...config.escalationCardIds].map((cardId) => [
        cardId,
        { cardId, zone: 'player-deck-unknown', updatedAt: timestamp }
      ])
    ),
    currentPileIndex: 0,
    startingHand: {
      requiredPerPlayer,
      requiredTotal: requiredPerPlayer * config.playerCount,
      configured: false
    },
    unidentifiedTargetCity: {
      configured: false,
      candidateCardIds: []
    }
  };
}

function startingHandSizeForPlayers(playerCount: number): number {
  if (playerCount <= 2) return 4;
  if (playerCount === 3) return 3;
  return 2;
}

function buildPiles(deckCardCountAfterHands: number, escalationCardIds: string[]): PlayerDeckPile[] {
  const pileCount = escalationCardIds.length;
  const basePileSize = Math.floor(deckCardCountAfterHands / pileCount);
  const remainder = deckCardCountAfterHands % pileCount;
  return escalationCardIds.map((escalationCardId, index) => {
    const cityEventCount = basePileSize + (index < remainder ? 1 : 0);
    return {
      id: `pile-${index + 1}`,
      initialUnknownCount: cityEventCount + 1,
      remainingUnknownCount: cityEventCount + 1,
      escalationCardId,
      escalationResolved: false
    };
  });
}

function getEscalationCardIds(state: PlayerDeckState): string[] {
  return state.piles.map((pile) => pile.escalationCardId).filter((cardId): cardId is string => Boolean(cardId));
}

function rebuildPilesForCurrentDeck(state: PlayerDeckState): PlayerDeckPile[] {
  const escalationCardIds = getEscalationCardIds(state);
  const nonEscalationDeckCount = Object.values(state.cardStates).filter(
    (cardState) => cardState.zone === 'player-deck-unknown' && !escalationCardIds.includes(cardState.cardId)
  ).length;
  return buildPiles(nonEscalationDeckCount, escalationCardIds);
}

function isEscalationCardId(state: PlayerDeckState, cardId: string): boolean {
  return getEscalationCardIds(state).includes(cardId);
}

function cityMatchesUnidentifiedTargetFilter(city: CityCard, filter: UnidentifiedTargetCityFilter): boolean {
  return filter.type === 'region' ? city.region === filter.value : city.affiliation === filter.value;
}

export function getUnidentifiedTargetCityCandidates(
  state: PlayerDeckState,
  cities: CityCard[],
  filter: UnidentifiedTargetCityFilter
): string[] {
  return cities
    .filter((city) => cityMatchesUnidentifiedTargetFilter(city, filter))
    .filter((city) => state.cardStates[city.id]?.zone === 'player-deck-unknown')
    .map((city) => city.id);
}

export function configureStartingHands(
  state: PlayerDeckState,
  assignments: StartingHandAssignment[]
): PlayerDeckState {
  if (assignments.length !== state.startingHand.requiredTotal) {
    throw new Error(`Starting hands require exactly ${state.startingHand.requiredTotal} cards.`);
  }
  const seen = new Set<string>();
  for (const assignment of assignments) {
    if (seen.has(assignment.cardId)) throw new Error(`Duplicate starting hand card: ${assignment.cardId}`);
    seen.add(assignment.cardId);
    const existing = state.cardStates[assignment.cardId];
    if (!existing) throw new Error(`Unknown player card: ${assignment.cardId}`);
    if (isEscalationCardId(state, assignment.cardId)) throw new Error('Escalation cards cannot be in starting hands.');
  }

  const now = nowIso();
  const escalationCardIds = getEscalationCardIds(state);
  const assignmentMap = new Map(assignments.map((assignment) => [assignment.cardId, assignment.playerId]));
  const cardStates = Object.fromEntries(Object.entries(state.cardStates).map(([cardId, cardState]) => {
    const ownerPlayerId = assignmentMap.get(cardId);
    if (ownerPlayerId) {
      return [cardId, { cardId, zone: 'player-hand' as const, ownerPlayerId, updatedAt: now }];
    }
    return [cardId, { ...cardState, zone: 'player-deck-unknown' as const, ownerPlayerId: undefined, updatedAt: now }];
  }));
  const nonEscalationDeckCount = Object.keys(state.cardStates).filter(
    (cardId) => !escalationCardIds.includes(cardId) && !assignmentMap.has(cardId)
  ).length;

  return {
    ...state,
    piles: buildPiles(nonEscalationDeckCount, escalationCardIds),
    cardStates,
    currentPileIndex: 0,
    startingHand: { ...state.startingHand, configured: true }
  };
}

export function prepareUnidentifiedTargetCity(
  state: PlayerDeckState,
  cities: CityCard[],
  selection: UnidentifiedTargetCitySelection
): PlayerDeckState {
  const candidates = getUnidentifiedTargetCityCandidates(state, cities, selection.filter);
  if (!candidates.includes(selection.removedCardId)) {
    throw new Error(`Removed city is not an unidentified target candidate: ${selection.removedCardId}`);
  }
  const now = nowIso();
  const cardStates = {
    ...state.cardStates,
    [selection.removedCardId]: { cardId: selection.removedCardId, zone: 'player-removed' as const, updatedAt: now }
  };
  const nextState = { ...state, cardStates };

  return {
    ...nextState,
    piles: rebuildPilesForCurrentDeck(nextState),
    currentPileIndex: 0,
    unidentifiedTargetCity: {
      configured: true,
      filter: selection.filter,
      candidateCardIds: candidates,
      removedCardId: selection.removedCardId
    }
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
  destination: PlayerCardDestination
): PlayerDeckState {
  const existing = state.cardStates[cardId];
  if (!existing) throw new Error(`Unknown player card: ${cardId}`);
  if (existing.zone !== 'player-deck-unknown') throw new Error(`Player card is not in the unknown deck: ${cardId}`);
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
  if (state.cardStates[escalationCardId]?.zone !== 'player-deck-unknown') {
    throw new Error(`Escalation card is not hidden in the player deck: ${escalationCardId}`);
  }
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

export function getPlayerCardsInZone(state: PlayerDeckState, zone: PlayerCardZone): string[] {
  return Object.values(state.cardStates).filter((card) => card.zone === zone).map((card) => card.cardId);
}
