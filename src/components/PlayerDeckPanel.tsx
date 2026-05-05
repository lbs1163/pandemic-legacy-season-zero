import type { UiText } from '../i18n/uiText';
import type { CityCard, EventCard, LanguageCode } from '../types/cards';
import type { PlayerDeckState } from '../types/deck';
import type { PlayerCardDestination } from '../types/deck';
import { calculateCurrentPileEscalationRisk, calculatePlayerDeckComposition } from '../domain/probabilities';
import { useMemo, useState } from 'react';

interface Props {
  state: PlayerDeckState;
  text: UiText;
  language: LanguageCode;
  cityCards: CityCard[];
  eventCards: EventCard[];
  onDrawKnown: (cardId: string, destination: PlayerCardDestination) => void;
  onResolveEscalation: () => void;
}

const regionLabels = {
  en: { 'north-america': 'North America', 'south-america': 'South America', europe: 'Europe', africa: 'Africa', asia: 'Asia', pacific: 'Pacific' },
  ko: { 'north-america': '북미', 'south-america': '남미', europe: '유럽', africa: '아프리카', asia: '아시아', pacific: '태평양' }
} as const;

const affiliationLabels = {
  en: { allied: 'Allied', neutral: 'Neutral', soviet: 'Soviet' },
  ko: { allied: '서방연합', neutral: '중립', soviet: '소련' }
} as const;

export function PlayerDeckPanel({ state, text, language, cityCards, eventCards, onDrawKnown, onResolveEscalation }: Props) {
  const [selectedCardId, setSelectedCardId] = useState('');
  const [destination, setDestination] = useState<PlayerCardDestination>('player-discard');
  const currentPile = state.piles[state.currentPileIndex];
  const risk = Math.round(calculateCurrentPileEscalationRisk(state) * 100);
  const composition = useMemo(() => calculatePlayerDeckComposition(state, cityCards, eventCards), [cityCards, eventCards, state]);
  const drawableCards = useMemo(() => [...cityCards, ...eventCards].filter((card) => state.cardStates[card.id]?.zone === 'player-deck-unknown'), [cityCards, eventCards, state.cardStates]);
  return (
    <section className="card">
      <h2>{text.playerDeck}</h2>
      <div className="stat-grid">
        <div><span>{text.remaining}</span><strong>{state.piles.reduce((sum, pile) => sum + pile.remainingUnknownCount, 0)}</strong></div>
        <div><span>{text.currentPile}</span><strong>{currentPile?.id ?? '-'}</strong></div>
        <div><span>{text.escalationRisk}</span><strong>{risk}%</strong></div>
        <div><span>{language === 'ko' ? '남은 이벤트' : 'Events left'}</span><strong>{composition.remainingEvents}</strong></div>
      </div>
      <div className="composition-grid">
        <div>
          <strong>{language === 'ko' ? '대륙별 남은 도시' : 'Cities by region'}</strong>
          {Object.entries(composition.remainingByRegion).map(([region, count]) => <span key={region}>{regionLabels[language][region as keyof typeof regionLabels.ko]}: {count}</span>)}
        </div>
        <div>
          <strong>{language === 'ko' ? '진영별 남은 도시' : 'Cities by affiliation'}</strong>
          {Object.entries(composition.remainingByAffiliation).map(([affiliation, count]) => <span key={affiliation}>{affiliationLabels[language][affiliation as keyof typeof affiliationLabels.ko]}: {count}</span>)}
        </div>
      </div>
      <div className="pile-list">
        {state.piles.map((pile, index) => (
          <div key={pile.id} className={index === state.currentPileIndex ? 'pile active' : 'pile'}>
            <strong>{pile.id}</strong>
            <span>{pile.remainingUnknownCount}/{pile.initialUnknownCount}</span>
            <span>{pile.escalationResolved ? text.escalationResolved : text.escalationHidden}</span>
          </div>
        ))}
      </div>
      <div className="row wrap">
        <select value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)}>
          <option value="">{language === 'ko' ? '뽑은 카드 선택' : 'Select drawn card'}</option>
          {drawableCards.map((card) => <option key={card.id} value={card.id}>{card.name[language]}</option>)}
        </select>
        <select value={destination} onChange={(event) => setDestination(event.target.value as PlayerCardDestination)}>
          <option value="player-hand">{language === 'ko' ? '손패' : 'Hand'}</option>
          <option value="player-discard">{language === 'ko' ? '버림' : 'Discard'}</option>
          <option value="player-removed">{language === 'ko' ? '제거' : 'Removed'}</option>
        </select>
        <button onClick={() => { if (selectedCardId) { onDrawKnown(selectedCardId, destination); setSelectedCardId(''); } }} disabled={!selectedCardId}>{text.recordKnownDraw}</button>
        <button onClick={onResolveEscalation} disabled={!currentPile || currentPile.escalationResolved}>{text.resolveCurrentEscalation}</button>
      </div>
    </section>
  );
}
