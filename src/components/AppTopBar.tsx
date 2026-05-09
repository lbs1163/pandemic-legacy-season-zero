import { Settings } from 'lucide-react';
import type { UiText } from '../i18n/uiText';
import type { CampaignState } from '../types/campaign';
import type { LanguageCode } from '../types/cards';
import type { AuthState } from '../types/sync';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { NativeSelect } from './ui/native-select';

interface Props {
  campaigns: CampaignState[];
  activeCampaignId?: string;
  language: LanguageCode;
  text: UiText;
  auth: AuthState;
  dirty: boolean;
  onSelectCampaign: (campaignId: string) => void;
  onCreateCampaign: () => void;
  onChangeLanguage: (language: LanguageCode) => void;
  onStartSignIn: () => void;
  onSignOut: () => void;
  onPull: () => void;
  onPush: () => void;
  onOpenRuleOptions: () => void;
  onResetStorage: () => void;
  onOpenStartingHands: () => void;
  onOpenMonthSetup: () => void;
  onOpenGameResult: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function AppTopBar({
  campaigns,
  activeCampaignId,
  language,
  text,
  auth,
  dirty,
  onSelectCampaign,
  onCreateCampaign,
  onChangeLanguage,
  onStartSignIn,
  onSignOut,
  onPull,
  onPush,
  onOpenRuleOptions,
  onResetStorage,
  onOpenStartingHands,
  onOpenMonthSetup,
  onOpenGameResult,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight md:text-xl">{text.appEyebrow}</h1>
        </div>
        <NativeSelect className="w-48" value={activeCampaignId ?? ''} onChange={(event) => onSelectCampaign(event.target.value)}>
          <option value="" disabled>{text.noCampaignSelected}</option>
          {campaigns.map((campaign) => <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.campaignName}</option>)}
        </NativeSelect>
        <NativeSelect className="w-32" value={language} onChange={(event) => onChangeLanguage(event.target.value as LanguageCode)}>
          <option value="en">{text.english}</option>
          <option value="ko">{text.korean}</option>
        </NativeSelect>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="settings"><Settings className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{language === 'ko' ? '설정' : 'Settings'}</DropdownMenuLabel>
            <DropdownMenuItem onClick={onCreateCampaign}>{text.newCampaign}</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenMonthSetup} disabled={!activeCampaignId}>{text.setupCurrentMonth}</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenGameResult} disabled={!activeCampaignId}>{text.recordGameResult}</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenRuleOptions} disabled={!activeCampaignId}>{text.ruleOptions}</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenStartingHands} disabled={!activeCampaignId}>{text.editStartingHands}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>{text.undo}</DropdownMenuItem>
            <DropdownMenuItem onClick={onRedo} disabled={!canRedo}>{text.redo}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onResetStorage}>{text.resetStorage}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPull} disabled={auth.status !== 'signed-in'}>{text.pullGist}</DropdownMenuItem>
            <DropdownMenuItem onClick={onPush} disabled={auth.status !== 'signed-in'}>{text.pushGist}</DropdownMenuItem>
            <DropdownMenuSeparator />
            {auth.status === 'signed-in'
              ? <DropdownMenuItem onClick={onSignOut}>{text.signOut}</DropdownMenuItem>
              : <DropdownMenuItem onClick={onStartSignIn} disabled={auth.status === 'pending-device-flow'}>{text.signInWithGitHub}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-1 px-2 py-1.5">
              <Badge variant={dirty ? 'destructive' : 'default'}>{dirty ? text.unsyncedLocalChanges : text.localCacheSaved}</Badge>
              <Badge variant="secondary">{auth.status === 'signed-in' ? text.githubAvailable : text.githubNotConfigured}</Badge>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}