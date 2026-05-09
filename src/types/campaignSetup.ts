import type { LocalizedText } from './cards';
import type { CampaignMonthId } from './campaign';
import type { UnidentifiedTargetCityFilter } from './deck';

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
  unidentifiedTargetCity?: {
    enabled: boolean;
    filter: UnidentifiedTargetCityFilter;
    hiddenRemovedCount: number;
    warningWhenChanged: LocalizedText;
  };
  eventCardIdsAvailable?: string[];
  legacyCardIdsApplied?: string[];
}