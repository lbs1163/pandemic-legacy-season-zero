import type { ThreatCard } from '../../types/cards';
import { cityCards } from './cities';

export const threatCards: ThreatCard[] = cityCards.map((city) => ({
  id: `threat-${city.id}`,
  kind: 'threat',
  cityCardId: city.id,
  name: { en: `${city.name.en} Threat`, ko: `${city.name.ko} 위협` },
  incidentEffect: { en: 'Incident effect placeholder; verify during play.', ko: '사건 효과 확인 필요.' }
}));
