import type { EventCard } from '../../types/cards';

export const eventCards: EventCard[] = [
  {
    id: 'event-counterintelligence-team',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Counterintelligence Team', ko: '방첩 부대' },
    notes: { en: 'Title/effect wording placeholder; replace when exact card text is provided.', ko: '정확한 카드 문구가 제공되면 교체하세요.' },
    effect: {
      kind: 'move-threat-discard-to-game-end',
      description: {
        en: 'Choose 1 card from the Threat discard area and move it to the Game End area.',
        ko: '버린 위협 카드 구획에서 카드 1장을 골라 게임 종료 구획으로 이동합니다.'
      }
    }
  },
  {
    id: 'event-government-grant-placeholder',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Event Card 2', ko: '이벤트 카드 2' },
    notes: { en: 'Placeholder; verify exact initial event name from rulebook/cards.', ko: '초기 이벤트 카드 이름 확인 필요.' },
    effect: { kind: 'unknown', description: { en: 'Effect text not entered yet.', ko: '효과 문구가 아직 입력되지 않았습니다.' } }
  },
  {
    id: 'event-one-quiet-night-placeholder',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Event Card 3', ko: '이벤트 카드 3' },
    notes: { en: 'Placeholder; verify exact initial event name from rulebook/cards.', ko: '초기 이벤트 카드 이름 확인 필요.' },
    effect: { kind: 'unknown', description: { en: 'Effect text not entered yet.', ko: '효과 문구가 아직 입력되지 않았습니다.' } }
  },
  {
    id: 'event-resilient-population-placeholder',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Event Card 4', ko: '이벤트 카드 4' },
    notes: { en: 'Placeholder; verify exact initial event name from rulebook/cards.', ko: '초기 이벤트 카드 이름 확인 필요.' },
    effect: { kind: 'unknown', description: { en: 'Effect text not entered yet.', ko: '효과 문구가 아직 입력되지 않았습니다.' } }
  },
  {
    id: 'event-special-orders-placeholder',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Event Card 5', ko: '이벤트 카드 5' },
    notes: { en: 'Placeholder; verify exact initial event name from rulebook/cards.', ko: '초기 이벤트 카드 이름 확인 필요.' },
    effect: { kind: 'unknown', description: { en: 'Effect text not entered yet.', ko: '효과 문구가 아직 입력되지 않았습니다.' } }
  },
  ...[1, 2, 3, 4].map((index): EventCard => ({
    id: `event-february-${index}-placeholder`,
    kind: 'event',
    initialSet: false,
    availability: { fromMonth: 'february' },
    name: { en: `February Event Card ${index}`, ko: `2월 이벤트 카드 ${index}` },
    notes: { en: 'February event placeholder; exact title/effect pending.', ko: '2월 이벤트 카드 자리표시자입니다. 정확한 이름/효과 대기 중.' },
    effect: { kind: 'unknown', description: { en: 'Effect text not entered yet.', ko: '효과 문구가 아직 입력되지 않았습니다.' } }
  }))
];
