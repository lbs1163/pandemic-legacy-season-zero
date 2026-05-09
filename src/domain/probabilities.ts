import type { CampaignState, DeckCounterSummary } from '../types/campaign';
import type { Affiliation, CityCard, EventCard, Region, ThreatCard } from '../types/cards';
import type { PlayerDeckState, ThreatDeckState } from '../types/deck';
import { getPlayerDeckRemaining } from './playerDeck';
import { getThreatDeckUnknownCount, getThreatLevel } from './threatDeck';

export interface DrawProbability {
  draw: number;
  probability: number;
}

export interface CityProbability {
  cityCardId: string;
  threatCardIds: string[];
  probs: DrawProbability[];
  atLeastOne: number;
}

export interface PlayerDeckComposition {
  remainingCities: number;
  remainingEvents: number;
  remainingByRegion: Record<Region, number>;
  remainingByAffiliation: Record<Affiliation, number>;
  handByPlayer: Record<string, string[]>;
  discardCount: number;
  removedCount: number;
}

const regions: Region[] = ['north-america', 'south-america', 'europe', 'africa', 'asia', 'pacific'];
const affiliations: Affiliation[] = ['allied', 'neutral', 'soviet'];

function emptyRegionCounts(): Record<Region, number> {
  return Object.fromEntries(regions.map((region) => [region, 0])) as Record<Region, number>;
}

function emptyAffiliationCounts(): Record<Affiliation, number> {
  return Object.fromEntries(affiliations.map((affiliation) => [affiliation, 0])) as Record<Affiliation, number>;
}

function combination(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - k + i)) / i;
  }
  return result;
}

function hypergeometric(total: number, target: number, drawsOfTarget: number, drawCount: number): number {
  if (drawCount < 0 || drawCount > total) return 0;
  const denominator = combination(total, drawCount);
  if (denominator === 0) return 0;
  return (combination(target, drawsOfTarget) * combination(total - target, drawCount - drawsOfTarget)) / denominator;
}

function mergeDrawDistributions(a: DrawProbability[], b: DrawProbability[]): DrawProbability[] {
  const merged = new Map<number, number>();
  for (const left of a.length ? a : [{ draw: 0, probability: 1 }]) {
    for (const right of b.length ? b : [{ draw: 0, probability: 1 }]) {
      const draw = left.draw + right.draw;
      merged.set(draw, (merged.get(draw) ?? 0) + left.probability * right.probability);
    }
  }
  return [...merged.entries()].sort(([aDraw], [bDraw]) => aDraw - bDraw).map(([draw, probability]) => ({ draw, probability }));
}

export function calculateCurrentPileEscalationRisk(state: CampaignState['playerDeck']): number {
  const pile = state.piles[state.currentPileIndex];
  if (!pile || pile.escalationResolved || pile.remainingUnknownCount <= 0) return 0;
  const draws = Math.min(state.drawCountPerTurn, pile.remainingUnknownCount);
  return draws / pile.remainingUnknownCount;
}

export function calculateDeckCounterSummary(campaign: CampaignState): DeckCounterSummary {
  const playerCardStates = Object.values(campaign.playerDeck.cardStates);
  return {
    playerDeckRemaining: getPlayerDeckRemaining(campaign.playerDeck),
    playerDeckDiscardCount: playerCardStates.filter((card) => card.zone === 'player-discard').length,
    unresolvedEscalations: campaign.playerDeck.piles.filter((pile) => !pile.escalationResolved).length,
    currentPileEscalationRisk: calculateCurrentPileEscalationRisk(campaign.playerDeck),
    threatDeckUnknownRemaining: getThreatDeckUnknownCount(campaign.threatDeck),
    threatDiscardCount: campaign.threatDeck.discardCardIds.length,
    threatKnownTopStackCount: campaign.threatDeck.knownTopStackCardIds.length,
    threatLevel: getThreatLevel(campaign.threatDeck),
    gameEndAreaCount: campaign.threatDeck.gameEndAreaCardIds.length
  };
}

