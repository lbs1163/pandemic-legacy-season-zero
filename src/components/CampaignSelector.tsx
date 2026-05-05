import type { UiText } from '../i18n/uiText';
import type { CampaignState } from '../types/campaign';

interface Props {
  campaigns: CampaignState[];
  activeCampaignId?: string;
  text: UiText;
  onSelect: (campaignId: string) => void;
  onCreate: () => void;
}

export function CampaignSelector({ campaigns, activeCampaignId, text, onSelect, onCreate }: Props) {
  return (
    <section className="card">
      <h2>{text.campaign}</h2>
      <div className="row">
        <select value={activeCampaignId ?? ''} onChange={(event) => onSelect(event.target.value)}>
          <option value="" disabled>{text.noCampaignSelected}</option>
          {campaigns.map((campaign) => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.campaignName}</option>)}
        </select>
        <button onClick={onCreate}>{text.newCampaign}</button>
      </div>
    </section>
  );
}
