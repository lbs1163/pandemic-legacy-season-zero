import type { UiText } from '../i18n/uiText';
import type { CityCard, EventCard, LanguageCode, SurveillanceSatelliteCard } from '../types/cards';
import type { PlayerDeckState } from '../types/deck';
import { calculateCurrentPileEscalationRisk, calculatePlayerDeckComposition } from '../domain/probabilities';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  state: PlayerDeckState;
  text: UiText;
  language: LanguageCode;
  cityCards: CityCard[];
  eventCards: EventCard[];
  surveillanceSatelliteCards: SurveillanceSatelliteCard[];
}

const regionLabels = {
  en: { 'north-america': 'North America', 'south-america': 'South America', europe: 'Europe', africa: 'Africa', asia: 'Asia', pacific: 'Pacific' },
  ko: { 'north-america': '북미', 'south-america': '남미', europe: '유럽', africa: '아프리카', asia: '아시아', pacific: '태평양' }
} as const;

const affiliationLabels = {
  en: { allied: 'Allied', neutral: 'Neutral', soviet: 'Soviet' },
  ko: { allied: '서방연합', neutral: '중립', soviet: '소련' }
} as const;

export function PlayerDeckPanel({ state, text, language, cityCards, eventCards, surveillanceSatelliteCards }: Props) {
  const currentPile = state.piles[state.currentPileIndex];
  const risk = Math.round(calculateCurrentPileEscalationRisk(state) * 100);
  const composition = useMemo(() => calculatePlayerDeckComposition(state, cityCards, eventCards), [cityCards, eventCards, state]);
  const eventMap = useMemo(() => new Map(eventCards.map((card) => [card.id, card])), [eventCards]);
  const remainingEventCards = composition.remainingEventCardIds.map((cardId) => eventMap.get(cardId)).filter((card): card is EventCard => Boolean(card));
  const satelliteMap = useMemo(() => new Map(surveillanceSatelliteCards.map((card) => [card.id, card])), [surveillanceSatelliteCards]);
  const remainingSatelliteCards = Object.values(state.cardStates)
    .filter((cardState) => cardState.zone === 'player-deck-unknown')
    .map((cardState) => satelliteMap.get(cardState.cardId))
    .filter((card): card is SurveillanceSatelliteCard => Boolean(card));
  return (
    <Card>
      <CardHeader><CardTitle>{text.playerDeck}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.remaining}</span><strong className="block text-2xl">{state.piles.reduce((sum, pile) => sum + pile.remainingUnknownCount, 0)}</strong></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.currentPile}</span><strong className="block text-2xl">{currentPile?.id ?? '-'}</strong></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.escalationRisk}</span><strong className="block text-2xl">{risk}%</strong></div>
        <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '남은 감시위성' : 'Satellites left'}</span><strong className="block text-2xl">{composition.remainingSurveillanceSatellites}</strong></div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="grid gap-1 rounded-lg border p-3">
          <strong>{language === 'ko' ? '대륙별 남은 도시' : 'Cities by region'}</strong>
          {Object.entries(composition.remainingByRegion).map(([region, count]) => <span key={region}>{regionLabels[language][region as keyof typeof regionLabels.ko]}: {count}</span>)}
        </div>
        <div className="grid gap-1 rounded-lg border p-3">
          <strong>{language === 'ko' ? '진영별 남은 도시' : 'Cities by affiliation'}</strong>
          {Object.entries(composition.remainingByAffiliation).map(([affiliation, count]) => <span key={affiliation}>{affiliationLabels[language][affiliation as keyof typeof affiliationLabels.ko]}: {count}</span>)}
        </div>
        <div className="grid gap-2 rounded-lg border p-3">
          <strong>{language === 'ko' ? '남은 이벤트 카드' : 'Remaining event cards'}</strong>
          {remainingEventCards.length ? remainingEventCards.map((card) => {
            const description = card.effect?.description[language] ?? card.notes?.[language] ?? (language === 'ko' ? '효과 설명이 없습니다.' : 'No effect text.');
            return <span key={card.id} className="group relative w-fit rounded border px-2 py-1 text-sm" tabIndex={0} title={description}>{card.name[language]}<span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block group-focus:block">{description}</span></span>;
          }) : <span className="text-sm text-muted-foreground">{language === 'ko' ? '남은 이벤트 카드 없음' : 'No event cards left'}</span>}
        </div>
        <div className="grid gap-2 rounded-lg border p-3">
          <strong>{language === 'ko' ? '감시위성 카드 후보' : 'Surveillance Satellite card candidates'}</strong>
          {remainingSatelliteCards.length ? remainingSatelliteCards.map((card) => <span key={card.id} className="rounded border px-2 py-1 text-sm">{card.name[language]}</span>) : <span className="text-sm text-muted-foreground">{language === 'ko' ? '감시위성 카드 후보 없음' : 'No Surveillance Satellite card candidates'}</span>}
          {state.surveillanceSatelliteSetup?.configured ? <span className="text-xs text-muted-foreground">
            {language === 'ko'
              ? `후보 ${state.surveillanceSatelliteSetup.candidateCardIds.length}장 · 비공개 제외 ${state.surveillanceSatelliteSetup.hiddenRemovedCount}장`
              : `${state.surveillanceSatelliteSetup.candidateCardIds.length} candidates · ${state.surveillanceSatelliteSetup.hiddenRemovedCount} hidden removed`}
          </span> : null}
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
      </CardContent>
    </Card>
  );
}
