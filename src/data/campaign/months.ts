import type { CampaignMonthId } from '../../types/campaign';
import type { MonthSetupDefaults } from '../../types/campaignSetup';
import type { Region } from '../../types/cards';

export const campaignMonths: CampaignMonthId[] = [
  'prologue',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];

export const monthLabels: Record<CampaignMonthId, { en: string; ko: string }> = {
  prologue: { en: 'Prologue', ko: '프롤로그' },
  january: { en: 'January', ko: '1월' },
  february: { en: 'February', ko: '2월' },
  march: { en: 'March', ko: '3월' },
  april: { en: 'April', ko: '4월' },
  may: { en: 'May', ko: '5월' },
  june: { en: 'June', ko: '6월' },
  july: { en: 'July', ko: '7월' },
  august: { en: 'August', ko: '8월' },
  september: { en: 'September', ko: '9월' },
  october: { en: 'October', ko: '10월' },
  november: { en: 'November', ko: '11월' },
  december: { en: 'December', ko: '12월' }
};

const defaultSetupWarning = {
  en: 'This setup differs from the normal setup for this month. Continue only if a legacy card or table instruction says to do so.',
  ko: '이 설정은 이번 달의 일반 설정과 다릅니다. 레거시 카드나 표 지시가 있을 때만 계속하세요.'
};

const hiddenRegionSetup = (value: 'north-america' | 'south-america' | 'europe' | 'africa' | 'asia' | 'pacific', hiddenRemovedCount: number) => ({
  enabled: true,
  filter: { type: 'region' as const, value },
  hiddenRemovedCount,
  warningWhenChanged: defaultSetupWarning
});

const revealedRegionSetup = (value: 'north-america' | 'south-america' | 'europe' | 'africa' | 'asia' | 'pacific', revealedRemovedCount: number) => ({
  enabled: true,
  filter: { type: 'region' as const, value },
  hiddenRemovedCount: 0,
  revealedRemovedCount,
  warningWhenChanged: defaultSetupWarning
});

const mission = (month: CampaignMonthId, index: number, en: string, ko: string) => ({
  id: `${month}-mission-${index}`,
  month,
  name: { en, ko },
  defaultResult: false
});

export const maySecondAttemptMission3A = {
  id: 'may-mission-3a',
  month: 'may' as const,
  name: {
    en: 'Wiretap the completed South America control center',
    ko: '완공된 남아메리카 관제소 도청'
  },
  description: {
    en: 'Perform the Acquire Target action in the city containing the South America control center.',
    ko: '남아메리카 관제소가 있는 도시에서 표적 확보 행동을 수행합니다.'
  },
  defaultResult: false
};

export const julySecondAttemptMission3A = {
  id: 'july-mission-3a',
  month: 'july' as const,
  name: {
    en: 'Wiretap the completed Africa control center',
    ko: '완공된 아프리카 관제소 도청'
  },
  description: {
    en: 'Perform the Acquire Target action in the city containing the Africa control center.',
    ko: '아프리카 내 관제소가 있는 도시에서 표적 확보'
  },
  defaultResult: false
};

const placeholderDefaults = (month: CampaignMonthId): MonthSetupDefaults => ({
  month,
  name: monthLabels[month],
  missions: [],
  eventCardIdsAvailable: [],
  legacyCardIdsApplied: []
});

const baseEventCardIds = [
  'event-counterintelligence-team',
  'event-forecast',
  'event-in-the-shadows',
  'event-war-relics',
  'event-airlift'
];

const februaryEventCardIds = [
  ...baseEventCardIds,
  'event-dispatch-teams',
  'event-weekend-rendezvous',
  'event-coded-message',
  'event-bureaucratic-trap'
];

const marchEventCardIds = [
  ...februaryEventCardIds,
  'event-diversion'
];

const aprilEventCardIds = [
  ...marchEventCardIds,
  'event-one-quiet-night'
];

const mayEventCardIds = [
  ...aprilEventCardIds,
  'event-time-extension',
  'event-unauthorized-action'
];

const juneEventCardIds = mayEventCardIds;

const julyEventCardIds = [
  ...juneEventCardIds,
  'event-test-vaccine',
  'event-spectrum-interference'
];

