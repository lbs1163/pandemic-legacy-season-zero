import type { LanguageCode } from './cards';
import type { PlayerDeckState, ThreatDeckState } from './deck';

export interface PlayerProfile {
  id: string;
  name: string;
}

export interface CampaignState {
  schemaVersion: 1;
  campaignId: string;
  campaignName: string;
  language: LanguageCode;
  players: PlayerProfile[];
  currentMonth?: string;
  fundingLevel?: number;
  playerDeck: PlayerDeckState;
  threatDeck: ThreatDeckState;
  ruleToggles: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface DeckCounterSummary {
  playerDeckRemaining: number;
  playerDeckDiscardCount: number;
  unresolvedEscalations: number;
  currentPileEscalationRisk: number;
  threatDeckUnknownRemaining: number;
  threatDiscardCount: number;
  threatKnownTopStackCount: number;
  gameEndAreaCount: number;
}
