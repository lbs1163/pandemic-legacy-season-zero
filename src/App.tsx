import { useEffect, useMemo, useState } from 'react';
import { AppTopBar } from './components/AppTopBar';
import { DeckCounterDashboard } from './components/DeckCounterDashboard';
import { NewCampaignWizard } from './components/NewCampaignWizard';
import { StartingHandSetup } from './components/StartingHandSetup';
import { cityCards } from './data/cards/cities';
import { eventCards } from './data/cards/events';
import { baseRules } from './data/rules/baseRules';
import { legacyRules } from './data/rules/legacyRules';
import { createInitialCampaign } from './domain/createInitialCampaign';
import { configureStartingHands, prepareUnidentifiedTargetCity, recordPlayerCardDraw, resolveEscalationDraw } from './domain/playerDeck';
import { setRuleEnabled } from './domain/ruleToggles';
import { completePlayerDrawStep, completeThreatDrawStep } from './domain/turnFlow';
import {
  clearThreatGameEndArea,
  intensifyThreatDiscard,
  recordInitialThreatSetup,
  recordThreatBottomDrawToDiscard,
  recordThreatBottomDrawToGameEndArea,
  recordThreatDraw
} from './domain/threatDeck';
import { uiText } from './i18n/uiText';
import { findOrCreateStateGist, pullStateFromGist, pushStateToGist } from './services/gistStorage';
import { createEmptyEnvelope, loadLocalCache, saveLocalCache } from './services/localCache';
import { pollGitHubDeviceFlowUntilComplete, startGitHubDeviceFlow } from './services/githubAuth';
import type { LanguageCode } from './types/cards';
import type { PlayerProfile } from './types/campaign';
import type { PlayerCardDestination, StartingHandAssignment, UnidentifiedTargetCitySelection } from './types/deck';
import type { AuthState, DeviceFlowUiState, GistSyncMetadata, PersistedEnvelope } from './types/sync';
import { Alert } from './components/ui/alert';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { RuleTogglePanel } from './components/RuleTogglePanel';

const allRules = [...baseRules, ...legacyRules];

interface EnvelopeHistory {
  past: PersistedEnvelope[];
  present: PersistedEnvelope;
  future: PersistedEnvelope[];
}

const maxHistoryEntries = 50;

