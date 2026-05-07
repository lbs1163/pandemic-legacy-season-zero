import { useEffect, useMemo, useState } from 'react';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import { threatCards } from '../data/cards/threats';
import type { Affiliation, LanguageCode, Region } from '../types/cards';
import type { PlayerProfile } from '../types/campaign';
import type { StartingHandAssignment, UnidentifiedTargetCityFilter, UnidentifiedTargetCitySelection } from '../types/deck';
import { InitialThreatSetupEditor } from './InitialThreatSetupEditor';
import { StartingHandAssignmentEditor } from './StartingHandAssignmentEditor';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';

interface NewCampaignWizardProps {
  open: boolean;
  language: LanguageCode;
  existingCampaignCount: number;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    campaignName: string;
    players: PlayerProfile[];
    startingHands: StartingHandAssignment[];
    unidentifiedTargetCitySelection?: UnidentifiedTargetCitySelection;
    initialThreatCardIds: string[];
  }) => void;
}

const playerCounts = [2, 3, 4] as const;
const initialThreatSetupCount = 9;
const regions: Region[] = ['north-america', 'south-america', 'europe', 'africa', 'asia', 'pacific'];
const affiliations: Affiliation[] = ['allied', 'neutral', 'soviet'];

const regionLabels = {
  en: { 'north-america': 'North America', 'south-america': 'South America', europe: 'Europe', africa: 'Africa', asia: 'Asia', pacific: 'Pacific' },
  ko: { 'north-america': '북미', 'south-america': '남미', europe: '유럽', africa: '아프리카', asia: '아시아', pacific: '태평양' }
} as const;

const affiliationLabels = {
  en: { allied: 'Allied', neutral: 'Neutral', soviet: 'Soviet' },
  ko: { allied: '서방연합', neutral: '중립', soviet: '소련' }
} as const;

function startingHandSizeForPlayers(playerCount: number) {
  if (playerCount <= 2) return 4;
  if (playerCount === 3) return 3;
  return 2;
}

function defaultCampaignName(language: LanguageCode, existingCampaignCount: number) {
  return language === 'ko' ? `캠페인 ${existingCampaignCount + 1}` : `Campaign ${existingCampaignCount + 1}`;
}

function defaultPlayerName(language: LanguageCode, index: number) {
  return language === 'ko' ? `플레이어 ${index + 1}` : `Player ${index + 1}`;
}

function makePlayers(language: LanguageCode, count: number): PlayerProfile[] {
  return Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, name: defaultPlayerName(language, index) }));
}

