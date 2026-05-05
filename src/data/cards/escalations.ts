import type { EscalationCard } from '../../types/cards';

export const escalationCards: EscalationCard[] = Array.from({ length: 5 }, (_, index) => ({
  id: `escalation-${index + 1}`,
  kind: 'escalation' as const,
  escalationNumber: index + 1,
  name: { en: `Escalation ${index + 1}`, ko: `에스컬레이션 ${index + 1}` }
}));
