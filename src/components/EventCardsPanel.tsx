import { useMemo, useState } from 'react';
import { getDefaultAvailableEventCardsForMonth } from '../domain/campaignProgress';
import { threatCards } from '../data/cards/threats';
import { cityCards } from '../data/cards/cities';
import type { LanguageCode } from '../types/cards';
import type { CampaignState } from '../types/campaign';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { NativeSelect } from './ui/native-select';

interface Props {
  campaign: CampaignState;
  language: LanguageCode;
  onApplyEventEffect: (eventCardId: string, targetCardId?: string) => void;
}

function threatLabel(threatCardId: string, language: LanguageCode): string {
  const threat = threatCards.find((card) => card.id === threatCardId);
  const city = threat ? cityCards.find((card) => card.id === threat.cityCardId) : undefined;
  return city?.name[language] ?? threat?.name[language] ?? threatCardId;
}

export function EventCardsPanel({ campaign, language, onApplyEventEffect }: Props) {
  const cards = useMemo(() => getDefaultAvailableEventCardsForMonth(campaign.progress.currentMonth), [campaign.progress.currentMonth]);
  const discardCardIds = campaign.threatDeck.discardCardIds;
  const [targetByEvent, setTargetByEvent] = useState<Record<string, string>>({});
  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'ko' ? '사용 가능한 이벤트 카드' : 'Available event cards'}</CardTitle>
        <CardDescription>{language === 'ko' ? '현재 월 기준으로 사용 가능한 이벤트와 지원되는 효과입니다.' : 'Events available for the current month and supported effects.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.map((card) => {
          const target = targetByEvent[card.id] ?? discardCardIds[0] ?? '';
          const isSupported = card.effect?.kind === 'move-threat-discard-to-game-end';
          return (
            <div key={card.id} className="rounded-lg border p-3">
              <div className="font-semibold">{card.name[language]}</div>
              <p className="text-sm text-muted-foreground">{card.effect?.description[language] ?? card.notes?.[language]}</p>
              {isSupported ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <NativeSelect className="min-w-64" value={target} onChange={(event) => setTargetByEvent((current) => ({ ...current, [card.id]: event.target.value }))} disabled={discardCardIds.length === 0}>
                    {discardCardIds.length === 0 ? <option value="">{language === 'ko' ? '버린 위협 카드 없음' : 'No discarded Threat cards'}</option> : null}
                    {discardCardIds.map((cardId) => <option key={cardId} value={cardId}>{threatLabel(cardId, language)}</option>)}
                  </NativeSelect>
                  <Button type="button" disabled={!target} onClick={() => onApplyEventEffect(card.id, target)}>{language === 'ko' ? '효과 적용' : 'Apply effect'}</Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}