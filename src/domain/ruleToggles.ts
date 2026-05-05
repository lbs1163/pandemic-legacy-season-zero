import type { CampaignState } from '../types/campaign';
import type { RuleToggle } from '../types/rules';

export function listEnabledRules(toggles: RuleToggle[], state: CampaignState): RuleToggle[] {
  return toggles.filter((toggle) => state.ruleToggles[toggle.id] ?? toggle.defaultEnabled);
}

export function setRuleEnabled(campaign: CampaignState, ruleId: string, enabled: boolean): CampaignState {
  return {
    ...campaign,
    ruleToggles: { ...campaign.ruleToggles, [ruleId]: enabled },
    updatedAt: new Date().toISOString()
  };
}