export function App() {
  const [history, setHistory] = useState<EnvelopeHistory>(() => ({
    past: [],
    present: loadLocalCache() ?? createEmptyEnvelope(),
    future: []
  }));
  const [auth, setAuth] = useState<AuthState>({ status: 'signed-out' });
  const [gistMetadata, setGistMetadata] = useState<GistSyncMetadata>({ fileName: 'pandemic-legacy-season-zero-state.json', dirty: false });
  const [dirty, setDirty] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>();
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowUiState>();
  const [ruleOptionsOpen, setRuleOptionsOpen] = useState(false);
  const [newCampaignWizardOpen, setNewCampaignWizardOpen] = useState(false);
  const [resetStorageOpen, setResetStorageOpen] = useState(false);
  const [startingHandsOpen, setStartingHandsOpen] = useState(false);

  const envelope = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const activeCampaign = useMemo(
    () => envelope.campaigns.find((campaign) => campaign.campaignId === envelope.activeCampaignId) ?? envelope.campaigns[0],
    [envelope]
  );
  const language: LanguageCode = activeCampaign?.language ?? 'ko';
  const text = uiText[language];

  useEffect(() => {
    saveLocalCache(envelope);
  }, [envelope]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redoEnvelope();
      } else if (key === 'z') {
        event.preventDefault();
        undoEnvelope();
      } else if (key === 'y') {
        event.preventDefault();
        redoEnvelope();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function updateEnvelope(updater: (current: PersistedEnvelope) => PersistedEnvelope) {
    setHistory((current) => ({
      past: [...current.past, current.present].slice(-maxHistoryEntries),
      present: updater(current.present),
      future: []
    }));
    setDirty(true);
    setGistMetadata((current) => ({ ...current, dirty: true }));
  }

  function replaceEnvelope(nextEnvelope: PersistedEnvelope) {
    setHistory({ past: [], present: nextEnvelope, future: [] });
  }

  function undoEnvelope() {
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, maxHistoryEntries)
      };
    });
    setDirty(true);
    setGistMetadata((current) => ({ ...current, dirty: true }));
  }

  function redoEnvelope() {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present].slice(-maxHistoryEntries),
        present: next,
        future: current.future.slice(1)
      };
    });
    setDirty(true);
    setGistMetadata((current) => ({ ...current, dirty: true }));
  }

  function updateActiveCampaign(updater: NonNullable<typeof activeCampaign> | ((campaign: NonNullable<typeof activeCampaign>) => NonNullable<typeof activeCampaign>)) {
    if (!activeCampaign) return;
    updateEnvelope((current) => ({
      ...current,
      campaigns: current.campaigns.map((campaign) => campaign.campaignId === activeCampaign.campaignId
        ? (typeof updater === 'function' ? updater(campaign) : updater)
        : campaign)
    }));
  }

  function setLanguage(nextLanguage: LanguageCode) {
    if (!activeCampaign) return;
    updateActiveCampaign((campaign) => ({ ...campaign, language: nextLanguage, updatedAt: new Date().toISOString() }));
  }

  function createCampaignFromWizard(input: {
    campaignName: string;
    players: PlayerProfile[];
    startingHands: StartingHandAssignment[];
    unidentifiedTargetCitySelection?: UnidentifiedTargetCitySelection;
    initialThreatCardIds: string[];
  }) {
    const campaign = createInitialCampaign({
      campaignName: input.campaignName,
      language,
      players: input.players
    });
    const playerDeckWithUnidentifiedTarget = input.unidentifiedTargetCitySelection
      ? prepareUnidentifiedTargetCity(campaign.playerDeck, cityCards, input.unidentifiedTargetCitySelection)
      : campaign.playerDeck;
    const configuredPlayerDeck = configureStartingHands(playerDeckWithUnidentifiedTarget, input.startingHands);
    const configured = {
      ...campaign,
      playerDeck: configuredPlayerDeck,
      threatDeck: recordInitialThreatSetup(campaign.threatDeck, input.initialThreatCardIds),
      updatedAt: new Date().toISOString()
    };
    updateEnvelope((current) => ({
      ...current,
      campaigns: [...current.campaigns, configured],
      activeCampaignId: configured.campaignId
    }));
  }

  function updateCampaignTimestamp<T extends { updatedAt: string }>(campaign: T): T {
    return { ...campaign, updatedAt: new Date().toISOString() };
  }

  async function handleStartSignIn() {
    try {
      const flow = await startGitHubDeviceFlow();
      setAuth({ status: 'pending-device-flow' });
      setDeviceFlow({
        userCode: flow.userCode,
        verificationUri: flow.verificationUri,
        expiresAt: new Date(Date.now() + flow.expiresIn * 1000).toISOString(),
        remainingSeconds: flow.expiresIn
      });
      setSyncMessage(text.openAndEnterCode.replace('{uri}', flow.verificationUri).replace('{code}', flow.userCode));
      window.open(flow.verificationUri, '_blank', 'noopener,noreferrer');
      const next = await pollGitHubDeviceFlowUntilComplete(flow, (remainingSeconds) => {
        setDeviceFlow((current) => current ? { ...current, remainingSeconds } : current);
      });
      setAuth(next);
      setDeviceFlow(undefined);
      if (next.status === 'signed-in' && next.accessToken) {
        const metadata = await findOrCreateStateGist(next.accessToken);
        setGistMetadata(metadata);
        setSyncMessage(text.signedInGistReady);
      }
    } catch (error) {
      setDeviceFlow(undefined);
      setAuth({ status: 'error', errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }

  async function handlePull() {
    if (auth.status !== 'signed-in' || !auth.accessToken) return;
    const metadata = gistMetadata.gistId ? gistMetadata : await findOrCreateStateGist(auth.accessToken);
    const pulled = await pullStateFromGist(auth.accessToken, metadata);
    replaceEnvelope(pulled);
    setGistMetadata({ ...metadata, lastPulledAt: new Date().toISOString(), dirty: false });
    setDirty(false);
    setSyncMessage(text.pulledState);
  }

  async function handlePush() {
    if (auth.status !== 'signed-in' || !auth.accessToken) return;
    const metadata = gistMetadata.gistId ? gistMetadata : await findOrCreateStateGist(auth.accessToken);
    const pushed = await pushStateToGist(auth.accessToken, metadata, envelope);
    setGistMetadata(pushed);
    setDirty(false);
    setSyncMessage(text.pushedState);
  }

  function handleResetStorage() {
    updateEnvelope(() => createEmptyEnvelope());
    setDirty(false);
    setGistMetadata((current) => ({ ...current, dirty: false }));
    setSyncMessage(text.resetStorageDone);
    setResetStorageOpen(false);
    setRuleOptionsOpen(false);
    setNewCampaignWizardOpen(false);
  }

  return (
    <>
      <AppTopBar
        campaigns={envelope.campaigns}
        activeCampaignId={activeCampaign?.campaignId}
        language={language}
        text={text}
        auth={auth}
        dirty={dirty}
        onSelectCampaign={(campaignId) => updateEnvelope((current) => ({ ...current, activeCampaignId: campaignId }))}
        onCreateCampaign={() => setNewCampaignWizardOpen(true)}
        onChangeLanguage={setLanguage}
        onStartSignIn={handleStartSignIn}
        onSignOut={() => { setDeviceFlow(undefined); setAuth({ status: 'signed-out' }); }}
        onPull={handlePull}
        onPush={handlePush}
        onOpenRuleOptions={() => setRuleOptionsOpen(true)}
        onResetStorage={() => setResetStorageOpen(true)}
        onOpenStartingHands={() => setStartingHandsOpen(true)}
        onUndo={undoEnvelope}
        onRedo={redoEnvelope}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
        {deviceFlow ? (
          <Alert className="border-primary/30 bg-primary/5">
            <div className="grid gap-1 text-sm">
              <strong>{text.deviceCodeLabel}: {deviceFlow.userCode}</strong>
              <a className="font-semibold text-primary underline" href={deviceFlow.verificationUri} target="_blank" rel="noreferrer">{deviceFlow.verificationUri}</a>
              <span>{text.waitingForApproval.replace('{seconds}', String(deviceFlow.remainingSeconds))}</span>
            </div>
          </Alert>
        ) : null}
        {auth.status === 'error' ? <Alert variant="destructive">{auth.errorMessage}</Alert> : null}
        {syncMessage ? <Alert>{syncMessage}</Alert> : null}
        {activeCampaign ? (
          <DeckCounterDashboard
            campaign={activeCampaign}
            rules={allRules}
            language={language}
            text={text}
            onCompletePlayerDraw={(selections) => updateActiveCampaign((campaign) => updateCampaignTimestamp(completePlayerDrawStep(campaign, selections)))}
            onCompleteThreatDraw={(cardIds) => updateActiveCampaign((campaign) => updateCampaignTimestamp(completeThreatDrawStep(campaign, cardIds)))}
            onPlayerDraw={(cardId: string, destination: PlayerCardDestination) => updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, playerDeck: recordPlayerCardDraw(campaign.playerDeck, cardId, destination) }))}
            onResolveEscalation={() => updateActiveCampaign((campaign) => {
              const pile = campaign.playerDeck.piles[campaign.playerDeck.currentPileIndex];
              if (!pile?.escalationCardId) return campaign;
              return updateCampaignTimestamp({ ...campaign, playerDeck: resolveEscalationDraw(campaign.playerDeck, pile.escalationCardId) });
            })}
            onThreatDraw={(cardId: string) => updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, threatDeck: recordThreatDraw(campaign.threatDeck, cardId) }))}
            onThreatBottomToDiscard={(cardId: string) => updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, threatDeck: recordThreatBottomDrawToDiscard(campaign.threatDeck, cardId) }))}
            onThreatBottomToGameEnd={(cardId: string) => updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, threatDeck: recordThreatBottomDrawToGameEndArea(campaign.threatDeck, cardId) }))}
            onThreatIntensify={() => updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, threatDeck: intensifyThreatDiscard(campaign.threatDeck) }))}
            onCleanupGameEnd={() => updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, threatDeck: clearThreatGameEndArea(campaign.threatDeck) }))}
          />
        ) : (
          <section className="rounded-lg border bg-card p-12 text-center"><h2 className="text-2xl font-semibold">{text.noCampaignYet}</h2><p className="mt-2 text-muted-foreground">{text.createCampaignPrompt}</p></section>
        )}
      </main>
      {activeCampaign ? (
        <Dialog open={ruleOptionsOpen} onOpenChange={setRuleOptionsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{text.ruleOptions}</DialogTitle>
              <DialogDescription>{language === 'ko' ? '현재 캠페인에 적용할 규칙 옵션을 켜거나 끕니다.' : 'Toggle rule options for the active campaign.'}</DialogDescription>
            </DialogHeader>
            <RuleTogglePanel rules={allRules} enabledMap={activeCampaign.ruleToggles} language={language} text={text} onToggle={(ruleId, enabled) => updateActiveCampaign((campaign) => setRuleEnabled(campaign, ruleId, enabled))} embedded />
          </DialogContent>
        </Dialog>
      ) : null}
      {activeCampaign ? (
        <Dialog open={startingHandsOpen} onOpenChange={setStartingHandsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{text.editStartingHands}</DialogTitle>
              <DialogDescription>{language === 'ko' ? '시작 손패 구성을 검색 가능한 카드 선택기로 수정합니다.' : 'Edit starting hand assignments with searchable card selectors.'}</DialogDescription>
            </DialogHeader>
            <StartingHandSetup
              state={activeCampaign.playerDeck}
              players={activeCampaign.players}
              cityCards={cityCards}
              eventCards={eventCards}
              language={language}
              forceEditing
              onConfigure={(assignments: StartingHandAssignment[]) => {
                updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, playerDeck: configureStartingHands(campaign.playerDeck, assignments) }));
                setStartingHandsOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      <NewCampaignWizard
        open={newCampaignWizardOpen}
        language={language}
        existingCampaignCount={envelope.campaigns.length}
        onOpenChange={setNewCampaignWizardOpen}
        onCreate={createCampaignFromWizard}
      />
      <Dialog open={resetStorageOpen} onOpenChange={setResetStorageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.resetStorageTitle}</DialogTitle>
            <DialogDescription>{text.resetStorageDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResetStorageOpen(false)}>{text.resetStorageCancel}</Button>
            <Button type="button" variant="destructive" onClick={handleResetStorage}>{text.resetStorageConfirm}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
