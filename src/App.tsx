import { useEffect, useMemo, useState } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { CampaignSelector } from './components/CampaignSelector';
import { DeckCounterDashboard } from './components/DeckCounterDashboard';
import { baseRules } from './data/rules/baseRules';
import { legacyRules } from './data/rules/legacyRules';
import { createInitialCampaign } from './domain/createInitialCampaign';
import { configureStartingHands, recordPlayerCardDraw, resolveEscalationDraw } from './domain/playerDeck';
import { setRuleEnabled } from './domain/ruleToggles';
import {
  clearThreatGameEndArea,
  intensifyThreatDiscard,
  recordThreatBottomDrawToDiscard,
  recordThreatBottomDrawToGameEndArea,
  recordThreatDraw
} from './domain/threatDeck';
import { uiText } from './i18n/uiText';
import { findOrCreateStateGist, pullStateFromGist, pushStateToGist } from './services/gistStorage';
import { createEmptyEnvelope, loadLocalCache, saveLocalCache } from './services/localCache';
import { pollGitHubDeviceFlowUntilComplete, startGitHubDeviceFlow } from './services/githubAuth';
import type { LanguageCode } from './types/cards';
import type { PlayerCardDestination, StartingHandAssignment } from './types/deck';
import type { AuthState, DeviceFlowUiState, GistSyncMetadata, PersistedEnvelope } from './types/sync';

const allRules = [...baseRules, ...legacyRules];

export function App() {
  const [envelope, setEnvelope] = useState<PersistedEnvelope>(() => loadLocalCache() ?? createEmptyEnvelope());
  const [auth, setAuth] = useState<AuthState>({ status: 'signed-out' });
  const [gistMetadata, setGistMetadata] = useState<GistSyncMetadata>({ fileName: 'pandemic-legacy-season-zero-state.json', dirty: false });
  const [dirty, setDirty] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>();
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowUiState>();

  const activeCampaign = useMemo(
    () => envelope.campaigns.find((campaign) => campaign.campaignId === envelope.activeCampaignId) ?? envelope.campaigns[0],
    [envelope]
  );
  const language: LanguageCode = activeCampaign?.language ?? 'ko';
  const text = uiText[language];

  useEffect(() => {
    saveLocalCache(envelope);
  }, [envelope]);

  function updateEnvelope(updater: (current: PersistedEnvelope) => PersistedEnvelope) {
    setEnvelope((current) => updater(current));
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

  const createCampaign = () => {
    const campaign = createInitialCampaign({
      campaignName: language === 'ko' ? `캠페인 ${envelope.campaigns.length + 1}` : `Campaign ${envelope.campaigns.length + 1}`,
      language,
      players: [{ id: 'p1', name: 'Player 1' }, { id: 'p2', name: 'Player 2' }]
    });
    updateEnvelope((current) => ({ ...current, campaigns: [...current.campaigns, campaign], activeCampaignId: campaign.campaignId }));
  };

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
    setEnvelope(pulled);
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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{text.appEyebrow}</p>
          <h1>{text.appTitle}</h1>
          <p>{text.appDescription}</p>
        </div>
        {activeCampaign ? (
          <label className="language-switcher">
            <span>{text.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>
              <option value="en">{text.english}</option>
              <option value="ko">{text.korean}</option>
            </select>
          </label>
        ) : null}
      </header>

      <AuthPanel
        auth={auth}
        dirty={dirty}
        syncMessage={syncMessage}
        deviceFlow={deviceFlow}
        text={text}
        onStartSignIn={handleStartSignIn}
        onSignOut={() => { setDeviceFlow(undefined); setAuth({ status: 'signed-out' }); }}
        onPull={handlePull}
        onPush={handlePush}
      />

      <CampaignSelector
        campaigns={envelope.campaigns}
        activeCampaignId={activeCampaign?.campaignId}
        text={text}
        onSelect={(campaignId) => updateEnvelope((current) => ({ ...current, activeCampaignId: campaignId }))}
        onCreate={createCampaign}
      />

      {activeCampaign ? (
        <DeckCounterDashboard
          campaign={activeCampaign}
          rules={allRules}
          language={language}
          text={text}
          onConfigureStartingHands={(assignments: StartingHandAssignment[]) => updateActiveCampaign((campaign) => updateCampaignTimestamp({ ...campaign, playerDeck: configureStartingHands(campaign.playerDeck, assignments) }))}
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
          onToggleRule={(ruleId, enabled) => updateActiveCampaign((campaign) => setRuleEnabled(campaign, ruleId, enabled))}
        />
      ) : (
        <section className="card empty-state"><h2>{text.noCampaignYet}</h2><p>{text.createCampaignPrompt}</p></section>
      )}
    </main>
  );
}
