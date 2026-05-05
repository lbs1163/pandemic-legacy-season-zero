import { useMemo, useState } from 'react';
import { calculateThreatCityProbabilities } from '../domain/probabilities';
import type { UiText } from '../i18n/uiText';
import type { CityCard, LanguageCode, ThreatCard } from '../types/cards';
import type { ThreatDeckState } from '../types/deck';
import { getThreatDeckUnknownCount } from '../domain/threatDeck';

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
  return (
    <section className="card">
      <h2>{text.threatDeck}</h2>
      <div className="stat-grid">
        <div><span>{text.unknownDrawPile}</span><strong>{getThreatDeckUnknownCount(state)}</strong></div>
        <div><span>{text.knownTopStack}</span><strong>{state.knownTopStackCardIds.length}</strong></div>
        <div><span>{text.discard}</span><strong>{state.discardCardIds.length}</strong></div>
        <div><span>{text.gameEndArea}</span><strong>{state.gameEndAreaCardIds.length}</strong></div>
      </div>
      <div className="row wrap">
        <label className="inline-label"><span>{language === 'ko' ? '확률 드로우 수' : 'Probability draws'}</span><input type="number" min={1} max={6} value={drawCount} onChange={(event) => setDrawCount(Math.max(1, Number(event.target.value) || 1))} /></label>
      </div>
      <div className="table-wrap">
        <table className="probability-table">
          <thead><tr><th>{language === 'ko' ? '도시' : 'City'}</th><th>{language === 'ko' ? '1장 이상' : 'At least one'}</th>{Array.from({ length: drawCount }, (_, index) => <th key={index}>{index + 1}</th>)}</tr></thead>
          <tbody>
            {probabilities.map((probability) => {
              const city = cityMap.get(probability.cityCardId);
              return <tr key={probability.cityCardId}><td>{city?.name[language] ?? probability.cityCardId}</td><td>{formatter.format(probability.atLeastOne)}</td>{Array.from({ length: drawCount }, (_, index) => <td key={index}>{formatter.format(probability.probs.find((entry) => entry.draw === index + 1)?.probability ?? 0)}</td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="row wrap">
        <select value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)}>
          <option value="">{language === 'ko' ? '위협 카드 선택' : 'Select threat card'}</option>
          {(state.knownTopStackCardIds.length ? state.knownTopStackCardIds.slice(0, 1).map((cardId) => threatMap.get(cardId)).filter((card): card is ThreatCard => Boolean(card)) : unknownCards).map((card) => <option key={card.id} value={card.id}>{cardLabel(card.id)}</option>)}
        </select>
        <button onClick={() => execute(onDraw)} disabled={!selectedCardId}>{text.drawThreat}</button>
        <button onClick={() => execute(onBottomToDiscard)} disabled={!selectedCardId || state.knownTopStackCardIds.length > 0}>{text.bottomDrawToDiscard}</button>
        <button onClick={() => execute(onBottomToGameEnd)} disabled={!selectedCardId || state.knownTopStackCardIds.length > 0}>{text.bottomDrawToGameEnd}</button>
        <button onClick={onIntensify} disabled={state.discardCardIds.length === 0}>{text.intensifyDiscard}</button>
        <button onClick={onCleanupGameEnd} disabled={state.gameEndAreaCardIds.length === 0}>{text.afterGameCleanup}</button>
      </div>
      <p className="muted">{text.knownTop}: {state.knownTopStackCardIds.map(cardLabel).join(', ') || text.none}</p>
    </section>
  );
}
