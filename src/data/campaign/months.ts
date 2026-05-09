import type { CampaignMonthId } from '../../types/campaign';
import type { MonthSetupDefaults } from '../../types/campaignSetup';

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

const mission = (month: CampaignMonthId, index: number, en: string, ko: string) => ({
  id: `${month}-mission-${index}`,
  month,
  name: { en, ko },
  defaultResult: false
});

const placeholderDefaults = (month: CampaignMonthId): MonthSetupDefaults => ({
  month,
  name: monthLabels[month],
  missions: [],
  eventCardIdsAvailable: [],
  legacyCardIdsApplied: []
});

export const monthSetupDefaults: Record<CampaignMonthId, MonthSetupDefaults> = {
  prologue: {
    month: 'prologue',
    name: monthLabels.prologue,
    defaultFundingLevel: 4,
    missions: [
      mission('prologue', 1, 'Acquire Project MEDUSA sample', '메두사 프로젝트 샘플 입수'),
      mission('prologue', 2, 'Search for Agent Sabik', '사빅 요원 수색')
    ],
    unidentifiedTargetCities: [hiddenRegionSetup('europe', 1)],
    eventCardIdsAvailable: [
      'event-counterintelligence-team',
      'event-government-grant-placeholder',
      'event-one-quiet-night-placeholder',
      'event-resilient-population-placeholder',
      'event-special-orders-placeholder'
    ],
    legacyCardIdsApplied: []
  },
  january: {
    month: 'january',
    name: monthLabels.january,
    missions: [
      mission('january', 1, 'Interrogate Soviet scientist', '소련 과학자 취조'),
      mission('january', 2, 'Find Agent Sabik', '사빅 요원 찾기')
    ],
    unidentifiedTargetCities: [hiddenRegionSetup('asia', 1)],
    eventCardIdsAvailable: [
      'event-counterintelligence-team',
      'event-government-grant-placeholder',
      'event-one-quiet-night-placeholder',
      'event-resilient-population-placeholder',
      'event-special-orders-placeholder'
    ],
    legacyCardIdsApplied: []
  },
  february: {
    month: 'february',
    name: monthLabels.february,
    missions: [
      mission('february', 1, 'Stop the first Soviet test', '소련 1차 시험 저지'),
      mission('february', 2, 'Investigate Soviet scientist', '소련 과학자 조사')
    ],
    unidentifiedTargetCities: [hiddenRegionSetup('africa', 3), hiddenRegionSetup('north-america', 1)],
    eventCardIdsAvailable: [
      'event-counterintelligence-team',
      'event-government-grant-placeholder',
      'event-one-quiet-night-placeholder',
      'event-resilient-population-placeholder',
      'event-special-orders-placeholder',
      'event-february-1-placeholder',
      'event-february-2-placeholder',
      'event-february-3-placeholder',
      'event-february-4-placeholder'
    ],
    legacyCardIdsApplied: []
  },
  march: placeholderDefaults('march'),
  april: placeholderDefaults('april'),
  may: placeholderDefaults('may'),
  june: placeholderDefaults('june'),
  july: placeholderDefaults('july'),
  august: placeholderDefaults('august'),
  september: placeholderDefaults('september'),
  october: placeholderDefaults('october'),
  november: placeholderDefaults('november'),
  december: placeholderDefaults('december')
};