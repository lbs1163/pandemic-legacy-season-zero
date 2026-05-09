import type { UiText } from '../i18n/uiText';
import type { CampaignState } from '../types/campaign';
import type { LanguageCode } from '../types/cards';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import { threatCards } from '../data/cards/threats';
import type { PlayerCardDestination } from '../types/deck';
import type { PlayerDrawSelection } from '../domain/turnFlow';
import type { RuleToggle } from '../types/rules';
import { PlayerDeckPanel } from './PlayerDeckPanel';
import { ThreatDeckPanel } from './ThreatDeckPanel';
import { TurnFlowPanel } from './TurnFlowPanel';
import { EventCardsPanel } from './EventCardsPanel';
import { Button } from './ui/button';

interface Props {
  campaign: CampaignState;
  rules: RuleToggle[];
  language: LanguageCode;
  text: UiText;
  onCompletePlayerDraw: (selections: PlayerDrawSelection[]) => void;
  onCompleteThreatDraw: (cardIds: string[]) => void;
  onPlayerDraw: (cardId: string, destination: PlayerCardDestination) => void;
  onResolveEscalation: () => void;
  onOpenMonthSetup: () => void;
  onOpenGameResult: () => void;
  onApplyEventEffect: (eventCardId: string, targetCardId?: string) => void;
}

export function DeckCounterDashboard(props: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-4 xl:col-span-2">
          <div>
            <h2 className="font-semibold">{props.language === 'ko' ? '현재 캠페인 월' : 'Current campaign month'}</h2>
            <p className="text-sm text-muted-foreground">{props.campaign.progress.currentMonth} · {props.language === 'ko' ? `${props.campaign.progress.currentAttempt}번째 시도` : `Attempt ${props.campaign.progress.currentAttempt}`} · {props.language === 'ko' ? '자금' : 'Funding'} {props.campaign.progress.fundingLevel}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={props.onOpenMonthSetup}>{props.language === 'ko' ? '현재 월 준비' : 'Set up month'}</Button>
            <Button type="button" onClick={props.onOpenGameResult}>{props.language === 'ko' ? '결과 기록' : 'Record result'}</Button>
          </div>
        </section>
        <TurnFlowPanel campaign={props.campaign} language={props.language} cityCards={cityCards} eventCards={eventCards} threatCards={threatCards} onCompletePlayerDraw={props.onCompletePlayerDraw} onCompleteThreatDraw={props.onCompleteThreatDraw} />
        <EventCardsPanel campaign={props.campaign} language={props.language} onApplyEventEffect={props.onApplyEventEffect} />
        <PlayerDeckPanel state={props.campaign.playerDeck} text={props.text} language={props.language} cityCards={cityCards} eventCards={eventCards} onDrawKnown={props.onPlayerDraw} onResolveEscalation={props.onResolveEscalation} />
        <ThreatDeckPanel
          state={props.campaign.threatDeck}
          text={props.text}
          language={props.language}
          cityCards={cityCards}
          threatCards={threatCards}
        />
    </div>
  );
}
