import type { Affiliation, Region } from './cards';

export type PlayerCardZone =
  | 'player-deck-unknown'
  | 'player-hand'
  | 'player-discard'
  | 'player-removed'
  | 'player-drawn-escalation';

export type ThreatCardZone =
  | 'threat-deck-unknown'
  | 'threat-discard'
  | 'threat-top-stack-known'
  | 'threat-game-end-area'
  | 'threat-removed';

export interface CardInstanceState {
  cardId: string;
  zone: PlayerCardZone | ThreatCardZone;
  ownerPlayerId?: string;
  order?: number;
  updatedAt: string;
}

export interface PlayerDeckPile {
  id: string;
  initialUnknownCount: number;
  remainingUnknownCount: number;
  escalationCardId?: string;
  escalationResolved: boolean;
}

export interface StartingHandState {
  requiredPerPlayer: number;
  requiredTotal: number;
  configured: boolean;
}

export type UnidentifiedTargetCityFilter =
  | { type: 'region'; value: Region }
  | { type: 'affiliation'; value: Affiliation };

export interface UnidentifiedTargetCitySetup {
  configured: boolean;
  filter?: UnidentifiedTargetCityFilter;
  candidateCardIds: string[];
  removedCardId?: string;
}

export interface PlayerDeckState {
  totalInitialCount: number;
  drawCountPerTurn: 2;
  piles: PlayerDeckPile[];
  cardStates: Record<string, CardInstanceState>;
  currentPileIndex: number;
  startingHand: StartingHandState;
  unidentifiedTargetCity?: UnidentifiedTargetCitySetup;
}

export interface ThreatDeckState {
  totalInitialCount: number;
  threatLevelIndex: number;
  cardStates: Record<string, CardInstanceState>;
  discardCardIds: string[];
  knownTopStackCardIds: string[];
  gameEndAreaCardIds: string[];
  removedCardIds: string[];
}

export type TurnFlowStep = 'player-draw' | 'threat-draw';

export interface TurnFlowState {
  step: TurnFlowStep;
  turnNumber: number;
}

export interface StartingHandAssignment {
  cardId: string;
  playerId: string;
}

export interface UnidentifiedTargetCitySelection {
  filter: UnidentifiedTargetCityFilter;
  removedCardId: string;
}

export type PlayerCardDestination = 'player-hand' | 'player-discard' | 'player-removed';
