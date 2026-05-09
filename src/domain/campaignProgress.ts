import { eventCards } from '../data/cards/events';
import { escalationCards } from '../data/cards/escalations';
import { threatCards } from '../data/cards/threats';
import { cityCards } from '../data/cards/cities';
import { campaignMonths, monthSetupDefaults } from '../data/campaign/months';
import type { EventCard } from '../types/cards';
import type {
  CampaignMonthId,
  CampaignState,
  CharacterProfile,
  MissionResult,
  PerformanceRating,
  PlayerProfile
} from '../types/campaign';
import type { StartingHandAssignment, UnidentifiedTargetCitySelection } from '../types/deck';
import type { MonthSetupDefaults } from '../types/campaignSetup';
import { createInitialPlayerDeckState, configureStartingHands, prepareUnidentifiedTargetCities } from './playerDeck';
import { createInitialThreatDeckState, recordInitialThreatSetup } from './threatDeck';

const secretFile14Warning = 'Funding would exceed 10. Secret File 14 may be required, but this app does not reveal or implement it yet.';

export const initialCampaignFundingLevel = 5;

export function clampFundingLevel(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(10, Math.max(1, Math.trunc(value)));
}

export function calculatePerformanceRating(missionResults: MissionResult[]): PerformanceRating {
  const failedCount = missionResults.filter((result) => !result.succeeded).length;
  if (failedCount === 0) return 'success';
  if (failedCount === 1) return 'adequate';
  return 'failure';
}

export function calculateNextFundingLevel(
  currentFunding: number,
  rating: PerformanceRating
): { fundingLevel: number; secretFile14Required: boolean; rawFundingLevel: number } {
  const delta = rating === 'success' ? -1 : rating === 'adequate' ? 1 : 2;
  const rawFundingLevel = clampFundingLevel(currentFunding) + delta;
  return {
    rawFundingLevel,
    fundingLevel: clampFundingLevel(rawFundingLevel),
    secretFile14Required: rawFundingLevel > 10
  };
}

export function calculateNextCampaignFundingLevel(
  currentMonth: CampaignMonthId,
  currentFunding: number,
  rating: PerformanceRating
): { fundingLevel: number; secretFile14Required: boolean; rawFundingLevel: number } {
  if (currentMonth === 'prologue') {
    return {
      rawFundingLevel: initialCampaignFundingLevel,
      fundingLevel: initialCampaignFundingLevel,
      secretFile14Required: false
    };
  }

  return calculateNextFundingLevel(currentFunding, rating);
}

export function getNextCampaignMonth(month: CampaignMonthId): CampaignMonthId | undefined {
  const index = campaignMonths.indexOf(month);
  return index >= 0 ? campaignMonths[index + 1] : undefined;
}

export function getMonthSetupDefaults(month: CampaignMonthId): MonthSetupDefaults {
  return monthSetupDefaults[month];
}

export function getAvailableEventCardsForMonth(cards: EventCard[], month: CampaignMonthId): EventCard[] {
  const monthIndex = campaignMonths.indexOf(month);
  return cards.filter((card) => {
    const fromMonth = card.availability?.fromMonth ?? (card.initialSet ? 'prologue' : undefined);
    if (!fromMonth) return false;
    return campaignMonths.indexOf(fromMonth) <= monthIndex;
  });
}

export function getDefaultAvailableEventCardsForMonth(month: CampaignMonthId): EventCard[] {
  return getAvailableEventCardsForMonth(eventCards, month);
}

export function getRequiredEventCardCountForFunding(fundingLevel: number, availableEventCount: number): number {
  return Math.min(clampFundingLevel(fundingLevel), Math.max(0, availableEventCount));
}

export function selectEventCardsForMonth(
  cards: EventCard[],
  month: CampaignMonthId,
  selectedEventCardIds: string[] | undefined,
  fundingLevel: number
): EventCard[] {
  const availableEvents = getAvailableEventCardsForMonth(cards, month);
  if (selectedEventCardIds === undefined) return availableEvents;

  const requiredCount = getRequiredEventCardCountForFunding(fundingLevel, availableEvents.length);
  if (selectedEventCardIds.length !== new Set(selectedEventCardIds).size) {
    throw new Error('Duplicate selected event cards are not allowed.');
  }
  if (selectedEventCardIds.length !== requiredCount) {
    throw new Error(`Expected ${requiredCount} event card(s) for funding level ${clampFundingLevel(fundingLevel)}, but received ${selectedEventCardIds.length}.`);
  }

  const availableById = new Map(availableEvents.map((card) => [card.id, card]));
  return selectedEventCardIds.map((cardId) => {
    const card = availableById.get(cardId);
    if (!card) throw new Error(`Event card ${cardId} is not available for ${month}.`);
    return card;
  });
}

export function isCampaignMonthSetupComplete(campaign: CampaignState): boolean {
  return campaign.playerDeck.startingHand.configured && campaign.threatDeck.discardCardIds.length > 0;
}

