import type { UiText } from '../i18n/uiText';
import type { PlayerDeckState } from '../types/deck';
import { calculateCurrentPileEscalationRisk } from '../domain/probabilities';

interface Props {
  state: PlayerDeckState;
  text: UiText;
  onDrawKnown: () => void;
  onResolveEscalation: () => void;
}

export function PlayerDeckPanel({ state, text, onDrawKnown, onResolveEscalation }: Props) {
  const currentPile = state.piles[state.currentPileIndex];
  const risk = Math.round(calculateCurrentPileEscalationRisk(state) * 100);
  return (
    <section className="card">
      <h2>{text.playerDeck}</h2>
      <div className="stat-grid">
        <div><span>{text.remaining}</span><strong>{state.piles.reduce((sum, pile) => sum + pile.remainingUnknownCount, 0)}</strong></div>
        <div><span>{text.currentPile}</span><strong>{currentPile?.id ?? '-'}</strong></div>
        <div><span>{text.escalationRisk}</span><strong>{risk}%</strong></div>
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
      <div className="row">
        <button onClick={onDrawKnown}>{text.recordKnownDraw}</button>
        <button onClick={onResolveEscalation} disabled={!currentPile || currentPile.escalationResolved}>{text.resolveCurrentEscalation}</button>
      </div>
    </section>
  );
}
