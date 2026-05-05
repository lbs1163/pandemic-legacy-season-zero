import type { RuleToggle } from '../../types/rules';

export const baseRules: RuleToggle[] = [
  {
    id: 'base.player-deck-setup',
    label: { en: 'Player deck setup', ko: '플레이어 덱 준비' },
    description: { en: 'Five piles with one Escalation card in each pile.', ko: '5개 더미 각각에 악화 카드 1장을 섞습니다.' },
    category: 'base',
    defaultEnabled: true,
    enabled: true,
    references: [
      { language: 'en', markdownPath: 'docs/en/rulebook.md', anchor: 'setup' },
      { language: 'ko', markdownPath: 'docs/ko/rulebook.md', anchor: 'setup' }
    ],
    affects: ['player-deck']
  },
  {
    id: 'base.escalation',
    label: { en: 'Escalation resolution', ko: '악화 처리' },
    description: { en: 'Bottom Threat draw to discard, then intensify Threat discard onto deck top.', ko: '위협 덱 맨 아래 카드를 버린 위협 카드 구획으로 보낸 뒤 버린 위협 카드 구획을 섞어 맨 위에 올립니다.' },
    category: 'base',
    defaultEnabled: true,
    enabled: true,
    references: [
      { language: 'en', markdownPath: 'docs/en/rulebook.md', anchor: 'escalation-cards' },
      { language: 'ko', markdownPath: 'docs/ko/rulebook.md', anchor: 'escalation-cards' }
    ],
    affects: ['player-deck', 'threat-deck']
  },
  {
    id: 'base.threat-draws',
    label: { en: 'Threat draws', ko: '위협 카드 뽑기' },
    description: { en: 'Threat cards move from the draw pile to discard unless another rule redirects them.', ko: '별도 규칙이 없다면 위협 카드는 덱에서 버린 위협 카드 구획으로 이동합니다.' },
    category: 'base',
    defaultEnabled: true,
    enabled: true,
    references: [
      { language: 'en', markdownPath: 'docs/en/rulebook.md', anchor: 'threat-cards' },
      { language: 'ko', markdownPath: 'docs/ko/rulebook.md', anchor: 'threat-cards' }
    ],
    affects: ['threat-deck']
  },
  {
    id: 'base.incident-game-end-area',
    label: { en: 'Incident Game End area', ko: '사건 게임 종료 구획' },
    description: { en: 'Some bottom Threat draws are stored separately until after-game cleanup.', ko: '일부 맨 아래 위협 카드는 게임 후 정리 전까지 게임 종료 구획에 둡니다.' },
    category: 'base',
    defaultEnabled: true,
    enabled: true,
    references: [
      { language: 'en', markdownPath: 'docs/en/rulebook.md', anchor: 'incidents' },
      { language: 'ko', markdownPath: 'docs/ko/rulebook.md', anchor: 'incidents' }
    ],
    affects: ['threat-deck']
  }
];