export function NewCampaignWizard({ open, language, existingCampaignCount, onOpenChange, onCreate }: NewCampaignWizardProps) {
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState(defaultCampaignName(language, existingCampaignCount));
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<PlayerProfile[]>(() => makePlayers(language, 2));
  const [startingHands, setStartingHands] = useState<StartingHandAssignment[]>([]);
  const [unidentifiedTargetEnabled, setUnidentifiedTargetEnabled] = useState(false);
  const [unidentifiedFilterType, setUnidentifiedFilterType] = useState<UnidentifiedTargetCityFilter['type']>('region');
  const [unidentifiedRegion, setUnidentifiedRegion] = useState<Region>('asia');
  const [unidentifiedAffiliation, setUnidentifiedAffiliation] = useState<Affiliation>('neutral');
  const [unidentifiedRemovedCardId, setUnidentifiedRemovedCardId] = useState('');
  const [initialThreatCardIds, setInitialThreatCardIds] = useState<string[]>([]);

  const requiredPerPlayer = startingHandSizeForPlayers(playerCount);
  const requiredTotal = requiredPerPlayer * playerCount;
  const trimmedCampaignName = campaignName.trim();
  const validPlayers = players.length === playerCount && players.every((player) => player.name.trim().length > 0);
  const unidentifiedFilter: UnidentifiedTargetCityFilter = unidentifiedFilterType === 'region'
    ? { type: 'region', value: unidentifiedRegion }
    : { type: 'affiliation', value: unidentifiedAffiliation };
  const startingHandCardIds = useMemo(() => new Set(startingHands.map((assignment) => assignment.cardId)), [startingHands]);
  const unidentifiedCandidates = useMemo(() => cityCards.filter((city) => {
    if (startingHandCardIds.has(city.id)) return false;
    return unidentifiedFilter.type === 'region' ? city.region === unidentifiedFilter.value : city.affiliation === unidentifiedFilter.value;
  }), [startingHandCardIds, unidentifiedFilter]);
  const canContinue = step === 0
    ? trimmedCampaignName.length > 0
    : step === 1
      ? validPlayers
      : step === 2
        ? startingHands.length === requiredTotal
        : step === 3
          ? !unidentifiedTargetEnabled || unidentifiedCandidates.some((city) => city.id === unidentifiedRemovedCardId)
          : initialThreatCardIds.length === initialThreatSetupCount;
  const stepLabel = language === 'ko' ? `${step + 1} / 5단계` : `Step ${step + 1} of 5`;

  const summaryText = useMemo(() => {
    if (language === 'ko') return `${playerCount}명 · 각 ${requiredPerPlayer}장 · 총 ${requiredTotal}장`;
    return `${playerCount} players · ${requiredPerPlayer} cards each · ${requiredTotal} total`;
  }, [language, playerCount, requiredPerPlayer, requiredTotal]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setCampaignName(defaultCampaignName(language, existingCampaignCount));
    setPlayerCount(2);
    setPlayers(makePlayers(language, 2));
    setStartingHands([]);
    setUnidentifiedTargetEnabled(false);
    setUnidentifiedFilterType('region');
    setUnidentifiedRegion('asia');
    setUnidentifiedAffiliation('neutral');
    setUnidentifiedRemovedCardId('');
    setInitialThreatCardIds([]);
  }, [existingCampaignCount, language, open]);

  const changePlayerCount = (count: number) => {
    setPlayerCount(count);
    setPlayers((current) => Array.from({ length: count }, (_, index) => current[index] ?? { id: `p${index + 1}`, name: defaultPlayerName(language, index) }));
    setStartingHands([]);
    setUnidentifiedRemovedCardId('');
  };

  const changePlayerName = (playerId: string, name: string) => {
    setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, name } : player));
  };

  const create = () => {
    if (!canContinue) return;
    onCreate({
      campaignName: trimmedCampaignName,
      players: players.map((player) => ({ ...player, name: player.name.trim() })),
      startingHands,
      unidentifiedTargetCitySelection: unidentifiedTargetEnabled ? { filter: unidentifiedFilter, removedCardId: unidentifiedRemovedCardId } : undefined,
      initialThreatCardIds
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{language === 'ko' ? '새 캠페인 만들기' : 'Create new campaign'}</DialogTitle>
          <DialogDescription>{stepLabel} · {summaryText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {step === 0 ? (
            <section className="space-y-3">
              <div>
                <h3 className="font-semibold">{language === 'ko' ? '캠페인 기본 정보' : 'Campaign details'}</h3>
                <p className="text-sm text-muted-foreground">{language === 'ko' ? '언어는 현재 앱 언어를 사용합니다.' : 'The current app language will be used.'}</p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium">{language === 'ko' ? '캠페인 이름' : 'Campaign name'}</span>
                <Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
              </label>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {language === 'ko' ? '언어: 한국어' : 'Language: English'}
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">{language === 'ko' ? '플레이어 설정' : 'Player setup'}</h3>
                <p className="text-sm text-muted-foreground">{language === 'ko' ? '플레이어 수에 따라 시작 손패 장수가 자동으로 정해집니다.' : 'Starting hand size is determined by player count.'}</p>
              </div>
              <label className="block max-w-xs space-y-2">
                <span className="text-sm font-medium">{language === 'ko' ? '플레이어 인원수' : 'Player count'}</span>
                <NativeSelect value={String(playerCount)} onChange={(event) => changePlayerCount(Number(event.target.value))}>
                  {playerCounts.map((count) => <option key={count} value={count}>{count}</option>)}
                </NativeSelect>
              </label>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{summaryText}</div>
              <div className="grid gap-3 md:grid-cols-2">
                {players.map((player, index) => (
                  <label key={player.id} className="space-y-2">
                    <span className="text-sm font-medium">{language === 'ko' ? `플레이어 ${index + 1}` : `Player ${index + 1}`}</span>
                    <Input value={player.name} onChange={(event) => changePlayerName(player.id, event.target.value)} />
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">{language === 'ko' ? '시작 손패 설정' : 'Starting hands'}</h3>
                <p className="text-sm text-muted-foreground">{language === 'ko' ? '도시/이벤트 카드를 선택하세요. 같은 카드는 중복 선택할 수 없습니다.' : 'Choose city/event cards. Duplicate cards are disabled.'}</p>
              </div>
              <p className="text-sm text-muted-foreground">{startingHands.length}/{requiredTotal}</p>
              <StartingHandAssignmentEditor
                players={players}
                requiredPerPlayer={requiredPerPlayer}
                selectedAssignments={startingHands}
                cityCards={cityCards}
                eventCards={eventCards}
                language={language}
                onChange={setStartingHands}
              />
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">{language === 'ko' ? '미식별 표적 도시 준비' : 'Unidentified target city setup'}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'ko'
                    ? '임무에서 지시한 대륙 또는 세력의 도시 카드를 플레이어 덱에서 꺼내 후보를 확인한 뒤, 랜덤하게 제외한 도시 1장을 기록합니다. 시작 손패에 나온 도시는 후보에서 제외됩니다.'
                    : 'When a mission instructs this setup, inspect matching city cards from the player deck, then record the one city randomly removed. Cities in starting hands are excluded from candidates.'}
                </p>
              </div>

              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={unidentifiedTargetEnabled}
                  onChange={(event) => {
                    setUnidentifiedTargetEnabled(event.target.checked);
                    setUnidentifiedRemovedCardId('');
                  }}
                />
                <span>
                  <strong className="block">{language === 'ko' ? '이번 임무에서 미식별 표적 도시를 준비합니다.' : 'Prepare an unidentified target city for this mission.'}</strong>
                  <span className="text-muted-foreground">{language === 'ko' ? '필요하지 않으면 체크하지 않고 다음 단계로 넘어가세요.' : 'Leave unchecked if this mission does not require it.'}</span>
                </span>
              </label>

              {unidentifiedTargetEnabled ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium">{language === 'ko' ? '조건 종류' : 'Filter type'}</span>
                      <NativeSelect value={unidentifiedFilterType} onChange={(event) => { setUnidentifiedFilterType(event.target.value as UnidentifiedTargetCityFilter['type']); setUnidentifiedRemovedCardId(''); }}>
                        <option value="region">{language === 'ko' ? '대륙' : 'Region'}</option>
                        <option value="affiliation">{language === 'ko' ? '세력' : 'Affiliation'}</option>
                      </NativeSelect>
                    </label>
                    {unidentifiedFilterType === 'region' ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium">{language === 'ko' ? '대륙' : 'Region'}</span>
                        <NativeSelect value={unidentifiedRegion} onChange={(event) => { setUnidentifiedRegion(event.target.value as Region); setUnidentifiedRemovedCardId(''); }}>
                          {regions.map((region) => <option key={region} value={region}>{regionLabels[language][region]}</option>)}
                        </NativeSelect>
                      </label>
                    ) : (
                      <label className="space-y-2">
                        <span className="text-sm font-medium">{language === 'ko' ? '세력' : 'Affiliation'}</span>
                        <NativeSelect value={unidentifiedAffiliation} onChange={(event) => { setUnidentifiedAffiliation(event.target.value as Affiliation); setUnidentifiedRemovedCardId(''); }}>
                          {affiliations.map((affiliation) => <option key={affiliation} value={affiliation}>{affiliationLabels[language][affiliation]}</option>)}
                        </NativeSelect>
                      </label>
                    )}
                    <label className="space-y-2">
                      <span className="text-sm font-medium">{language === 'ko' ? '제외된 도시' : 'Removed city'}</span>
                      <NativeSelect value={unidentifiedRemovedCardId} onChange={(event) => setUnidentifiedRemovedCardId(event.target.value)}>
                        <option value="">{language === 'ko' ? '도시 선택' : 'Select city'}</option>
                        {unidentifiedCandidates.map((city) => <option key={city.id} value={city.id}>{city.name[language]}</option>)}
                      </NativeSelect>
                    </label>
                  </div>

                  <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    {language === 'ko' ? `후보 ${unidentifiedCandidates.length}장` : `${unidentifiedCandidates.length} candidates`}
                  </div>
                  <div className="grid max-h-56 gap-2 overflow-auto rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-3">
                    {unidentifiedCandidates.length > 0 ? unidentifiedCandidates.map((city) => (
                      <div key={city.id} className={city.id === unidentifiedRemovedCardId ? 'rounded-md border border-primary bg-primary/10 p-2' : 'rounded-md border p-2'}>
                        <strong className="block">{city.name[language]}</strong>
                        <span className="text-xs text-muted-foreground">{regionLabels[language][city.region]} · {affiliationLabels[language][city.affiliation]}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">{language === 'ko' ? '조건에 맞는 남은 도시 후보가 없습니다.' : 'No remaining city candidates match this filter.'}</p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 4 ? (
            <section className="space-y-4">
              <div>
                <h3 className="font-semibold">{language === 'ko' ? '초기 위협 카드 공개' : 'Initial threat reveal'}</h3>
                <p className="text-sm text-muted-foreground">{language === 'ko' ? '게임 준비 단계에서 공개한 위협 카드 9장을 선택하세요. 선택한 카드는 버린 위협 카드 구획에 기록됩니다.' : 'Choose the 9 Threat cards revealed during setup. Selected cards will start in the Threat discard.'}</p>
              </div>
              <p className="text-sm text-muted-foreground">{initialThreatCardIds.length}/{initialThreatSetupCount}</p>
              <InitialThreatSetupEditor
                selectedCardIds={initialThreatCardIds}
                cityCards={cityCards}
                threatCards={threatCards}
                language={language}
                onChange={setInitialThreatCardIds}
              />
            </section>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep((current) => current - 1)}>
            {step === 0 ? (language === 'ko' ? '취소' : 'Cancel') : (language === 'ko' ? '이전' : 'Back')}
          </Button>
          <Button type="button" disabled={!canContinue} onClick={() => step === 4 ? create() : setStep((current) => current + 1)}>
            {step === 4 ? (language === 'ko' ? '생성' : 'Create') : (language === 'ko' ? '다음' : 'Next')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}