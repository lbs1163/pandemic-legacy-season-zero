import type { UiText } from '../i18n/uiText';
import type { ThreatDeckState } from '../types/deck';

interface Props {
  state: ThreatDeckState;
  text: UiText;
  onDraw: () => void;
  onBottomToDiscard: () => void;
  onBottomToGameEnd: () => void;
  onIntensify: () => void;
  onCleanupGameEnd: () => void;
}

export function ThreatDeckPanel({ state, text, onDraw, onBottomToDiscard, onBottomToGameEnd, onIntensify, onCleanupGameEnd }: Props) {
  return (
    <section className="card">
      <h2>{text.threatDeck}</h2>
      <div className="stat-grid">
        <div><span>{text.unknownDrawPile}</span><strong>{state.unknownDrawPileCount}</strong></div>
        <div><span>{text.knownTopStack}</span><strong>{state.knownTopStackCardIds.length}</strong></div>
        <div><span>{text.discard}</span><strong>{state.discardCardIds.length}</strong></div>
        <div><span>{text.gameEndArea}</span><strong>{state.gameEndAreaCardIds.length}</strong></div>
      </div>
      <div className="row wrap">
        <button onClick={onDraw}>{text.drawThreat}</button>
        <button onClick={onBottomToDiscard}>{text.bottomDrawToDiscard}</button>
        <button onClick={onBottomToGameEnd}>{text.bottomDrawToGameEnd}</button>
        <button onClick={onIntensify} disabled={state.discardCardIds.length === 0}>{text.intensifyDiscard}</button>
        <button onClick={onCleanupGameEnd} disabled={state.gameEndAreaCardIds.length === 0}>{text.afterGameCleanup}</button>
      </div>
      <p className="muted">{text.knownTop}: {state.knownTopStackCardIds.join(', ') || text.none}</p>
    </section>
  );
}
