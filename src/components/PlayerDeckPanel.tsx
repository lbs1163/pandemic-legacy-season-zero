import type { UiText } from '../i18n/uiText';
import type { CityCard, EventCard, LanguageCode } from '../types/cards';
import type { PlayerCardDestination, PlayerDeckState } from '../types/deck';
import { calculateCurrentPileEscalationRisk, calculatePlayerDeckComposition } from '../domain/probabilities';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { NativeSelect } from './ui/native-select';
import { SearchableSelect } from './SearchableSelect';

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
  const cityMap = useMemo(() => new Map(cityCards.map((card) => [card.id, card])), [cityCards]);
  const drawOptions = useMemo(() => drawableCards.map((card) => {
    const city = cityMap.get(card.id);
    return {
      value: card.id,
      label: card.name[language],
      description: city
        ? `${regionLabels[language][city.region]} · ${affiliationLabels[language][city.affiliation]}`
        : (language === 'ko' ? '이벤트' : 'Event')
    };
  }), [cityMap, drawableCards, language]);
  return (
    <Card>
      <CardHeader><CardTitle>{text.playerDeck}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.remaining}</span><strong className="block text-2xl">{state.piles.reduce((sum, pile) => sum + pile.remainingUnknownCount, 0)}</strong></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.currentPile}</span><strong className="block text-2xl">{currentPile?.id ?? '-'}</strong></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.escalationRisk}</span><strong className="block text-2xl">{risk}%</strong></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '남은 이벤트' : 'Events left'}</span><strong className="block text-2xl">{composition.remainingEvents}</strong></div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1 rounded-lg border p-3">
          <strong>{language === 'ko' ? '대륙별 남은 도시' : 'Cities by region'}</strong>
          {Object.entries(composition.remainingByRegion).map(([region, count]) => <span key={region}>{regionLabels[language][region as keyof typeof regionLabels.ko]}: {count}</span>)}
        </div>
        <div className="grid gap-1 rounded-lg border p-3">
          <strong>{language === 'ko' ? '진영별 남은 도시' : 'Cities by affiliation'}</strong>
          {Object.entries(composition.remainingByAffiliation).map(([affiliation, count]) => <span key={affiliation}>{affiliationLabels[language][affiliation as keyof typeof affiliationLabels.ko]}: {count}</span>)}
        </div>
      </div>
      <div className="grid gap-2">
        {state.piles.map((pile, index) => (
          <div key={pile.id} className={index === state.currentPileIndex ? 'grid grid-cols-[5rem_5rem_1fr] gap-2 rounded-lg border border-accent bg-accent/10 p-3' : 'grid grid-cols-[5rem_5rem_1fr] gap-2 rounded-lg border p-3'}>
            <strong>{pile.id}</strong>
            <span>{pile.remainingUnknownCount}/{pile.initialUnknownCount}</span>
            <span>{pile.escalationResolved ? text.escalationResolved : text.escalationHidden}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <SearchableSelect
          className="max-w-xs"
          value={selectedCardId}
          placeholder={language === 'ko' ? '뽑은 카드 선택' : 'Select drawn card'}
          searchPlaceholder={language === 'ko' ? '카드 검색...' : 'Search cards...'}
          emptyText={language === 'ko' ? '카드가 없습니다.' : 'No cards found.'}
          options={drawOptions}
          onChange={setSelectedCardId}
        />
        <NativeSelect className="max-w-xs" value={destination} onChange={(event) => setDestination(event.target.value as PlayerCardDestination)}>
          <option value="player-hand">{language === 'ko' ? '손패' : 'Hand'}</option>
          <option value="player-discard">{language === 'ko' ? '버림' : 'Discard'}</option>
          <option value="player-removed">{language === 'ko' ? '제거' : 'Removed'}</option>
        </NativeSelect>
        <Button onClick={() => { if (selectedCardId) { onDrawKnown(selectedCardId, destination); setSelectedCardId(''); } }} disabled={!selectedCardId}>{text.recordKnownDraw}</Button>
        <Button variant="secondary" onClick={onResolveEscalation} disabled={!currentPile || currentPile.escalationResolved}>{text.resolveCurrentEscalation}</Button>
      </div>
      </CardContent>
    </Card>
  );
}
