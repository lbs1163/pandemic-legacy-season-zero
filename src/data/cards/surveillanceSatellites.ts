import type { Region, SurveillanceSatelliteCard } from '../../types/cards';

export const surveillanceSatelliteRegionNames: Record<Region, { en: string; ko: string }> = {
  asia: { en: 'Asia', ko: '아시아' },
  'south-america': { en: 'South America', ko: '남아메리카' },
  pacific: { en: 'Pacific Rim', ko: '환태평양' },
  africa: { en: 'Africa', ko: '아프리카' },
  'north-america': { en: 'North America', ko: '북아메리카' },
  europe: { en: 'Europe', ko: '유럽' }
};

const satelliteFor = (region: Region): SurveillanceSatelliteCard => ({
  id: `surveillance-satellite-${region}`,
  kind: 'surveillance-satellite',
  region,
  name: {
    en: `Launch surveillance satellite over ${surveillanceSatelliteRegionNames[region].en}`,
    ko: `${surveillanceSatelliteRegionNames[region].ko} 상공으로 감시위성 발사`
  }
});

export const surveillanceSatelliteCards: SurveillanceSatelliteCard[] = [
  satelliteFor('asia'),
  satelliteFor('south-america'),
  satelliteFor('pacific'),
  satelliteFor('africa'),
  satelliteFor('north-america'),
  satelliteFor('europe')
];

export function getSurveillanceSatelliteCardIdForRegion(region: Region): string {
  return `surveillance-satellite-${region}`;
}