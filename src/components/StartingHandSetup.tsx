import { useEffect, useMemo, useState } from 'react';
import type { CityCard, EventCard, LanguageCode } from '../types/cards';
import type { PlayerProfile } from '../types/campaign';
import type { PlayerDeckState, StartingHandAssignment } from '../types/deck';

interface Props {
  state: PlayerDeckState;
  players: PlayerProfile[];
  cityCards: CityCard[];
  eventCards: EventCard[];
  language: LanguageCode;
  onConfigure: (assignments: StartingHandAssignment[]) => void;
}

export function StartingHandSetup({ state, players, cityCards, eventCards, language, onConfigure }: Props) {
  const selectableCards = useMemo(() => [...cityCards, ...eventCards], [cityCards, eventCards]);
  const configuredAssignments = useMemo(() => Object.values(state.cardStates)
    .filter((card) => card.zone === 'player-hand' && card.ownerPlayerId)
    .map((card) => ({ cardId: card.cardId, playerId: card.ownerPlayerId! })), [state.cardStates]);
  const [assignments, setAssignments] = useState<StartingHandAssignment[]>(configuredAssignments);
  const [editing, setEditing] = useState(!state.startingHand.configured);

  useEffect(() => {
    setAssignments(configuredAssignments);
    setEditing(!state.startingHand.configured);
  }, [configuredAssignments, state.startingHand.configured]);

  const slots = players.flatMap((player) => Array.from({ length: state.startingHand.requiredPerPlayer }, (_, index) => ({ player, index })));
  const selected = new Set(assignments.map((assignment) => assignment.cardId));
  const cardName = (cardId: string) => selectableCards.find((card) => card.id === cardId)?.name[language] ?? cardId;

  const setSlot = (slotIndex: number, cardId: string) => {
    setAssignments((current) => {
      const next = current.filter((_, index) => index !== slotIndex);
      if (cardId) next.splice(slotIndex, 0, { cardId, playerId: slots[slotIndex].player.id });
      return next.map((assignment, index) => ({ ...assignment, playerId: slots[index]?.player.id ?? assignment.playerId }));
    });
  };

  return (
    <section className="card starting-hand-card">
      <div className="section-heading">
        <h2>{language === 'ko' ? '시작 손패 기록' : 'Starting hands'}</h2>
        {state.startingHand.configured && <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? (language === 'ko' ? '접기' : 'Collapse') : (language === 'ko' ? '수정' : 'Edit')}</button>}
      </div>
      <p className="muted">{assignments.length}/{state.startingHand.requiredTotal}</p>
      {!editing ? (
        <div className="hand-summary-grid">
          {players.map((player) => (
            <div key={player.id}>
              <strong>{player.name}</strong>
              <span>{configuredAssignments.filter((assignment) => assignment.playerId === player.id).map((assignment) => cardName(assignment.cardId)).join(', ') || '-'}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="starting-hand-grid">
            {slots.map(({ player, index }, slotIndex) => {
              const value = assignments[slotIndex]?.cardId ?? '';
              return (
                <label key={`${player.id}-${index}`}>
                  <span>{player.name} #{index + 1}</span>
                  <select value={value} onChange={(event) => setSlot(slotIndex, event.target.value)}>
                    <option value="">{language === 'ko' ? '카드 선택' : 'Select card'}</option>
                    {selectableCards.map((card) => (
                      <option key={card.id} value={card.id} disabled={selected.has(card.id) && value !== card.id}>{card.name[language]}</option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <button type="button" disabled={assignments.length !== state.startingHand.requiredTotal} onClick={() => onConfigure(assignments)}>{language === 'ko' ? '시작 손패 저장' : 'Save starting hands'}</button>
        </>
      )}
    </section>
  );
}