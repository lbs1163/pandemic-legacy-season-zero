import { useMemo, useState } from 'react';
import type { UiText } from '../i18n/uiText';
import type { CityCard, LanguageCode, ThreatCard } from '../types/cards';
import type { ThreatDeckState } from '../types/deck';
import { getThreatDeckUnknownCount } from '../domain/threatDeck';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

interface Props {
  state: ThreatDeckState;
  text: UiText;
  language: LanguageCode;
  cityCards: CityCard[];
  threatCards: ThreatCard[];
}

export function ThreatDeckPanel({ state, text, language, cityCards, threatCards }: Props) {
  const [remainingSearch, setRemainingSearch] = useState('');
  const cityMap = useMemo(() => new Map(cityCards.map((card) => [card.id, card])), [cityCards]);
  const threatMap = useMemo(() => new Map(threatCards.map((card) => [card.id, card])), [threatCards]);
  const unknownCards = useMemo(() => threatCards.filter((card) => state.cardStates[card.id]?.zone === 'threat-deck-unknown'), [state.cardStates, threatCards]);
  const sortByLocalizedCityName = (cards: ThreatCard[]) => [...cards].sort((a, b) => {
    const aName = cityMap.get(a.cityCardId)?.name[language] ?? a.id;
    const bName = cityMap.get(b.cityCardId)?.name[language] ?? b.id;
    return aName.localeCompare(bName, language === 'ko' ? 'ko-KR' : 'en-US');
  });
  const normalizedRemainingSearch = remainingSearch.trim().toLocaleLowerCase();
  const matchesSearch = (card: ThreatCard) => {
    if (!normalizedRemainingSearch) return true;
    const city = cityMap.get(card.cityCardId);
    const localizedName = city?.name[language] ?? '';
    const englishName = city?.name.en ?? '';
    const koreanName = city?.name.ko ?? '';
    return [localizedName, englishName, koreanName, card.id, card.cityCardId]
      .some((value) => value.toLocaleLowerCase().includes(normalizedRemainingSearch));
  };
  const cardLabel = (cardId: string) => {
    const threat = threatMap.get(cardId);
    const city = threat ? cityMap.get(threat.cityCardId) : undefined;
    return city?.name[language] ?? cardId;
  };
  const knownTopStacks = useMemo(() => {
    if (state.knownTopStacks?.length) return state.knownTopStacks.filter((stack) => stack.length > 0);
    return state.knownTopStackCardIds.length ? [state.knownTopStackCardIds] : [];
  }, [state.knownTopStackCardIds, state.knownTopStacks]);
  const cardIdsToThreatCards = (cardIds: string[]) => cardIds.map((cardId) => threatMap.get(cardId)).filter((card): card is ThreatCard => Boolean(card));
  const searchSections = useMemo(() => {
    const sections = [
      ...knownTopStacks.map((stack, index) => ({
        id: `known-top-stack-${index}`,
        title: language === 'ko' ? `알려진 상단 묶음 ${index + 1}` : `Known top stack ${index + 1}`,
        description: index === 0
          ? (language === 'ko' ? '가장 먼저 공개될 묶음' : 'Will be revealed first')
          : (language === 'ko' ? `${index + 1}번째로 공개될 묶음` : `Will be revealed after stack ${index}`),
        cards: cardIdsToThreatCards(stack)
      })),
      {
        id: 'unknown-threat-deck',
        title: language === 'ko' ? '미지 위협 덱' : 'Unknown Threat deck',
        description: language === 'ko' ? '순서가 알려지지 않은 남은 카드' : 'Remaining cards in unknown order',
        cards: sortByLocalizedCityName(unknownCards)
      },
      {
        id: 'threat-discard',
        title: text.discard,
        description: language === 'ko' ? '현재 버림더미' : 'Current discard pile',
        cards: cardIdsToThreatCards(state.discardCardIds)
      },
      {
        id: 'threat-game-end-area',
        title: text.gameEndArea,
        description: language === 'ko' ? '게임 종료 후 버림더미로 이동할 카드' : 'Cards to move to discard after the game',
        cards: cardIdsToThreatCards(state.gameEndAreaCardIds)
      },
      {
        id: 'threat-removed',
        title: language === 'ko' ? '제거됨' : 'Removed',
        description: language === 'ko' ? '위협 덱에서 제거된 카드' : 'Cards removed from the Threat deck',
        cards: cardIdsToThreatCards(state.removedCardIds)
      }
    ];
    return sections.map((section) => ({
      ...section,
      cards: section.cards.filter(matchesSearch)
    }));
  }, [knownTopStacks, language, text.discard, text.gameEndArea, unknownCards, state.discardCardIds, state.gameEndAreaCardIds, state.removedCardIds, threatMap, normalizedRemainingSearch]);
  const totalSearchableCount = searchSections.reduce((total, section) => total + section.cards.length, 0);
  const totalCardCount = threatCards.filter((card) => state.cardStates[card.id]?.zone !== undefined).length;
  const hasSearchResults = totalSearchableCount > 0;
  const isSearchMatchKnown = normalizedRemainingSearch && searchSections.some((section) => section.id.startsWith('known-top-stack') && section.cards.length > 0);
  const isSearchMatchUnknown = normalizedRemainingSearch && searchSections.some((section) => section.id === 'unknown-threat-deck' && section.cards.length > 0);
  const isSearchMatchOutOfDeck = normalizedRemainingSearch && searchSections.some((section) => !section.id.startsWith('known-top-stack') && section.id !== 'unknown-threat-deck' && section.cards.length > 0);
  const searchStatus = (() => {
    if (!normalizedRemainingSearch) return undefined;
    if (isSearchMatchKnown) return language === 'ko' ? '알려진 상단 묶음에 있습니다.' : 'This card is in a known top stack.';
    if (isSearchMatchUnknown) return language === 'ko' ? '미지 위협 덱에 있습니다.' : 'This card is in the unknown Threat deck.';
    if (isSearchMatchOutOfDeck) return language === 'ko' ? '현재 공개/제거된 구역에 있습니다.' : 'This card is currently in a revealed or removed zone.';
    return language === 'ko' ? '어느 구역에도 없습니다.' : 'This card is not in any tracked zone.';
  })();
  const searchStatusClassName = normalizedRemainingSearch && hasSearchResults ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-destructive';
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
              <strong>{totalSearchableCount}</strong>
              <span className="text-muted-foreground"> / {totalCardCount}</span>
            </div>
          </div>
          {normalizedRemainingSearch ? (
            <p className={searchStatusClassName}>{searchStatus}</p>
          ) : null}
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {searchSections.map((section) => (
              <section key={section.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <strong className="block">{section.title}</strong>
                    <span className="text-sm text-muted-foreground">{section.description}</span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{section.cards.length}</span>
                </div>
                {section.cards.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {section.cards.map((card, index) => {
                      const city = cityMap.get(card.cityCardId);
                      return (
                        <div key={card.id} className="rounded-lg border bg-background p-3">
                          <strong className="block">{city?.name[language] ?? card.id}</strong>
                          <span className="text-sm text-muted-foreground">
                            {section.id.startsWith('known-top-stack')
                              ? (language === 'ko' ? '알려진 상단 셔플 묶음' : 'Known shuffled top stack')
                              : (language === 'ko' ? '위협 카드' : 'Threat card')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{language === 'ko' ? '표시할 카드가 없습니다.' : 'No cards to show.'}</p>
                )}
              </section>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{text.knownTop}: {state.knownTopStackCardIds.map(cardLabel).join(', ') || text.none}</p>
      </CardContent>
    </Card>
  );
}
