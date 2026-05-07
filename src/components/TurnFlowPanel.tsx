import { useEffect, useMemo, useState } from 'react';
import { escalationCards } from '../data/cards/escalations';
import { getThreatLevel } from '../domain/threatDeck';
import type { CampaignState } from '../types/campaign';
import type { CityCard, EventCard, LanguageCode, ThreatCard } from '../types/cards';
import type { PlayerDrawSelection } from '../domain/turnFlow';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { SearchableSelect } from './SearchableSelect';

interface Props {
  campaign: CampaignState;
  language: LanguageCode;
  cityCards: CityCard[];
  eventCards: EventCard[];
  threatCards: ThreatCard[];
  onCompletePlayerDraw: (selections: PlayerDrawSelection[]) => void;
  onCompleteThreatDraw: (cardIds: string[]) => void;
}

interface PlayerDrawSlotState {
  cardId: string;
  bottomThreatCardId: string;
}

const emptyPlayerDrawSlots = (): PlayerDrawSlotState[] => [
  { cardId: '', bottomThreatCardId: '' },
  { cardId: '', bottomThreatCardId: '' }
];

export function TurnFlowPanel({ campaign, language, cityCards, eventCards, threatCards, onCompletePlayerDraw, onCompleteThreatDraw }: Props) {
  const step = campaign.turnFlow?.step ?? 'player-draw';
  const turnNumber = campaign.turnFlow?.turnNumber ?? 1;
  const [playerSlots, setPlayerSlots] = useState<PlayerDrawSlotState[]>(emptyPlayerDrawSlots);
  const threatLevel = getThreatLevel(campaign.threatDeck);
  const [threatSlots, setThreatSlots] = useState<string[]>(Array.from({ length: threatLevel }, () => ''));

  useEffect(() => {
    if (step === 'threat-draw') {
      setThreatSlots((current) => Array.from({ length: threatLevel }, (_, index) => current[index] ?? ''));
    }
  }, [step, threatLevel]);

  const cityMap = useMemo(() => new Map(cityCards.map((card) => [card.id, card])), [cityCards]);
  const threatMap = useMemo(() => new Map(threatCards.map((card) => [card.id, card])), [threatCards]);
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
  const playerDrawReady = playerSlots.every((slot) => slot.cardId && (!isEscalation(slot.cardId) || slot.bottomThreatCardId));
  const threatDrawReady = threatSlots.length === threatLevel && threatSlots.every(Boolean);

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

  return (
    <Card className="xl:col-span-2">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '현재 단계' : 'Current step'}</span><strong className="block text-xl">{step === 'player-draw' ? (language === 'ko' ? '플레이어 카드 2장 드로우' : 'Draw 2 Player cards') : (language === 'ko' ? '위협 카드 공개' : 'Reveal Threat cards')}</strong></div>
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '위협 수준' : 'Threat level'}</span><strong className="block text-xl">{threatLevel}</strong></div>
          <div className="rounded-lg bg-muted p-3"><span className="text-sm text-muted-foreground">{language === 'ko' ? '위협 마커 칸' : 'Threat marker space'}</span><strong className="block text-xl">{(campaign.threatDeck.threatLevelIndex ?? 0) + 1}/6</strong></div>
        </div>

        {step === 'player-draw' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{language === 'ko' ? '플레이어 카드 2장을 순서대로 선택하세요. 악화 카드가 있으면 각 악화마다 위협 덱 맨 아래에서 공개한 카드를 함께 선택합니다.' : 'Select exactly 2 Player deck cards in order. For each Escalation, also select the Threat card revealed from the bottom of the Threat deck.'}</p>
            {playerSlots.map((slot, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-2">
                <SearchableSelect
                  value={slot.cardId}
                  placeholder={language === 'ko' ? `${index + 1}번째 플레이어 카드` : `Player card ${index + 1}`}
                  searchPlaceholder={language === 'ko' ? '플레이어 카드 검색...' : 'Search Player cards...'}
                  options={playerOptions}
                  onChange={(cardId) => updatePlayerSlot(index, { cardId, bottomThreatCardId: '' })}
                />
                {isEscalation(slot.cardId) ? (
                  <SearchableSelect
                    value={slot.bottomThreatCardId}
                    placeholder={language === 'ko' ? '맨 아래 위협 카드 선택' : 'Select bottom Threat card'}
                    searchPlaceholder={language === 'ko' ? '위협 카드 검색...' : 'Search Threat cards...'}
                    options={unknownThreatOptions}
                    onChange={(bottomThreatCardId) => updatePlayerSlot(index, { bottomThreatCardId })}
                  />
                ) : <span className="self-center text-sm text-muted-foreground">{language === 'ko' ? '도시/이벤트는 손패로 기록됩니다.' : 'City/Event cards are recorded to hand.'}</span>}
              </div>
            ))}
            <Button onClick={submitPlayerDraw} disabled={!playerDrawReady}>{language === 'ko' ? '플레이어 드로우 완료 → 위협 공개 단계' : 'Complete Player draw → Threat reveal'}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{language === 'ko' ? `현재 위협 수준 ${threatLevel}에 따라 위협 카드 ${threatLevel}장을 공개하세요. 알려진 상단 묶음이 있으면 그 카드부터 공개해야 합니다.` : `Reveal ${threatLevel} Threat cards for the current Threat level. Known top-stack cards must be revealed first.`}</p>
            {threatSlots.map((cardId, index) => {
              const forcedKnownCardId = campaign.threatDeck.knownTopStackCardIds[index];
              const options = forcedKnownCardId
                ? [{ value: forcedKnownCardId, label: threatLabel(forcedKnownCardId), description: language === 'ko' ? '알려진 상단 카드' : 'Known top card' }]
                : unknownThreatOptions.map((option) => ({ ...option, description: language === 'ko' ? '위협 카드' : 'Threat card' }));
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