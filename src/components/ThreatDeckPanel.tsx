import { useMemo, useState } from 'react';
import type { UiText } from '../i18n/uiText';
import type { CityCard, LanguageCode, ThreatCard } from '../types/cards';
import type { ThreatDeckState } from '../types/deck';
import { getThreatDeckUnknownCount } from '../domain/threatDeck';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  state: ThreatDeckState;
  text: UiText;
  language: LanguageCode;
  cityCards: CityCard[];
  threatCards: ThreatCard[];
  onDraw: (cardId: string) => void;
  onBottomToDiscard: (cardId: string) => void;
  onBottomToGameEnd: (cardId: string) => void;
  onIntensify: () => void;
  onCleanupGameEnd: () => void;
}

export function ThreatDeckPanel({ state, text, language, cityCards, threatCards, onDraw, onBottomToDiscard, onBottomToGameEnd, onIntensify, onCleanupGameEnd }: Props) {
  const [selectedCardId, setSelectedCardId] = useState('');
  const [remainingSearch, setRemainingSearch] = useState('');
  const cityMap = useMemo(() => new Map(cityCards.map((card) => [card.id, card])), [cityCards]);
  const threatMap = useMemo(() => new Map(threatCards.map((card) => [card.id, card])), [threatCards]);
  const unknownCards = useMemo(() => threatCards.filter((card) => state.cardStates[card.id]?.zone === 'threat-deck-unknown'), [state.cardStates, threatCards]);
  const remainingCards = useMemo(() => [...unknownCards].sort((a, b) => {
    const aName = cityMap.get(a.cityCardId)?.name[language] ?? a.id;
    const bName = cityMap.get(b.cityCardId)?.name[language] ?? b.id;
    return aName.localeCompare(bName, language === 'ko' ? 'ko-KR' : 'en-US');
  }), [cityMap, language, unknownCards]);
  const normalizedRemainingSearch = remainingSearch.trim().toLocaleLowerCase();
  const filteredRemainingCards = useMemo(() => {
    if (!normalizedRemainingSearch) return remainingCards;
    return remainingCards.filter((card) => {
      const city = cityMap.get(card.cityCardId);
      const localizedName = city?.name[language] ?? '';
      const englishName = city?.name.en ?? '';
      const koreanName = city?.name.ko ?? '';
      return [localizedName, englishName, koreanName, card.id, card.cityCardId]
        .some((value) => value.toLocaleLowerCase().includes(normalizedRemainingSearch));
    });
  }, [cityMap, language, normalizedRemainingSearch, remainingCards]);
  const cardLabel = (cardId: string) => {
    const threat = threatMap.get(cardId);
    const city = threat ? cityMap.get(threat.cityCardId) : undefined;
    return city?.name[language] ?? cardId;
  };
  const execute = (handler: (cardId: string) => void) => {
    if (!selectedCardId) return;
    handler(selectedCardId);
    setSelectedCardId('');
  };
  const selectableThreats = state.knownTopStackCardIds.length
    ? state.knownTopStackCardIds.slice(0, 1).map((cardId) => threatMap.get(cardId)).filter((card): card is ThreatCard => Boolean(card))
    : unknownCards;
  const threatOptions = useMemo(() => selectableThreats.map((card) => {
    const city = cityMap.get(card.cityCardId);
    return {
      value: card.id,
      label: city?.name[language] ?? card.id,
      description: language === 'ko' ? '위협 카드' : 'Threat card'
    };
  }), [cityMap, language, selectableThreats]);

  return (
    <Card>
      <CardHeader><CardTitle>{text.threatDeck}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.unknownDrawPile}</span><strong className="block text-2xl">{getThreatDeckUnknownCount(state)}</strong></div>
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.knownTopStack}</span><strong className="block text-2xl">{state.knownTopStackCardIds.length}</strong></div>
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.discard}</span><strong className="block text-2xl">{state.discardCardIds.length}</strong></div>
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{text.gameEndArea}</span><strong className="block text-2xl">{state.gameEndAreaCardIds.length}</strong></div>
        </div>
        <div className="grid gap-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="grid flex-1 gap-1 text-sm font-semibold md:max-w-sm">
              <span>{language === 'ko' ? '남은 위협 카드 검색' : 'Search remaining threat cards'}</span>
              <Input value={remainingSearch} placeholder={language === 'ko' ? '도시 이름 입력...' : 'Enter a city name...'} onChange={(event) => setRemainingSearch(event.target.value)} />
            </label>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">{language === 'ko' ? '표시' : 'Showing'}</span>{' '}
              <strong>{filteredRemainingCards.length}</strong>
              <span className="text-muted-foreground"> / {remainingCards.length}</span>
            </div>
          </div>
          {normalizedRemainingSearch ? (
            <p className={filteredRemainingCards.length ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-destructive'}>
              {filteredRemainingCards.length
                ? (language === 'ko' ? '남은 카드에 있습니다.' : 'This card is still remaining.')
                : (language === 'ko' ? '남은 카드에 없습니다.' : 'This card is not in the remaining pile.')}
            </p>
          ) : null}
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {filteredRemainingCards.map((card) => {
              const city = cityMap.get(card.cityCardId);
              return (
                <div key={card.id} className="rounded-lg border bg-card p-3">
                  <strong className="block">{city?.name[language] ?? card.id}</strong>
                  <span className="text-sm text-muted-foreground">{language === 'ko' ? '위협 카드' : 'Threat card'}</span>
                </div>
              );
            })}
            {filteredRemainingCards.length === 0 ? <p className="text-sm text-muted-foreground">{language === 'ko' ? '표시할 남은 카드가 없습니다.' : 'No remaining cards to show.'}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchableSelect
            className="max-w-xs"
            value={selectedCardId}
            placeholder={language === 'ko' ? '위협 카드 선택' : 'Select threat card'}
            searchPlaceholder={language === 'ko' ? '도시 검색...' : 'Search cities...'}
            emptyText={language === 'ko' ? '위협 카드가 없습니다.' : 'No threat cards found.'}
            options={threatOptions}
            onChange={setSelectedCardId}
          />
          <Button onClick={() => execute(onDraw)} disabled={!selectedCardId}>{text.drawThreat}</Button>
          <Button variant="secondary" onClick={() => execute(onBottomToDiscard)} disabled={!selectedCardId || state.knownTopStackCardIds.length > 0}>{text.bottomDrawToDiscard}</Button>
          <Button variant="secondary" onClick={() => execute(onBottomToGameEnd)} disabled={!selectedCardId || state.knownTopStackCardIds.length > 0}>{text.bottomDrawToGameEnd}</Button>
          <Button variant="outline" onClick={onIntensify} disabled={state.discardCardIds.length === 0}>{text.intensifyDiscard}</Button>
          <Button variant="outline" onClick={onCleanupGameEnd} disabled={state.gameEndAreaCardIds.length === 0}>{text.afterGameCleanup}</Button>
        </div>
        <p className="text-sm text-muted-foreground">{text.knownTop}: {state.knownTopStackCardIds.map(cardLabel).join(', ') || text.none}</p>
      </CardContent>
    </Card>
  );
}
