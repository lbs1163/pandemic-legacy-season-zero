import type { CampaignMonthId } from './campaign';

export type LanguageCode = 'en' | 'ko';
export type CardKind = 'city' | 'event' | 'escalation' | 'threat';
export type Affiliation = 'allied' | 'neutral' | 'soviet';
export type Region = 'north-america' | 'south-america' | 'europe' | 'africa' | 'asia' | 'pacific';

export interface LocalizedText {
  en: string;
  ko: string;
}

export interface BaseCard {
  id: string;
  kind: CardKind;
  name: LocalizedText;
  notes?: LocalizedText;
}

export interface CityCard extends BaseCard {
  kind: 'city';
  region: Region;
  affiliation: Affiliation;
  country?: LocalizedText;
}

export interface EventAvailability {
  fromMonth: CampaignMonthId;
}

export type EventEffectKind = 'move-threat-discard-to-game-end' | 'informational' | 'unknown';

export interface EventEffectDefinition {
  kind: EventEffectKind;
  description: LocalizedText;
}

export interface EventCard extends BaseCard {
  kind: 'event';
  initialSet: boolean;
  availability?: EventAvailability;
  effect?: EventEffectDefinition;
}

export interface EscalationCard extends BaseCard {
  kind: 'escalation';
  escalationNumber: number;
}

export interface ThreatCard extends BaseCard {
  kind: 'threat';
  cityCardId: string;
  incidentEffect?: LocalizedText;
}

export type PlayerCard = CityCard | EventCard | EscalationCard;
