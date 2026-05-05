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

export interface PlayerDeckState {
  totalInitialCount: number;
  drawCountPerTurn: 2;
  piles: PlayerDeckPile[];
  cardStates: Record<string, CardInstanceState>;
  currentPileIndex: number;
  startingHand: StartingHandState;
}

export interface ThreatDeckState {
  totalInitialCount: number;
  cardStates: Record<string, CardInstanceState>;
  discardCardIds: string[];
  knownTopStackCardIds: string[];
  gameEndAreaCardIds: string[];
  removedCardIds: string[];
}

export interface StartingHandAssignment {
  cardId: string;
  playerId: string;
}

export type PlayerCardDestination = 'player-hand' | 'player-discard' | 'player-removed';
