import type { UiText } from '../i18n/uiText';
import type { CampaignState } from '../types/campaign';
import type { LanguageCode } from '../types/cards';
import type { RuleToggle } from '../types/rules';
import { calculateDeckCounterSummary } from '../domain/probabilities';
import { PlayerDeckPanel } from './PlayerDeckPanel';
import { ThreatDeckPanel } from './ThreatDeckPanel';
import { RuleTogglePanel } from './RuleTogglePanel';
import { RuleReferencePanel } from './RuleReferencePanel';

interface Props {
  campaign: CampaignState;
  rules: RuleToggle[];
  language: LanguageCode;
  text: UiText;
  onPlayerDraw: () => void;
  onResolveEscalation: () => void;
  onThreatDraw: () => void;
  onThreatBottomToDiscard: () => void;
  onThreatBottomToGameEnd: () => void;
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
        <PlayerDeckPanel state={props.campaign.playerDeck} text={props.text} onDrawKnown={props.onPlayerDraw} onResolveEscalation={props.onResolveEscalation} />
        <ThreatDeckPanel
          state={props.campaign.threatDeck}
          text={props.text}
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
