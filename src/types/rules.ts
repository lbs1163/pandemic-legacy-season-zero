import type { LanguageCode, LocalizedText } from './cards';

export type RuleCategory = 'base' | 'legacy' | 'month' | 'house-rule';
export type RuleAffect = 'player-deck' | 'threat-deck' | 'sync' | 'ui';

export interface RuleReference {
  language: LanguageCode;
  markdownPath: string;
  anchor: string;
}

export interface RuleToggle {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  category: RuleCategory;
  defaultEnabled: boolean;
  enabled: boolean;
  introducedBy?: string;
  references: RuleReference[];
  affects: RuleAffect[];
}
