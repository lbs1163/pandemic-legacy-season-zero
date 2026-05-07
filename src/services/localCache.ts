import { z } from 'zod';
import type { PersistedEnvelope } from '../types/sync';
import type { CampaignState } from '../types/campaign';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import { escalationCards } from '../data/cards/escalations';
import { threatCards } from '../data/cards/threats';
import { createInitialPlayerDeckState } from '../domain/playerDeck';
import { createInitialThreatDeckState } from '../domain/threatDeck';

export const LOCAL_CACHE_KEY = 'pandemic-legacy-season-zero.deck-counter.cache';

const cardInstanceSchema = z.object({
  cardId: z.string(),
  zone: z.string(),
  ownerPlayerId: z.string().optional(),
  order: z.number().optional(),
  updatedAt: z.string()
});

const playerDeckSchema = z.object({
  totalInitialCount: z.number().int().nonnegative(),
  drawCountPerTurn: z.literal(2),
  piles: z.array(z.object({
    id: z.string(),
    initialUnknownCount: z.number().int().nonnegative(),
    remainingUnknownCount: z.number().int().nonnegative(),
    escalationCardId: z.string().optional(),
    escalationResolved: z.boolean()
  })).length(5),
  cardStates: z.record(cardInstanceSchema),
  currentPileIndex: z.number().int().min(0).max(4),
  startingHand: z.object({
    requiredPerPlayer: z.number().int().nonnegative(),
    requiredTotal: z.number().int().nonnegative(),
    configured: z.boolean()
  }),
  unidentifiedTargetCity: z.object({
    configured: z.boolean(),
    filter: z.union([
      z.object({ type: z.literal('region'), value: z.union([z.literal('north-america'), z.literal('south-america'), z.literal('europe'), z.literal('africa'), z.literal('asia'), z.literal('pacific')]) }),
      z.object({ type: z.literal('affiliation'), value: z.union([z.literal('allied'), z.literal('neutral'), z.literal('soviet')]) })
    ]).optional(),
    candidateCardIds: z.array(z.string()),
    hiddenRemovedCount: z.number().int().nonnegative().optional(),
    removedCardId: z.string().optional()
  }).optional()
});

const threatDeckSchema = z.object({
  totalInitialCount: z.number().int().nonnegative(),
  threatLevelIndex: z.number().int().min(0).max(5).default(0),
  cardStates: z.record(cardInstanceSchema),
  discardCardIds: z.array(z.string()),
  knownTopStackCardIds: z.array(z.string()),
  gameEndAreaCardIds: z.array(z.string()),
  removedCardIds: z.array(z.string())
});

const turnFlowSchema = z.object({
  step: z.union([z.literal('player-draw'), z.literal('threat-draw')]),
  turnNumber: z.number().int().positive()
});

export const persistedEnvelopeSchema = z.object({
  appId: z.literal('pandemic-legacy-season-zero-deck-counter'),
  schemaVersion: z.literal(2),
  activeCampaignId: z.string().optional(),
  campaigns: z.array(z.object({
    schemaVersion: z.literal(1),
    campaignId: z.string(),
    campaignName: z.string(),
    language: z.union([z.literal('en'), z.literal('ko')]),
    players: z.array(z.object({ id: z.string(), name: z.string() })),
    currentMonth: z.string().optional(),
    fundingLevel: z.number().optional(),
    playerDeck: playerDeckSchema,
    threatDeck: threatDeckSchema,
    turnFlow: turnFlowSchema.default({ step: 'player-draw', turnNumber: 1 }),
    ruleToggles: z.record(z.boolean()),
    createdAt: z.string(),
    updatedAt: z.string()
  }))
});

function migrateCampaignToV2(value: unknown): CampaignState {
  const campaign = value as CampaignState & { playerDeck?: unknown; threatDeck?: unknown; updatedAt?: string };
  const now = campaign.updatedAt ?? new Date().toISOString();
  return {
    ...campaign,
    playerDeck: createInitialPlayerDeckState({
      playerCardIds: [...cityCards.map((card) => card.id), ...eventCards.map((card) => card.id)],
      playerCount: campaign.players?.length ?? 2,
      escalationCardIds: escalationCards.map((card) => card.id),
      now
    }),
    threatDeck: createInitialThreatDeckState(threatCards.map((card) => card.id), now),
    updatedAt: now
  } as CampaignState;
}

function migrateEnvelopeToV2(value: unknown): unknown {
  const envelope = value as { appId?: unknown; schemaVersion?: unknown; campaigns?: unknown[]; activeCampaignId?: unknown };
  if (envelope?.appId !== 'pandemic-legacy-season-zero-deck-counter') return value;
  if (envelope.schemaVersion === 2) return value;
  if (envelope.schemaVersion !== 1) return value;

  return {
    ...envelope,
    schemaVersion: 2,
    campaigns: Array.isArray(envelope.campaigns) ? envelope.campaigns.map((campaign) => migrateCampaignToV2(campaign)) : []
  };
}

export function validatePersistedEnvelope(value: unknown): PersistedEnvelope {
  return persistedEnvelopeSchema.parse(migrateEnvelopeToV2(value)) as PersistedEnvelope;
}

export function createEmptyEnvelope(): PersistedEnvelope {
  return {
    appId: 'pandemic-legacy-season-zero-deck-counter',
    schemaVersion: 2,
    campaigns: []
  };
}

export function loadLocalCache(): PersistedEnvelope | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  const raw = localStorage.getItem(LOCAL_CACHE_KEY);
  if (!raw) return undefined;
  return validatePersistedEnvelope(JSON.parse(raw));
}

export function saveLocalCache(envelope: PersistedEnvelope): void {
  if (typeof localStorage === 'undefined') return;
  const validated = validatePersistedEnvelope(envelope);
  localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(validated));
}
