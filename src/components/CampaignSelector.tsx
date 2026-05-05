import type { UiText } from '../i18n/uiText';
import type { CampaignState } from '../types/campaign';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { NativeSelect } from './ui/native-select';

interface Props {
  campaigns: CampaignState[];
  activeCampaignId?: string;
  text: UiText;
  onSelect: (campaignId: string) => void;
  onCreate: () => void;
}

export function CampaignSelector({ campaigns, activeCampaignId, text, onSelect, onCreate }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>{text.campaign}</CardTitle></CardHeader>
      <CardContent>
      <div className="flex flex-wrap gap-2">
        <NativeSelect className="max-w-sm" value={activeCampaignId ?? ''} onChange={(event) => onSelect(event.target.value)}>
          <option value="" disabled>{text.noCampaignSelected}</option>
          {campaigns.map((campaign) => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.campaignName}</option>)}
        </NativeSelect>
        <Button onClick={onCreate}>{text.newCampaign}</Button>
      </div>
      </CardContent>
    </Card>
  );
}
