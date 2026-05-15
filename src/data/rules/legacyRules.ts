import type { RuleToggle } from '../../types/rules';

export const legacyRules: RuleToggle[] = [
  {
    id: 'legacy-infection-cards',
    label: { en: 'Infection cards', ko: '감염 카드' },
    description: {
      en: 'Failed February first-test cities add Infection cards that start in the Threat discard area and later enter the Threat deck when intensified.',
      ko: '2월 첫 시험 저지에 실패한 도시마다 감염 카드를 추가합니다. 감염 카드는 버린 위협 카드 구획에서 시작하고, 악화로 섞인 뒤 위협 덱에서 뽑힐 수 있습니다.'
    },
    category: 'legacy',
    defaultEnabled: true,
    enabled: true,
    introducedBy: 'February legacy rules B/Y',
    references: [
      { language: 'ko', markdownPath: 'docs/ko/legacy-rules.md', anchor: 'infection-cards' },
      { language: 'en', markdownPath: 'docs/en/legacy-rules.md', anchor: 'infection-cards' }
    ],
    affects: ['threat-deck', 'ui']
  }
];
