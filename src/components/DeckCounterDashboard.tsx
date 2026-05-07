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

interface Props {
  campaign: CampaignState;
  rules: RuleToggle[];
  language: LanguageCode;
  text: UiText;
  onCompletePlayerDraw: (selections: PlayerDrawSelection[]) => void;
  onCompleteThreatDraw: (cardIds: string[]) => void;
  onPlayerDraw: (cardId: string, destination: PlayerCardDestination) => void;
  onResolveEscalation: () => void;
  onThreatDraw: (cardId: string) => void;
  onThreatBottomToDiscard: (cardId: string) => void;
  onThreatBottomToGameEnd: (cardId: string) => void;
  onThreatIntensify: () => void;
  onCleanupGameEnd: () => void;
}

export function DeckCounterDashboard(props: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
        <TurnFlowPanel campaign={props.campaign} language={props.language} cityCards={cityCards} eventCards={eventCards} threatCards={threatCards} onCompletePlayerDraw={props.onCompletePlayerDraw} onCompleteThreatDraw={props.onCompleteThreatDraw} />
        <PlayerDeckPanel state={props.campaign.playerDeck} text={props.text} language={props.language} cityCards={cityCards} eventCards={eventCards} onDrawKnown={props.onPlayerDraw} onResolveEscalation={props.onResolveEscalation} />
        <ThreatDeckPanel
          state={props.campaign.threatDeck}
          text={props.text}
          language={props.language}
          cityCards={cityCards}
          threatCards={threatCards}
          onDraw={props.onThreatDraw}
          onBottomToDiscard={props.onThreatBottomToDiscard}
          onBottomToGameEnd={props.onThreatBottomToGameEnd}
          onIntensify={props.onThreatIntensify}
          onCleanupGameEnd={props.onCleanupGameEnd}
        />
    </div>
  );
}
