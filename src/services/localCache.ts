import { z } from 'zod';
import type { PersistedEnvelope } from '../types/sync';
import type { CampaignState } from '../types/campaign';
import { cityCards } from '../data/cards/cities';
import { escalationCards } from '../data/cards/escalations';
import { threatCards } from '../data/cards/threats';
import { createInitialPlayerDeckState } from '../domain/playerDeck';
import { createInitialThreatDeckState } from '../domain/threatDeck';
import { campaignMonths } from '../data/campaign/months';
import { clampFundingLevel, getDefaultAvailableEventCardsForMonth } from '../domain/campaignProgress';
import type { CampaignMonthId } from '../types/campaign';

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
  knownTopStacks: z.array(z.array(z.string())).optional(),
  knownTopStackCardIds: z.array(z.string()),
  gameEndAreaCardIds: z.array(z.string()),
  removedCardIds: z.array(z.string())
}).transform((state) => {
  const knownTopStacks = state.knownTopStacks?.length
    ? state.knownTopStacks.filter((stack) => stack.length > 0)
    : (state.knownTopStackCardIds.length ? [state.knownTopStackCardIds] : []);
  return {
    ...state,
    knownTopStacks,
    knownTopStackCardIds: knownTopStacks.flat()
  };
});

const turnFlowSchema = z.object({
  step: z.union([z.literal('player-draw'), z.literal('threat-draw')]),
  turnNumber: z.number().int().positive()
});

const campaignMonthSchema = z.union([
  z.literal('prologue'),
  z.literal('january'),
  z.literal('february'),
  z.literal('march'),
  z.literal('april'),
  z.literal('may'),
  z.literal('june'),
  z.literal('july'),
  z.literal('august'),
  z.literal('september'),
  z.literal('october'),
  z.literal('november'),
  z.literal('december')
]);

const fundingLevelSchema = z.number().int().min(1).max(10);
const playerProfileSchema = z.object({ id: z.string(), name: z.string() });
const characterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  playerId: z.string().optional(),
  roleName: z.string().optional(),
  notes: z.string().optional()
});
const missionResultSchema = z.object({ missionId: z.string(), succeeded: z.boolean() });
const performanceRatingSchema = z.union([z.literal('success'), z.literal('adequate'), z.literal('failure')]);
const campaignGameRecordSchema = z.object({
  id: z.string(),
  month: campaignMonthSchema,
  attempt: z.number().int().positive(),
  fundingLevel: fundingLevelSchema,
  players: z.array(playerProfileSchema),
  characters: z.array(characterProfileSchema),
  playedAt: z.string().optional(),
  missionResults: z.array(missionResultSchema),
  performanceRating: performanceRatingSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
const campaignProgressSchema = z.object({
  currentMonth: campaignMonthSchema,
  currentAttempt: z.number().int().positive(),
  fundingLevel: fundingLevelSchema,
  gameRecords: z.array(campaignGameRecordSchema),
  openedLegacyCardIds: z.array(z.string()),
  nonSpoilerWarnings: z.array(z.string())
});
const campaignV2Schema = z.object({
  schemaVersion: z.literal(2),
  campaignId: z.string(),
  campaignName: z.string(),
  language: z.union([z.literal('en'), z.literal('ko')]),
  players: z.array(playerProfileSchema),
  characters: z.array(characterProfileSchema).optional(),
  currentMonth: campaignMonthSchema.optional(),
  fundingLevel: fundingLevelSchema.optional(),
  progress: campaignProgressSchema,
  playerDeck: playerDeckSchema,
  threatDeck: threatDeckSchema,
  turnFlow: turnFlowSchema.default({ step: 'player-draw', turnNumber: 1 }),
  ruleToggles: z.record(z.boolean()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const persistedEnvelopeSchema = z.object({
  appId: z.literal('pandemic-legacy-season-zero-deck-counter'),
  schemaVersion: z.literal(3),
  activeCampaignId: z.string().optional(),
  campaigns: z.array(campaignV2Schema)
});

function coerceCampaignMonth(value: unknown): CampaignMonthId {
  return typeof value === 'string' && campaignMonths.includes(value as CampaignMonthId) ? value as CampaignMonthId : 'prologue';
}

function migrateCampaignDecksToEnvelopeV2(value: unknown): unknown {
  const campaign = value as Partial<CampaignState> & { playerDeck?: unknown; threatDeck?: unknown; updatedAt?: string };
  const now = campaign.updatedAt ?? new Date().toISOString();
  const month = coerceCampaignMonth(campaign.currentMonth);
  const availableEvents = getDefaultAvailableEventCardsForMonth(month);
  return {
    ...campaign,
    playerDeck: createInitialPlayerDeckState({
      playerCardIds: [...cityCards.map((card) => card.id), ...availableEvents.map((card) => card.id)],
      playerCount: campaign.players?.length ?? 2,
      escalationCardIds: escalationCards.map((card) => card.id),
      now
    }),
    threatDeck: createInitialThreatDeckState(threatCards.map((card) => card.id), now),
    updatedAt: now
  };
}

function migrateCampaignToV3(value: unknown): CampaignState {
  const campaign = value as Partial<CampaignState> & { schemaVersion?: number; currentMonth?: unknown; fundingLevel?: unknown; progress?: unknown };
  if (campaign.schemaVersion === 2 && campaign.progress) return campaign as CampaignState;
  const now = campaign.updatedAt ?? new Date().toISOString();
  const currentMonth = coerceCampaignMonth(campaign.currentMonth);
  const fundingLevel = clampFundingLevel(typeof campaign.fundingLevel === 'number' ? campaign.fundingLevel : 4);
  return {
    ...campaign,
    schemaVersion: 2,
    currentMonth,
    fundingLevel,
    characters: campaign.characters ?? [],
    progress: {
      currentMonth,
      currentAttempt: 1,
      fundingLevel,
      gameRecords: [],
      openedLegacyCardIds: [],
      nonSpoilerWarnings: []
    },
    turnFlow: campaign.turnFlow ?? { step: 'player-draw', turnNumber: 1 },
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
    campaigns: Array.isArray(envelope.campaigns) ? envelope.campaigns.map((campaign) => migrateCampaignDecksToEnvelopeV2(campaign)) : []
  };
}

function migrateEnvelopeToV3(value: unknown): unknown {
  const envelope = migrateEnvelopeToV2(value) as { appId?: unknown; schemaVersion?: unknown; campaigns?: unknown[]; activeCampaignId?: unknown };
  if (envelope?.appId !== 'pandemic-legacy-season-zero-deck-counter') return value;
  if (envelope.schemaVersion === 3) {
    return {
      ...envelope,
      campaigns: Array.isArray(envelope.campaigns) ? envelope.campaigns.map((campaign) => migrateCampaignToV3(campaign)) : []
    };
  }
  if (envelope.schemaVersion !== 2) return envelope;

  return {
    ...envelope,
    schemaVersion: 3,
    campaigns: Array.isArray(envelope.campaigns) ? envelope.campaigns.map((campaign) => migrateCampaignToV3(campaign)) : []
  };
}

export function validatePersistedEnvelope(value: unknown): PersistedEnvelope {
  return persistedEnvelopeSchema.parse(migrateEnvelopeToV3(value)) as PersistedEnvelope;
}

export function createEmptyEnvelope(): PersistedEnvelope {
  return {
    appId: 'pandemic-legacy-season-zero-deck-counter',
    schemaVersion: 3,
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
