import type { LanguageCode } from '../types/cards';
import type { CampaignState, PlayerProfile } from '../types/campaign';
import { cityCards } from '../data/cards/cities';
import { escalationCards } from '../data/cards/escalations';
import { eventCards } from '../data/cards/events';
import { threatCards } from '../data/cards/threats';
import { baseRules } from '../data/rules/baseRules';
import { legacyRules } from '../data/rules/legacyRules';
import { createInitialPlayerDeckState } from './playerDeck';
import { createInitialThreatDeckState } from './threatDeck';

export interface CreateInitialCampaignInput {
  campaignName: string;
  language: LanguageCode;
  players: PlayerProfile[];
  fundingLevel?: number;
}

function startingHandCountForPlayers(playerCount: number): number {
  if (playerCount <= 2) return playerCount * 4;
  if (playerCount === 3) return playerCount * 3;
  return playerCount * 2;
}

export function createInitialCampaign(input: CreateInitialCampaignInput): CampaignState {
  const now = new Date().toISOString();
  const toggles = [...baseRules, ...legacyRules];
  return {
    schemaVersion: 1,
    campaignId: `campaign-${Date.now()}`,
    campaignName: input.campaignName,
    language: input.language,
    players: input.players,
    fundingLevel: input.fundingLevel,
    playerDeck: createInitialPlayerDeckState({
      playerCardCount: cityCards.length + eventCards.length,
      startingHandCardCount: startingHandCountForPlayers(input.players.length),
      escalationCardIds: escalationCards.map((card) => card.id),
      now
    }),
    threatDeck: createInitialThreatDeckState(threatCards.length),
    ruleToggles: Object.fromEntries(toggles.map((toggle) => [toggle.id, toggle.defaultEnabled])),
    createdAt: now,
    updatedAt: now
  };
}
