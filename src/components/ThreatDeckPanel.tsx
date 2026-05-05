import { useMemo, useState } from 'react';
import { calculateThreatCityProbabilities } from '../domain/probabilities';
import type { UiText } from '../i18n/uiText';
import type { CityCard, LanguageCode, ThreatCard } from '../types/cards';
import type { ThreatDeckState } from '../types/deck';
import { getThreatDeckUnknownCount } from '../domain/threatDeck';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
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
  const [drawCount, setDrawCount] = useState(2);
  const cityMap = useMemo(() => new Map(cityCards.map((card) => [card.id, card])), [cityCards]);
  const threatMap = useMemo(() => new Map(threatCards.map((card) => [card.id, card])), [threatCards]);
  const unknownCards = useMemo(() => threatCards.filter((card) => state.cardStates[card.id]?.zone === 'threat-deck-unknown'), [state.cardStates, threatCards]);
  const probabilities = useMemo(() => calculateThreatCityProbabilities(state, threatCards, drawCount), [drawCount, state, threatCards]);
  const formatter = useMemo(() => new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { style: 'percent', maximumFractionDigits: 1 }), [language]);
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
        <label className="flex max-w-xs items-center gap-2 text-sm font-semibold"><span>{language === 'ko' ? '확률 드로우 수' : 'Probability draws'}</span><Input className="w-24" type="number" min={1} max={6} value={drawCount} onChange={(event) => setDrawCount(Math.max(1, Number(event.target.value) || 1))} /></label>
        <Table>
          <TableHeader><TableRow><TableHead>{language === 'ko' ? '도시' : 'City'}</TableHead><TableHead>{language === 'ko' ? '1장 이상' : 'At least one'}</TableHead>{Array.from({ length: drawCount }, (_, index) => <TableHead key={index}>{index + 1}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {probabilities.map((probability) => {
              const city = cityMap.get(probability.cityCardId);
              return <TableRow key={probability.cityCardId}><TableCell>{city?.name[language] ?? probability.cityCardId}</TableCell><TableCell>{formatter.format(probability.atLeastOne)}</TableCell>{Array.from({ length: drawCount }, (_, index) => <TableCell key={index}>{formatter.format(probability.probs.find((entry) => entry.draw === index + 1)?.probability ?? 0)}</TableCell>)}</TableRow>;
            })}
          </TableBody>
        </Table>
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
