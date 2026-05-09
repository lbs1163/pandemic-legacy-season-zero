import type { LanguageCode } from './cards';
import type { PlayerDeckState, ThreatDeckState, TurnFlowState } from './deck';

export type CampaignMonthId =
  | 'prologue'
  | 'january'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'june'
  | 'july'
  | 'august'
  | 'september'
  | 'october'
  | 'november'
  | 'december';

export type PerformanceRating = 'success' | 'adequate' | 'failure';

export interface PlayerProfile {
  id: string;
  name: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  playerId?: string;
  roleName?: string;
  notes?: string;
}

export interface MissionResult {
  missionId: string;
  succeeded: boolean;
}

export interface CampaignGameRecord {
  id: string;
  month: CampaignMonthId;
  attempt: number;
  fundingLevel: number;
  players: PlayerProfile[];
  characters: CharacterProfile[];
  playedAt?: string;
  missionResults: MissionResult[];
  performanceRating?: PerformanceRating;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignProgressState {
  currentMonth: CampaignMonthId;
  currentAttempt: number;
  fundingLevel: number;
  gameRecords: CampaignGameRecord[];
  openedLegacyCardIds: string[];
  nonSpoilerWarnings: string[];
}

export interface CampaignState {
  schemaVersion: 2;
  campaignId: string;
  campaignName: string;
  language: LanguageCode;
  players: PlayerProfile[];
  characters?: CharacterProfile[];
  currentMonth?: CampaignMonthId;
  fundingLevel?: number;
  progress: CampaignProgressState;
  playerDeck: PlayerDeckState;
  threatDeck: ThreatDeckState;
  turnFlow?: TurnFlowState;
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
  threatLevel: number;
  gameEndAreaCount: number;
}
