import type { EventCard } from '../../types/cards';

export const eventCards: EventCard[] = [
  {
    id: 'event-counterintelligence-team',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Counterintelligence Team', ko: '방첩 부대' },
    effect: {
      kind: 'move-threat-discard-to-game-end',
      description: {
        en: 'Choose 1 card from the Threat discard area and move it to the Game End area.',
        ko: "'버린 위협 카드' 구획에서 카드 1장을 골라 '게임 종료' 구획으로 옮깁니다."
      }
    }
  },
  {
    id: 'event-forecast',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Forecast', ko: '예측' },
    effect: {
      kind: 'informational',
      description: {
        en: 'Look at the top 6 cards of the Threat deck, then arrange them in any order and put them back on top of the Threat deck.',
        ko: '위협 덱 맨 위에서부터 카드 6장을 확인한 후, 원하는 순서대로 정리하여 다시 위협 덱 위에 얹습니다.'
      }
    }
  },
  {
    id: 'event-in-the-shadows',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'In the Shadows', ko: '어둠 속에서' },
    effect: {
      kind: 'informational',
      description: {
        en: 'This turn, remove 1 Soviet agent from each city a player character enters by driving/ferrying.',
        ko: '이번 차례에, 플레이어 캐릭터가 자동차/배 이동으로 들어가는 도시마다 소련 비밀요원 말을 1개씩 제거합니다.'
      }
    }
  },
  {
    id: 'event-war-relics',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'War Relics', ko: '전쟁 유물' },
    effect: {
      kind: 'informational',
      description: {
        en: 'Place 1 safehouse in any city.',
        ko: '아무 도시 1곳에 안전가옥 1개를 놓습니다.'
      }
    }
  },
  {
    id: 'event-airlift',
    kind: 'event',
    initialSet: true,
    availability: { fromMonth: 'prologue' },
    name: { en: 'Airlift', ko: '공중 수송' },
    effect: {
      kind: 'informational',
      description: {
        en: 'Move any 1 character pawn to any city, or move any 1 team pawn to any city.',
        ko: '아무 캐릭터 말 1개를 아무 도시로 옮깁니다. 또는 아무 작전팀 말 1개를 아무 도시로 옮깁니다.'
      }
    }
  },
  {
    id: 'event-dispatch-teams',
    kind: 'event',
    initialSet: false,
    availability: { fromMonth: 'february' },
    name: { en: 'Dispatch Teams', ko: '작전팀 급파' },
    effect: {
      kind: 'informational',
      description: {
        en: 'Move every team pawn to a city up to 3 connections away from the city that pawn is currently in.',
        ko: '모든 작전팀 말을 해당 말이 현재 위치한 도시에서 최대 3칸 떨어진 도시로 이동시킵니다.'
      }
    }
  },
  {
    id: 'event-weekend-rendezvous',
    kind: 'event',
    initialSet: false,
    availability: { fromMonth: 'february' },
    name: { en: 'Weekend Rendezvous', ko: '주말 접선' },
    effect: {
      kind: 'informational',
      description: {
        en: 'You may move one or more character pawns to one city containing another character pawn.',
        ko: '아무 캐릭터 말 하나 또는 여럿을 다른 캐릭터 말이 있는 도시 1곳으로 옮길 수 있습니다.'
      }
    }
  },
  {
    id: 'event-coded-message',
    kind: 'event',
    initialSet: false,
    availability: { fromMonth: 'february' },
    name: { en: 'Coded Message', ko: '암호 메세지' },
    effect: {
      kind: 'informational',
      description: {
        en: 'Choose 2 players. Each chooses 1 Player card from their hand, then they exchange those cards.',
        ko: '플레이어 2명을 선택합니다. 그 둘이 각자 손에 든 플레이어 카드 1장씩을 골라 서로 교환합니다.'
      }
    }
  },
  {
    id: 'event-bureaucratic-trap',
    kind: 'event',
    initialSet: false,
    availability: { fromMonth: 'february' },
    name: { en: 'Bureaucratic Trap', ko: '관료주의의 덫' },
    effect: {
      kind: 'informational',
      description: {
        en: 'Remove 1 or 2 Soviet agent pawns from the board.',
        ko: '게임판에서 소련 비밀요원 말 1개 또는 2개를 제거합니다.'
      }
    }
  }
];
