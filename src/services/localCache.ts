import { z } from 'zod';
import type { PersistedEnvelope } from '../types/sync';

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
  currentPileIndex: z.number().int().min(0).max(4)
});

const threatDeckSchema = z.object({
  totalInitialCount: z.number().int().nonnegative(),
  unknownDrawPileCount: z.number().int().nonnegative(),
  discardCardIds: z.array(z.string()),
  knownTopStackCardIds: z.array(z.string()),
  gameEndAreaCardIds: z.array(z.string()),
  removedCardIds: z.array(z.string())
});

export const persistedEnvelopeSchema = z.object({
  appId: z.literal('pandemic-legacy-season-zero-deck-counter'),
  schemaVersion: z.literal(1),
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
    ruleToggles: z.record(z.boolean()),
    createdAt: z.string(),
    updatedAt: z.string()
  }))
});

export function validatePersistedEnvelope(value: unknown): PersistedEnvelope {
  return persistedEnvelopeSchema.parse(value) as PersistedEnvelope;
}

export function createEmptyEnvelope(): PersistedEnvelope {
  return {
    appId: 'pandemic-legacy-season-zero-deck-counter',
    schemaVersion: 1,
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
