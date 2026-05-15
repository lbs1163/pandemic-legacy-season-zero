import type { ThreatCard } from '../../types/cards';
import { cityCards } from './cities';

export const threatCards: ThreatCard[] = cityCards.map((city) => ({
  id: `threat-${city.id}`,
  kind: 'threat',
  threatCardType: 'threat',
  cityCardId: city.id,
  name: { en: `${city.name.en} Threat`, ko: `${city.name.ko} 위협` },
  incidentEffect: { en: 'Incident effect placeholder; verify during play.', ko: '사건 효과 확인 필요.' }
}));

export const infectionCards: ThreatCard[] = cityCards.map((city) => ({
  id: `infection-${city.id}`,
  kind: 'threat',
  threatCardType: 'infection',
  cityCardId: city.id,
  name: { en: `${city.name.en} Infection`, ko: `${city.name.ko} 감염` },
  incidentEffect: {
    en: `Place 1 disease cube in ${city.name.en}.`,
    ko: `${city.name.ko}에 질병 큐브 1개를 놓습니다.`
  }
}));

export function getInfectionCardIdForCity(cityCardId: string): string {
  return `infection-${cityCardId}`;
}

export function getThreatCardsForCampaign(infectionCardIds: string[] = []): ThreatCard[] {
  const infectionCardIdSet = new Set(infectionCardIds);
  return [...threatCards, ...infectionCards.filter((card) => infectionCardIdSet.has(card.id))];
}
