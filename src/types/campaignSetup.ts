import type { LocalizedText, Region } from './cards';
import type { CampaignMonthId } from './campaign';
import type { UnidentifiedTargetCityFilter } from './deck';

export interface UnidentifiedTargetCityDefault {
  enabled: boolean;
  filter: UnidentifiedTargetCityFilter;
  hiddenRemovedCount: number;
  revealedRemovedCount?: number;
  warningWhenChanged: LocalizedText;
}

export interface MissionDefinition {
  id: string;
  month: CampaignMonthId;
  name: LocalizedText;
  description?: LocalizedText;
  defaultResult?: boolean;
}

export interface MonthSetupDefaults {
  month: CampaignMonthId;
  name: LocalizedText;
  defaultFundingLevel?: number;
  missions: MissionDefinition[];
  unidentifiedTargetCities?: UnidentifiedTargetCityDefault[];
  /** @deprecated Use unidentifiedTargetCities instead. */
  unidentifiedTargetCity?: UnidentifiedTargetCityDefault;
  eventCardIdsAvailable?: string[];
  surveillanceSatelliteRegions?: Region[];
  legacyCardIdsApplied?: string[];
}