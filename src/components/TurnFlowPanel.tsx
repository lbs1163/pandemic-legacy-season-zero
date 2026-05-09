import { useEffect, useMemo, useState } from 'react';
import { escalationCards } from '../data/cards/escalations';
import { getThreatLevel } from '../domain/threatDeck';
import type { CampaignState } from '../types/campaign';
import type { CityCard, EventCard, LanguageCode, ThreatCard } from '../types/cards';
import type { PlayerDrawSelection } from '../domain/turnFlow';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { NativeSelect } from './ui/native-select';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  campaign: CampaignState;
  language: LanguageCode;
  cityCards: CityCard[];
  eventCards: EventCard[];
  threatCards: ThreatCard[];
  onCompletePlayerDraw: (selections: PlayerDrawSelection[]) => void;
  onCompleteThreatDraw: (cardIds: string[]) => void;
  onApplyEventEffect: (eventCardId: string, targetCardId?: string) => void;
}

interface PlayerDrawSlotState {
  cardId: string;
  bottomThreatCardId: string;
}

const emptyPlayerDrawSlots = (): PlayerDrawSlotState[] => [
  { cardId: '', bottomThreatCardId: '' },
  { cardId: '', bottomThreatCardId: '' }
];

export function TurnFlowPanel({ campaign, language, cityCards, eventCards, threatCards, onCompletePlayerDraw, onCompleteThreatDraw, onApplyEventEffect }: Props) {
  const step = campaign.turnFlow?.step ?? 'player-draw';
  const turnNumber = campaign.turnFlow?.turnNumber ?? 1;
  const [playerSlots, setPlayerSlots] = useState<PlayerDrawSlotState[]>(emptyPlayerDrawSlots);
  const [targetByEvent, setTargetByEvent] = useState<Record<string, string>>({});
  const threatLevel = getThreatLevel(campaign.threatDeck);
  const [threatSlots, setThreatSlots] = useState<string[]>(Array.from({ length: threatLevel }, () => ''));

  useEffect(() => {
    if (step === 'threat-draw') {
      setThreatSlots((current) => Array.from({ length: threatLevel }, (_, index) => current[index] ?? ''));
    }
  }, [step, threatLevel]);

  const cityMap = useMemo(() => new Map(cityCards.map((card) => [card.id, card])), [cityCards]);
  const threatMap = useMemo(() => new Map(threatCards.map((card) => [card.id, card])), [threatCards]);
  const handEventCards = useMemo(() => eventCards.filter((card) => campaign.playerDeck.cardStates[card.id]?.zone === 'player-hand'), [campaign.playerDeck.cardStates, eventCards]);
  const playerOptions = useMemo(() => {
    const drawablePlayerCards = [...cityCards, ...eventCards]
      .filter((card) => campaign.playerDeck.cardStates[card.id]?.zone === 'player-deck-unknown')
      .map((card) => ({
        value: card.id,
        label: card.name[language],
        description: card.kind === 'city' ? (language === 'ko' ? '도시 카드' : 'City card') : (language === 'ko' ? '이벤트 카드' : 'Event card')
      }));
    const drawableEscalations = escalationCards
      .filter((card) => campaign.playerDeck.cardStates[card.id]?.zone === 'player-deck-unknown')
      .map((card) => ({ value: card.id, label: card.name[language], description: language === 'ko' ? '악화 카드' : 'Escalation card' }));
    return [...drawablePlayerCards, ...drawableEscalations];
  }, [campaign.playerDeck.cardStates, cityCards, eventCards, language]);
  const unknownThreatOptions = useMemo(() => threatCards
    .filter((card) => campaign.threatDeck.cardStates[card.id]?.zone === 'threat-deck-unknown')
    .map((card) => ({
      value: card.id,
      label: cityMap.get(card.cityCardId)?.name[language] ?? card.id,
      description: language === 'ko' ? '위협 덱 맨 아래 공개 카드' : 'Bottom Threat card'
    })), [campaign.threatDeck.cardStates, cityMap, language, threatCards]);
  const threatLabel = (cardId: string) => {
    const threat = threatMap.get(cardId);
    return threat ? cityMap.get(threat.cityCardId)?.name[language] ?? cardId : cardId;
  };
  const isEscalation = (cardId: string) => escalationCards.some((card) => card.id === cardId);
  const playerCardIdsSelectedByOtherSlots = (index: number) => new Set(playerSlots
    .map((slot, slotIndex) => slotIndex === index ? '' : slot.cardId)
    .filter(Boolean));
  const bottomThreatCardIdsSelectedByOtherSlots = (index: number) => new Set(playerSlots
    .map((slot, slotIndex) => slotIndex === index ? '' : slot.bottomThreatCardId)
    .filter(Boolean));
  const threatCardIdsSelectedByOtherSlots = (index: number) => new Set(threatSlots
    .map((cardId, slotIndex) => slotIndex === index ? '' : cardId)
    .filter(Boolean));
  const knownTopStacks = useMemo(() => {
    if (campaign.threatDeck.knownTopStacks?.length) return campaign.threatDeck.knownTopStacks.filter((stack) => stack.length > 0);
    return campaign.threatDeck.knownTopStackCardIds.length ? [campaign.threatDeck.knownTopStackCardIds] : [];
  }, [campaign.threatDeck.knownTopStackCardIds, campaign.threatDeck.knownTopStacks]);
  const playerDrawReady = playerSlots.every((slot) => slot.cardId && (!isEscalation(slot.cardId) || slot.bottomThreatCardId));
  const threatDrawReady = threatSlots.length === threatLevel && threatSlots.every(Boolean);
  const discardCardIds = campaign.threatDeck.discardCardIds;

  function getCurrentKnownStackOptions(index: number) {
    const selectedBefore = new Set(threatSlots.slice(0, index).filter(Boolean));
    for (const stack of knownTopStacks) {
      const remainingStackCardIds = stack.filter((knownCardId) => !selectedBefore.has(knownCardId));
      if (remainingStackCardIds.length > 0) {
        return remainingStackCardIds.map((knownCardId) => ({
          value: knownCardId,
          label: threatLabel(knownCardId),
          description: language === 'ko' ? '알려진 상단 셔플 묶음' : 'Known shuffled top stack'
        }));
      }
    }
    return [];
  }

  function updatePlayerSlot(index: number, value: Partial<PlayerDrawSlotState>) {
    setPlayerSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...value } : slot));
  }

  function submitPlayerDraw() {
    const selections: PlayerDrawSelection[] = playerSlots.map((slot) => isEscalation(slot.cardId)
      ? { kind: 'escalation', cardId: slot.cardId, bottomThreatCardId: slot.bottomThreatCardId }
      : { kind: 'player-card', cardId: slot.cardId, destination: 'player-hand' });
    onCompletePlayerDraw(selections);
    setPlayerSlots(emptyPlayerDrawSlots());
    setThreatSlots([]);
  }

  function submitThreatDraw() {
    onCompleteThreatDraw(threatSlots);
    setThreatSlots(Array.from({ length: threatLevel }, () => ''));
  }

  const title = language === 'ko' ? `턴 ${turnNumber} 진행` : `Turn ${turnNumber} flow`;
  const eventHandSection = (
    <section className="space-y-3 rounded-lg border p-3">
      <div>
        <h3 className="font-semibold">{language === 'ko' ? '손패 이벤트 카드' : 'Event cards in hand'}</h3>
        <p className="text-sm text-muted-foreground">{language === 'ko' ? '현재 손패에 있는 이벤트 카드만 표시합니다. 지원되는 효과는 여기서 바로 적용할 수 있습니다.' : 'Only event cards currently in hand are shown. Supported effects can be applied here.'}</p>
      </div>
      {handEventCards.length ? handEventCards.map((card) => {
        const target = targetByEvent[card.id] ?? discardCardIds[0] ?? '';
        const isSupported = card.effect?.kind === 'move-threat-discard-to-game-end';
        return <div key={card.id} className="rounded-lg bg-muted/50 p-3">
          <div className="font-semibold">{card.name[language]}</div>
          <p className="text-sm text-muted-foreground">{card.effect?.description[language] ?? card.notes?.[language]}</p>
          {isSupported ? <div className="mt-3 flex flex-wrap gap-2">
            <NativeSelect className="min-w-64" value={target} onChange={(event) => setTargetByEvent((current) => ({ ...current, [card.id]: event.target.value }))} disabled={discardCardIds.length === 0}>
              {discardCardIds.length === 0 ? <option value="">{language === 'ko' ? '버린 위협 카드 없음' : 'No discarded Threat cards'}</option> : null}
              {discardCardIds.map((cardId) => <option key={cardId} value={cardId}>{threatLabel(cardId)}</option>)}
            </NativeSelect>
            <Button type="button" disabled={!target} onClick={() => onApplyEventEffect(card.id, target)}>{language === 'ko' ? '효과 적용' : 'Apply effect'}</Button>
          </div> : <p className="mt-2 text-xs text-muted-foreground">{language === 'ko' ? '자동 적용 지원 전: 카드 효과를 수동으로 처리하세요.' : 'Automation not supported yet: resolve this card manually.'}</p>}
        </div>;
      }) : <p className="text-sm text-muted-foreground">{language === 'ko' ? '현재 손패에 이벤트 카드가 없습니다.' : 'No event cards are currently in hand.'}</p>}
    </section>
  );

  return (
    <Card className="xl:col-span-2">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '현재 단계' : 'Current step'}</span><strong className="block text-xl">{step === 'player-draw' ? (language === 'ko' ? '플레이어 카드 2장 드로우' : 'Draw 2 Player cards') : (language === 'ko' ? '위협 카드 공개' : 'Reveal Threat cards')}</strong></div>
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '위협 수준' : 'Threat level'}</span><strong className="block text-xl">{threatLevel}</strong></div>
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '위협 마커 칸' : 'Threat marker space'}</span><strong className="block text-xl">{(campaign.threatDeck.threatLevelIndex ?? 0) + 1}/6</strong></div>
        </div>

        {eventHandSection}

        {step === 'player-draw' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{language === 'ko' ? '플레이어 카드 2장을 순서대로 선택하세요. 악화 카드가 있으면 각 악화마다 위협 덱 맨 아래에서 공개한 카드를 함께 선택합니다.' : 'Select exactly 2 Player deck cards in order. For each Escalation, also select the Threat card revealed from the bottom of the Threat deck.'}</p>
            {playerSlots.map((slot, index) => {
              const selectedPlayerCardIds = playerCardIdsSelectedByOtherSlots(index);
              const selectedBottomThreatCardIds = bottomThreatCardIdsSelectedByOtherSlots(index);
              const availablePlayerOptions = playerOptions.filter((option) => !selectedPlayerCardIds.has(option.value));
              const availableBottomThreatOptions = unknownThreatOptions.filter((option) => !selectedBottomThreatCardIds.has(option.value));
              return (
                <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-2">
                  <SearchableSelect
                    value={slot.cardId}
                    placeholder={language === 'ko' ? `${index + 1}번째 플레이어 카드` : `Player card ${index + 1}`}
                    searchPlaceholder={language === 'ko' ? '플레이어 카드 검색...' : 'Search Player cards...'}
                    options={availablePlayerOptions}
                    onChange={(cardId) => updatePlayerSlot(index, { cardId, bottomThreatCardId: '' })}
                  />
                  {isEscalation(slot.cardId) ? (
                    <SearchableSelect
                      value={slot.bottomThreatCardId}
                      placeholder={language === 'ko' ? '맨 아래 위협 카드 선택' : 'Select bottom Threat card'}
                      searchPlaceholder={language === 'ko' ? '위협 카드 검색...' : 'Search Threat cards...'}
                      options={availableBottomThreatOptions}
                      onChange={(bottomThreatCardId) => updatePlayerSlot(index, { bottomThreatCardId })}
                    />
                  ) : <span className="self-center text-sm text-muted-foreground">{language === 'ko' ? '도시/이벤트는 손패로 기록됩니다.' : 'City/Event cards are recorded to hand.'}</span>}
                </div>
              );
            })}
            <Button onClick={submitPlayerDraw} disabled={!playerDrawReady}>{language === 'ko' ? '플레이어 드로우 완료 → 위협 공개 단계' : 'Complete Player draw → Threat reveal'}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{language === 'ko' ? `현재 위협 수준 ${threatLevel}에 따라 위협 카드 ${threatLevel}장을 공개하세요. 알려진 상단 묶음이 있으면 해당 셔플 묶음 안에서 실제 공개된 카드를 선택하세요.` : `Reveal ${threatLevel} Threat cards for the current Threat level. If there is a known top stack, choose the card actually revealed from that shuffled stack.`}</p>
            {threatSlots.map((cardId, index) => {
              const currentKnownStackOptions = getCurrentKnownStackOptions(index);
              const options = currentKnownStackOptions.length > 0
                ? currentKnownStackOptions
                : unknownThreatOptions
                  .filter((option) => !threatCardIdsSelectedByOtherSlots(index).has(option.value))
                  .map((option) => ({ ...option, description: language === 'ko' ? '위협 카드' : 'Threat card' }));
              const selectedThreat = threatMap.get(cardId);
              return (
                <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr]">
                  <SearchableSelect
                    value={cardId}
                    placeholder={language === 'ko' ? `${index + 1}번째 위협 카드` : `Threat card ${index + 1}`}
                    searchPlaceholder={language === 'ko' ? '위협 카드 검색...' : 'Search Threat cards...'}
                    options={options}
                    onChange={(nextCardId) => setThreatSlots((current) => current.map((value, slotIndex) => slotIndex === index ? nextCardId : value))}
                  />
                  <span className="text-sm text-muted-foreground">{selectedThreat?.incidentEffect?.[language] ?? (language === 'ko' ? '사건 효과를 확인하세요.' : 'Check incident effect.')}</span>
                </div>
              );
            })}
            <Button onClick={submitThreatDraw} disabled={!threatDrawReady}>{language === 'ko' ? '위협 공개 완료 → 다음 턴' : 'Complete Threat reveal → Next turn'}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}