export function calculateThreatCityProbabilities(
  state: ThreatDeckState,
  threatCards: ThreatCard[],
  drawCount: number
): CityProbability[] {
  const safeDrawCount = Math.max(1, Math.floor(drawCount));
  const threatMap = new Map(threatCards.map((card) => [card.id, card]));
  const allCityIds = [...new Set(threatCards.map((card) => card.cityCardId))];
  const knownDraws = state.knownTopStackCardIds.slice(0, safeDrawCount);
  const unknownDrawCount = Math.max(0, safeDrawCount - knownDraws.length);
  const unknownThreatIds = Object.values(state.cardStates)
    .filter((card) => card.zone === 'threat-deck-unknown')
    .map((card) => card.cardId);
  const unknownTotal = unknownThreatIds.length;

  return allCityIds.map((cityCardId) => {
    const cityThreatIds = threatCards.filter((card) => card.cityCardId === cityCardId).map((card) => card.id);
    const knownCount = knownDraws.filter((cardId) => threatMap.get(cardId)?.cityCardId === cityCardId).length;
    const unknownTargetCount = unknownThreatIds.filter((cardId) => threatMap.get(cardId)?.cityCardId === cityCardId).length;
    const unknownDistribution = Array.from({ length: unknownDrawCount + 1 }, (_, draw) => ({
      draw,
      probability: hypergeometric(unknownTotal, unknownTargetCount, draw, Math.min(unknownDrawCount, unknownTotal))
    }));
    const knownDistribution = [{ draw: knownCount, probability: 1 }];
    const probs = mergeDrawDistributions(knownDistribution, unknownDistribution)
      .filter((entry) => entry.draw <= safeDrawCount);
    const zero = probs.find((entry) => entry.draw === 0)?.probability ?? 0;
    return {
      cityCardId,
      threatCardIds: cityThreatIds,
      probs,
      atLeastOne: 1 - zero
    };
  });
}

export function calculatePlayerDeckComposition(
  state: PlayerDeckState,
  cityCards: CityCard[],
  eventCards: EventCard[]
): PlayerDeckComposition {
  const cityMap = new Map(cityCards.map((card) => [card.id, card]));
  const eventIds = new Set(eventCards.map((card) => card.id));
  const remainingByRegion = emptyRegionCounts();
  const remainingByAffiliation = emptyAffiliationCounts();
  const handByPlayer: Record<string, string[]> = {};
  let remainingCities = 0;
  let remainingEvents = 0;
  let discardCount = 0;
  let removedCount = 0;

  Object.values(state.cardStates).forEach((cardState) => {
    const city = cityMap.get(cardState.cardId);
    if (cardState.zone === 'player-deck-unknown') {
      if (city) {
        remainingCities += 1;
        remainingByRegion[city.region] += 1;
        remainingByAffiliation[city.affiliation] += 1;
      } else if (eventIds.has(cardState.cardId)) {
        remainingEvents += 1;
      }
    }
    if (cardState.zone === 'player-hand' && cardState.ownerPlayerId) {
      handByPlayer[cardState.ownerPlayerId] = [...(handByPlayer[cardState.ownerPlayerId] ?? []), cardState.cardId];
    }
    if (cardState.zone === 'player-discard') discardCount += 1;
    if (cardState.zone === 'player-removed') removedCount += 1;
  });

  const unidentifiedTargetCities = state.unidentifiedTargetCities ?? (state.unidentifiedTargetCity ? [state.unidentifiedTargetCity] : []);
  for (const unidentifiedTargetCity of unidentifiedTargetCities) {
    if (!unidentifiedTargetCity.configured || !unidentifiedTargetCity.filter || !unidentifiedTargetCity.hiddenRemovedCount) continue;
    const hiddenRemovedCount = unidentifiedTargetCity.hiddenRemovedCount;
    remainingCities = Math.max(0, remainingCities - hiddenRemovedCount);
    removedCount += hiddenRemovedCount;
    if (unidentifiedTargetCity.filter.type === 'region') {
      remainingByRegion[unidentifiedTargetCity.filter.value] = Math.max(0, remainingByRegion[unidentifiedTargetCity.filter.value] - hiddenRemovedCount);
    } else {
      remainingByAffiliation[unidentifiedTargetCity.filter.value] = Math.max(0, remainingByAffiliation[unidentifiedTargetCity.filter.value] - hiddenRemovedCount);
    }
  }

  return { remainingCities, remainingEvents, remainingByRegion, remainingByAffiliation, handByPlayer, discardCount, removedCount };
}
