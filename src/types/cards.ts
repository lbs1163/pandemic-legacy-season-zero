import type { CampaignMonthId } from './campaign';

export type LanguageCode = 'en' | 'ko';
export type CardKind = 'city' | 'event' | 'escalation' | 'threat' | 'surveillance-satellite';
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
  fromMonth?: CampaignMonthId;
  afterMonthPlayed?: CampaignMonthId;
}

export type EventEffectKind = 'move-threat-discard-to-game-end' | 'skip-current-threat-draw-step' | 'informational' | 'unknown';

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

export interface SurveillanceSatelliteCard extends BaseCard {
  kind: 'surveillance-satellite';
  region: Region;
}

export type ThreatCardType = 'threat' | 'infection';

export interface ThreatCard extends BaseCard {
  kind: 'threat';
  cityCardId: string;
  threatCardType?: ThreatCardType;
  incidentEffect?: LocalizedText;
}

export type PlayerCard = CityCard | EventCard | EscalationCard | SurveillanceSatelliteCard;
