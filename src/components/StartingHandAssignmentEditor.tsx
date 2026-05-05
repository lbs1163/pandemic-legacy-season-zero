import { useMemo } from 'react';
import type { CityCard, EventCard, LanguageCode } from '../types/cards';
import type { PlayerProfile } from '../types/campaign';
import type { StartingHandAssignment } from '../types/deck';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  players: PlayerProfile[];
  requiredPerPlayer: number;
  selectedAssignments: StartingHandAssignment[];
  cityCards: CityCard[];
  eventCards: EventCard[];
  language: LanguageCode;
  onChange: (assignments: StartingHandAssignment[]) => void;
}

export function StartingHandAssignmentEditor({
  players,
  requiredPerPlayer,
  selectedAssignments,
  cityCards,
  eventCards,
  language,
  onChange
}: Props) {
  const selectableCards = useMemo(() => [...cityCards, ...eventCards], [cityCards, eventCards]);
  const options = useMemo(() => selectableCards.map((card) => ({
    value: card.id,
    label: card.name[language],
    description: card.kind === 'city' ? (language === 'ko' ? '도시' : 'City') : (language === 'ko' ? '이벤트' : 'Event'),
    disabled: selectedAssignments.some((assignment) => assignment.cardId === card.id)
  })), [language, selectableCards, selectedAssignments]);
  const slots = useMemo(
    () => players.flatMap((player) => Array.from({ length: requiredPerPlayer }, (_, index) => ({ player, index }))),
    [players, requiredPerPlayer]
  );

  const setSlot = (slotIndex: number, cardId: string) => {
    const next = selectedAssignments.filter((_, index) => index !== slotIndex);
    if (cardId) next.splice(slotIndex, 0, { cardId, playerId: slots[slotIndex].player.id });
    onChange(next.map((assignment, index) => ({ ...assignment, playerId: slots[index]?.player.id ?? assignment.playerId })));
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {slots.map(({ player, index }, slotIndex) => {
        const value = selectedAssignments[slotIndex]?.cardId ?? '';
        return (
          <label key={`${player.id}-${index}`} className="space-y-2 rounded-lg bg-muted p-3">
            <span className="text-sm font-semibold">{player.name} #{index + 1}</span>
            <SearchableSelect
              value={value}
              placeholder={language === 'ko' ? '카드 선택' : 'Select card'}
              searchPlaceholder={language === 'ko' ? '카드 검색...' : 'Search cards...'}
              emptyText={language === 'ko' ? '카드가 없습니다.' : 'No cards found.'}
              options={options.map((option) => ({ ...option, disabled: option.disabled && option.value !== value }))}
              onChange={(cardId) => setSlot(slotIndex, cardId)}
            />
          </label>
        );
      })}
    </div>
  );
}