export function createGameDecksForMonth(input: {
  campaign: CampaignState;
  players: PlayerProfile[];
  startingHands: StartingHandAssignment[];
  unidentifiedTargetCitySelections?: UnidentifiedTargetCitySelection[];
  /** @deprecated Use unidentifiedTargetCitySelections instead. */
  unidentifiedTargetCitySelection?: UnidentifiedTargetCitySelection;
  initialThreatCardIds: string[];
  selectedEventCardIds?: string[];
  fundingLevel?: number;
  now?: string;
}): Pick<CampaignState, 'playerDeck' | 'threatDeck' | 'turnFlow'> {
  const month = input.campaign.progress.currentMonth;
  const now = input.now ?? new Date().toISOString();
  const fundingLevel = clampFundingLevel(input.fundingLevel ?? input.campaign.progress.fundingLevel);
  const selectedEvents = selectEventCardsForMonth(eventCards, month, input.selectedEventCardIds, fundingLevel);
  const initialPlayerDeck = createInitialPlayerDeckState({
    playerCardIds: [...cityCards.map((card) => card.id), ...selectedEvents.map((card) => card.id)],
    playerCount: input.players.length,
    escalationCardIds: escalationCards.map((card) => card.id),
    now
  });
  const selections = input.unidentifiedTargetCitySelections ?? (input.unidentifiedTargetCitySelection ? [input.unidentifiedTargetCitySelection] : []);
  const withUnidentifiedTarget = selections.length > 0
    ? prepareUnidentifiedTargetCities(initialPlayerDeck, cityCards, selections)
    : initialPlayerDeck;

  return {
    playerDeck: configureStartingHands(withUnidentifiedTarget, input.startingHands),
    threatDeck: recordInitialThreatSetup(createInitialThreatDeckState(threatCards.map((card) => card.id), now), input.initialThreatCardIds),
    turnFlow: { step: 'player-draw', turnNumber: 1 }
  };
}

function createUnconfiguredDecksForMonth(input: {
  month: CampaignMonthId;
  players: PlayerProfile[];
  now: string;
}): Pick<CampaignState, 'playerDeck' | 'threatDeck' | 'turnFlow'> {
  const availableEvents = getDefaultAvailableEventCardsForMonth(input.month);
  const playerCount = Math.min(4, Math.max(2, input.players.length || 2));

  return {
    playerDeck: createInitialPlayerDeckState({
      playerCardIds: [...cityCards.map((card) => card.id), ...availableEvents.map((card) => card.id)],
      playerCount,
      escalationCardIds: escalationCards.map((card) => card.id),
      now: input.now
    }),
    threatDeck: createInitialThreatDeckState(threatCards.map((card) => card.id), input.now),
    turnFlow: { step: 'player-draw', turnNumber: 1 }
  };
}

export function applyGameResult(campaign: CampaignState, input: {
  playedAt?: string;
  characters: CharacterProfile[];
  missionResults: MissionResult[];
  now?: string;
}): CampaignState {
  const now = input.now ?? new Date().toISOString();
  const progress = campaign.progress;
  const rating = calculatePerformanceRating(input.missionResults);
  const nextFunding = calculateNextCampaignFundingLevel(progress.currentMonth, progress.fundingLevel, rating);
  const record = {
    id: `${campaign.campaignId}-${progress.currentMonth}-attempt-${progress.currentAttempt}-${Date.parse(now) || Date.now()}`,
    month: progress.currentMonth,
    attempt: progress.currentAttempt,
    fundingLevel: progress.fundingLevel,
    players: campaign.players,
    characters: input.characters,
    playedAt: input.playedAt,
    missionResults: input.missionResults,
    performanceRating: rating,
    createdAt: now,
    updatedAt: now
  };
  const retryCurrentMonth = rating === 'failure' && progress.currentAttempt === 1;
  const nextMonth = retryCurrentMonth ? progress.currentMonth : getNextCampaignMonth(progress.currentMonth) ?? progress.currentMonth;
  const nextAttempt = retryCurrentMonth ? progress.currentAttempt + 1 : 1;
  const nonSpoilerWarnings = nextFunding.secretFile14Required && !progress.nonSpoilerWarnings.includes(secretFile14Warning)
    ? [...progress.nonSpoilerWarnings, secretFile14Warning]
    : progress.nonSpoilerWarnings;
  const resetDecks = createUnconfiguredDecksForMonth({
    month: nextMonth,
    players: campaign.players,
    now
  });

  return {
    ...campaign,
    ...resetDecks,
    characters: input.characters,
    currentMonth: nextMonth,
    fundingLevel: nextFunding.fundingLevel,
    progress: {
      ...progress,
      currentMonth: nextMonth,
      currentAttempt: nextAttempt,
      fundingLevel: nextFunding.fundingLevel,
      gameRecords: [...progress.gameRecords, record],
      nonSpoilerWarnings
    },
    updatedAt: now
  };
}