export const defaultSurveillanceSatelliteRegions: Region[] = ['europe', 'south-america', 'asia'];

export const monthSetupDefaults: Record<CampaignMonthId, MonthSetupDefaults> = {
  prologue: {
    month: 'prologue',
    name: monthLabels.prologue,
    defaultFundingLevel: 5,
    missions: [
      mission('prologue', 1, 'Acquire Project MEDUSA sample', '메두사 프로젝트 샘플 입수'),
      mission('prologue', 2, 'Search for Agent Sabik', '사빅 요원 수색')
    ],
    unidentifiedTargetCities: [hiddenRegionSetup('europe', 1)],
    eventCardIdsAvailable: baseEventCardIds,
    legacyCardIdsApplied: []
  },
  january: {
    month: 'january',
    name: monthLabels.january,
    defaultFundingLevel: 5,
    missions: [
      mission('january', 1, 'Interrogate Soviet scientist', '소련 과학자 취조'),
      mission('january', 2, 'Find Agent Sabik', '사빅 요원 찾기')
    ],
    unidentifiedTargetCities: [hiddenRegionSetup('asia', 1)],
    eventCardIdsAvailable: baseEventCardIds,
    legacyCardIdsApplied: []
  },
  february: {
    month: 'february',
    name: monthLabels.february,
    missions: [
      mission('february', 1, 'Stop the first Soviet test', '소련 1차 시험 저지'),
      mission('february', 2, 'Investigate Soviet scientist', '소련 과학자 조사')
    ],
    unidentifiedTargetCities: [revealedRegionSetup('africa', 3), hiddenRegionSetup('north-america', 1)],
    eventCardIdsAvailable: februaryEventCardIds,
    legacyCardIdsApplied: []
  },
  march: {
    month: 'march',
    name: monthLabels.march,
    missions: [
      mission('march', 1, 'Investigate Soviet factory', '소련 공장 조사'),
      mission('march', 2, 'Stop Agent Sabik from selling CIA secrets', 'CIA 기밀을 판매하려는 사빅 요원 저지')
    ],
    unidentifiedTargetCities: [hiddenRegionSetup('pacific', 1)],
    eventCardIdsAvailable: marchEventCardIds,
    legacyCardIdsApplied: []
  },
  april: {
    month: 'april',
    name: monthLabels.april,
    missions: [
      mission('april', 1, 'Stop the second Soviet test', '소련 2차 시험 저지'),
      mission('april', 2, 'Wiretap the control center', '관제소 도청')
    ],
    unidentifiedTargetCities: [revealedRegionSetup('south-america', 3), hiddenRegionSetup('europe', 1)],
    eventCardIdsAvailable: aprilEventCardIds,
    legacyCardIdsApplied: []
  },
  may: {
    month: 'may',
    name: monthLabels.may,
    missions: [
      mission('may', 1, 'Stop Soviet smuggling', '소련 밀수 차단'),
      mission('may', 2, "Find Sabik's subordinate agents", '사빅 수하 공작원 찾기'),
      mission('may', 3, 'Wiretap the control center', '관제소 도청')
    ],
    unidentifiedTargetCities: [hiddenRegionSetup('south-america', 1)],
    eventCardIdsAvailable: mayEventCardIds,
    legacyCardIdsApplied: []
  },
  june: {
    month: 'june',
    name: monthLabels.june,
    missions: [
      mission('june', 1, 'Stop the third Soviet test', '소련 3차 시험 저지'),
      {
        ...mission('june', 2, "Infiltrate Sabik's safehouse", '사빅의 안전가옥 잠입'),
        description: {
          en: "In Mexico City, spend 1 action in the basement of Sabik's safehouse to discard 3 neutral City cards. Record only whether the mission succeeded.",
          ko: '멕시코시티에 있는 사빅의 안전가옥 내 지하실에서, 행동 기회 1회를 소모하여 중립 도시 카드 3장을 버립니다. 임무 성공 여부만 기록합니다.'
        }
      },
      mission('june', 3, 'Wiretap the control center', '관제소 도청')
    ],
    unidentifiedTargetCities: [revealedRegionSetup('europe', 4), hiddenRegionSetup('asia', 1)],
    eventCardIdsAvailable: juneEventCardIds,
    legacyCardIdsApplied: []
  },
  july: {
    month: 'july',
    name: monthLabels.july,
    missions: [
      {
        ...mission('july', 1, 'Stop the defector from leaking secrets', '기밀을 빼돌리려는 망명자 저지'),
        description: {
          en: 'This mission does not affect the deck counter.',
          ko: '이 임무는 덱 카운터와 무관합니다.'
        }
      },
      {
        ...mission('july', 2, 'Stop Sabik from taking revenge on Soviet officers', '소련 장교들에게 복수하려는 사빅 저지'),
        description: {
          en: 'Acquire targets in Warsaw and Madrid at the same time.',
          ko: '바르샤바, 마드리드 2곳에서 동시에 표적을 확보합니다.'
        }
      },
      {
        ...mission('july', 3, 'Wiretap the control center', '관제소 도청'),
        description: {
          en: 'Acquire a target in 1 unidentified city in Africa.',
          ko: '아프리카 내 미식별 도시 1곳에서 표적을 확보합니다.'
        }
      }
    ],
    unidentifiedTargetCities: [
      {
        enabled: true,
        filter: { type: 'city-ids', value: ['warsaw', 'madrid'] },
        hiddenRemovedCount: 0,
        revealedRemovedCount: 2,
        warningWhenChanged: defaultSetupWarning
      },
      hiddenRegionSetup('africa', 1)
    ],
    eventCardIdsAvailable: julyEventCardIds,
    surveillanceSatelliteRegions: defaultSurveillanceSatelliteRegions,
    legacyCardIdsApplied: ['legacy-surveillance-satellite-cards']
  },
  august: {
    month: 'august',
    name: monthLabels.august,
    missions: [
      {
        ...mission('august', 1, 'Stop the fourth Soviet test', '소련 4차 시험 저지'),
        description: {
          en: 'Prevent tests in 1 to 4 test target cities in Asia at the same time.',
          ko: '아시아 내 시험 대상 도시 1~4곳에서 동시에 시험을 저지합니다.'
        }
      },
      {
        ...mission('august', 2, "Infiltrate Sabik's headquarters", '사빅의 작전본부 잠입'),
        description: {
          en: 'This mission does not affect the deck counter.',
          ko: '이 임무는 덱 카운터와 무관합니다.'
        }
      },
      {
        ...mission('august', 3, 'Wiretap the control center', '관제소 도청'),
        description: {
          en: 'Acquire a target in 1 unidentified city in North America.',
          ko: '북아메리카 내 미식별 도시 1곳에서 표적을 확보합니다.'
        }
      }
    ],
    unidentifiedTargetCities: [revealedRegionSetup('asia', 4), hiddenRegionSetup('north-america', 1)],
    eventCardIdsAvailable: julyEventCardIds,
    surveillanceSatelliteRegions: defaultSurveillanceSatelliteRegions,
    legacyCardIdsApplied: ['legacy-surveillance-satellite-cards']
  },
  september: {
    ...placeholderDefaults('september'),
    eventCardIdsAvailable: julyEventCardIds,
    surveillanceSatelliteRegions: defaultSurveillanceSatelliteRegions,
    legacyCardIdsApplied: ['legacy-surveillance-satellite-cards']
  },
  october: {
    ...placeholderDefaults('october'),
    eventCardIdsAvailable: julyEventCardIds,
    surveillanceSatelliteRegions: defaultSurveillanceSatelliteRegions,
    legacyCardIdsApplied: ['legacy-surveillance-satellite-cards']
  },
  november: {
    ...placeholderDefaults('november'),
    eventCardIdsAvailable: julyEventCardIds,
    surveillanceSatelliteRegions: defaultSurveillanceSatelliteRegions,
    legacyCardIdsApplied: ['legacy-surveillance-satellite-cards']
  },
  december: {
    ...placeholderDefaults('december'),
    eventCardIdsAvailable: julyEventCardIds,
    surveillanceSatelliteRegions: defaultSurveillanceSatelliteRegions,
    legacyCardIdsApplied: ['legacy-surveillance-satellite-cards']
  }
};
