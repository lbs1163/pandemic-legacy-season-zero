import type { UiText } from '../i18n/uiText';
import type { CampaignState } from '../types/campaign';
import type { LanguageCode } from '../types/cards';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import { threatCards } from '../data/cards/threats';
import type { PlayerCardDestination, StartingHandAssignment } from '../types/deck';
import type { RuleToggle } from '../types/rules';
import { calculateDeckCounterSummary } from '../domain/probabilities';
import { PlayerDeckPanel } from './PlayerDeckPanel';
import { ThreatDeckPanel } from './ThreatDeckPanel';
import { RuleTogglePanel } from './RuleTogglePanel';
import { RuleReferencePanel } from './RuleReferencePanel';
import { StartingHandSetup } from './StartingHandSetup';

interface Props {
  campaign: CampaignState;
  rules: RuleToggle[];
  language: LanguageCode;
  text: UiText;
  onConfigureStartingHands: (assignments: StartingHandAssignment[]) => void;
  onPlayerDraw: (cardId: string, destination: PlayerCardDestination) => void;
  onResolveEscalation: () => void;
  onThreatDraw: (cardId: string) => void;
  onThreatBottomToDiscard: (cardId: string) => void;
  onThreatBottomToGameEnd: (cardId: string) => void;
  onThreatIntensify: () => void;
  onCleanupGameEnd: () => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
}

export function DeckCounterDashboard(props: Props) {
  const summary = calculateDeckCounterSummary(props.campaign);
  return (
    <>
      <section className="hero">
        <h1>{props.campaign.campaignName}</h1>
        <div className="summary-grid">
          <span>{props.text.playerRemaining}: <strong>{summary.playerDeckRemaining}</strong></span>
          <span>{props.text.escalationsUnresolved}: <strong>{summary.unresolvedEscalations}</strong></span>
          <span>{props.text.threatDiscard}: <strong>{summary.threatDiscardCount}</strong></span>
          <span>{props.text.gameEndArea}: <strong>{summary.gameEndAreaCount}</strong></span>
        </div>
      </section>
      <div className="dashboard-grid">
        <StartingHandSetup state={props.campaign.playerDeck} players={props.campaign.players} cityCards={cityCards} eventCards={eventCards} language={props.language} onConfigure={props.onConfigureStartingHands} />
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
        <RuleTogglePanel rules={props.rules} enabledMap={props.campaign.ruleToggles} language={props.language} text={props.text} onToggle={props.onToggleRule} />
        <RuleReferencePanel rules={props.rules} language={props.language} text={props.text} />
      </div>
    </>
  );
}
