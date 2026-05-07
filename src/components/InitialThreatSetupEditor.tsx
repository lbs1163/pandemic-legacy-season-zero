import { useMemo } from 'react';
import type { CityCard, LanguageCode, ThreatCard } from '../types/cards';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  selectedCardIds: string[];
  cityCards: CityCard[];
  threatCards: ThreatCard[];
  language: LanguageCode;
  onChange: (cardIds: string[]) => void;
}

const initialThreatSetupCount = 9;

export function InitialThreatSetupEditor({ selectedCardIds, cityCards, threatCards, language, onChange }: Props) {
  const cityMap = useMemo(() => new Map(cityCards.map((card) => [card.id, card])), [cityCards]);
  const options = useMemo(() => threatCards.map((card) => {
    const city = cityMap.get(card.cityCardId);
    return {
      value: card.id,
      label: city?.name[language] ?? card.name[language],
      description: language === 'ko' ? '위협 카드' : 'Threat card',
      disabled: selectedCardIds.includes(card.id)
    };
  }), [cityMap, language, selectedCardIds, threatCards]);
  const slots = useMemo(() => Array.from({ length: initialThreatSetupCount }, (_, index) => index), []);

  const setSlot = (slotIndex: number, cardId: string) => {
    const next = [...selectedCardIds];
    if (cardId) next[slotIndex] = cardId;
    else next.splice(slotIndex, 1);
    onChange(next.filter(Boolean));
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {slots.map((slotIndex) => {
        const value = selectedCardIds[slotIndex] ?? '';
        return (
          <label key={slotIndex} className="space-y-2 rounded-lg bg-muted p-3">
            <span className="text-sm font-semibold">{language === 'ko' ? `공개 위협 #${slotIndex + 1}` : `Revealed threat #${slotIndex + 1}`}</span>
            <SearchableSelect
              value={value}
              placeholder={language === 'ko' ? '위협 카드 선택' : 'Select threat card'}
              searchPlaceholder={language === 'ko' ? '도시 검색...' : 'Search cities...'}
              emptyText={language === 'ko' ? '위협 카드가 없습니다.' : 'No threat cards found.'}
              options={options.map((option) => ({ ...option, disabled: option.disabled && option.value !== value }))}
              onChange={(cardId) => setSlot(slotIndex, cardId)}
            />
          </label>
        );
      })}
    </div>
  );
}