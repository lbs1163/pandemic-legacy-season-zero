import type { LanguageCode } from '../types/cards';
import type { CampaignState, PlayerProfile } from '../types/campaign';
import { cityCards } from '../data/cards/cities';
import { escalationCards } from '../data/cards/escalations';
import { threatCards } from '../data/cards/threats';
import { baseRules } from '../data/rules/baseRules';
import { legacyRules } from '../data/rules/legacyRules';
import { clampFundingLevel, getDefaultAvailableEventCardsForMonth } from './campaignProgress';
import { createInitialPlayerDeckState } from './playerDeck';
import { createInitialThreatDeckState } from './threatDeck';

export interface CreateInitialCampaignInput {
  campaignName: string;
  language: LanguageCode;
  players: PlayerProfile[];
  fundingLevel?: number;
}

export function createInitialCampaign(input: CreateInitialCampaignInput): CampaignState {
  const now = new Date().toISOString();
  const toggles = [...baseRules, ...legacyRules];
  const currentMonth = 'prologue' as const;
  const fundingLevel = clampFundingLevel(input.fundingLevel ?? 5);
  const availableEvents = getDefaultAvailableEventCardsForMonth(currentMonth);
  return {
    schemaVersion: 2,
    campaignId: `campaign-${Date.now()}`,
    campaignName: input.campaignName,
    language: input.language,
    players: input.players,
    characters: [],
    currentMonth,
    fundingLevel,
    progress: {
      currentMonth,
      currentAttempt: 1,
      fundingLevel,
      gameRecords: [],
      openedLegacyCardIds: [],
      nonSpoilerWarnings: []
    },
    playerDeck: createInitialPlayerDeckState({
      playerCardIds: [...cityCards.map((card) => card.id), ...availableEvents.map((card) => card.id)],
      playerCount: input.players.length,
      escalationCardIds: escalationCards.map((card) => card.id),
      now
    }),
    threatDeck: createInitialThreatDeckState(threatCards.map((card) => card.id), now),
    turnFlow: { step: 'player-draw', turnNumber: 1 },
    ruleToggles: Object.fromEntries(toggles.map((toggle) => [toggle.id, toggle.defaultEnabled])),
    createdAt: now,
    updatedAt: now
  };
}
