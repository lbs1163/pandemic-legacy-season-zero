import { useEffect, useMemo, useState } from 'react';
import { cityCards } from '../data/cards/cities';
import { getSurveillanceSatelliteCardIdForRegion, surveillanceSatelliteCards, surveillanceSatelliteRegionNames } from '../data/cards/surveillanceSatellites';
import { threatCards } from '../data/cards/threats';
import { monthLabels } from '../data/campaign/months';
import { clampFundingLevel, getCampaignMonthSetupDefaults, getDefaultAvailableEventCardsForCampaign, getRequiredEventCardCountForFunding, isCampaignMonthSetupComplete } from '../domain/campaignProgress';
import type { Affiliation, LanguageCode, Region } from '../types/cards';
import type { CampaignState, CharacterProfile, PlayerProfile } from '../types/campaign';
import type { StartingHandAssignment, SurveillanceSatelliteSelection, UnidentifiedTargetCityFilter, UnidentifiedTargetCitySelection } from '../types/deck';
import { InitialThreatSetupEditor } from './InitialThreatSetupEditor';
import { StartingHandAssignmentEditor } from './StartingHandAssignmentEditor';
import { SearchableSelect } from './SearchableSelect';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';

interface Props {
  open: boolean;
  campaign: CampaignState;
  language: LanguageCode;
  onOpenChange: (open: boolean) => void;
  onSetup: (input: { players: PlayerProfile[]; characters: CharacterProfile[]; startingHands: StartingHandAssignment[]; selectedEventCardIds: string[]; fundingLevel: number; unidentifiedTargetCitySelections?: UnidentifiedTargetCitySelection[]; surveillanceSatelliteSelection?: SurveillanceSatelliteSelection; initialThreatCardIds: string[] }) => void;
}

interface EditableUnidentifiedSetup {
  enabled: boolean;
  filterType: UnidentifiedTargetCityFilter['type'];
  region: Region;
  affiliation: Affiliation;
  cityIds: string[];
  hiddenRemovedCount: number;
  revealedRemovedCount: number;
  revealedRemovedCardIds: string[];
}

const regions: Region[] = ['north-america', 'south-america', 'europe', 'africa', 'asia', 'pacific'];
const affiliations: Affiliation[] = ['allied', 'neutral', 'soviet'];
const playerCounts = [2, 3, 4] as const;
const prologueTemporaryIdentities = ['병원 행정직', '의학학회 운영자', '진료소 기획자', '연구 조교'] as const;
const regionLabels = { en: { 'north-america': 'North America', 'south-america': 'South America', europe: 'Europe', africa: 'Africa', asia: 'Asia', pacific: 'Pacific' }, ko: { 'north-america': '북미', 'south-america': '남미', europe: '유럽', africa: '아프리카', asia: '아시아', pacific: '태평양' } } as const;
const affiliationLabels = { en: { allied: 'Allied', neutral: 'Neutral', soviet: 'Soviet' }, ko: { allied: '서방연합', neutral: '중립', soviet: '소련' } } as const;
const filterTypeLabels = { en: { region: 'Region', affiliation: 'Affiliation', 'city-ids': 'Specific cities' }, ko: { region: '대륙', affiliation: '세력', 'city-ids': '지정 도시' } } as const;

function startingHandSizeForPlayers(playerCount: number) { return playerCount <= 2 ? 4 : playerCount === 3 ? 3 : 2; }

function defaultPlayerName(language: LanguageCode, index: number) {
  return language === 'ko' ? `플레이어 ${index + 1}` : `Player ${index + 1}`;
}

function makePlayers(language: LanguageCode, count: number, existingPlayers: PlayerProfile[] = []): PlayerProfile[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: existingPlayers[index]?.name ?? defaultPlayerName(language, index)
  }));
}

function makeCharacters(players: PlayerProfile[], characterNames: Record<string, string>, prologue: boolean): CharacterProfile[] {
  return players.map((player) => ({
    id: `character-${player.id}`,
    playerId: player.id,
    name: prologue ? characterNames[player.id]?.trim() || prologueTemporaryIdentities[0] : characterNames[player.id]?.trim() || player.name,
    roleName: prologue ? characterNames[player.id]?.trim() || prologueTemporaryIdentities[0] : undefined
  }));
}

function editableSetupFromSelection(selection?: { enabled: boolean; filter: UnidentifiedTargetCityFilter; hiddenRemovedCount: number }): EditableUnidentifiedSetup {
  return {
    enabled: selection?.enabled ?? false,
    filterType: selection?.filter.type ?? 'region',
    region: selection?.filter.type === 'region' ? selection.filter.value : 'asia',
    affiliation: selection?.filter.type === 'affiliation' ? selection.filter.value : 'neutral',
    cityIds: selection?.filter.type === 'city-ids' ? selection.filter.value : [],
    hiddenRemovedCount: selection?.hiddenRemovedCount ?? 1,
    revealedRemovedCount: 'revealedRemovedCount' in (selection ?? {}) ? (selection as { revealedRemovedCount?: number }).revealedRemovedCount ?? 0 : 0,
    revealedRemovedCardIds: selection?.filter.type === 'city-ids' ? selection.filter.value.slice(0, (selection as { revealedRemovedCount?: number } | undefined)?.revealedRemovedCount ?? selection.filter.value.length) : []
  };
}

function selectionFromEditable(setup: EditableUnidentifiedSetup): UnidentifiedTargetCitySelection {
  return {
    filter: setup.filterType === 'region' ? { type: 'region', value: setup.region } : setup.filterType === 'affiliation' ? { type: 'affiliation', value: setup.affiliation } : { type: 'city-ids', value: setup.cityIds },
    hiddenRemovedCount: setup.hiddenRemovedCount,
    revealedRemovedCardIds: setup.revealedRemovedCardIds
  };
}

function candidatesFor(filter: UnidentifiedTargetCityFilter) {
  if (filter.type === 'region') return cityCards.filter((city) => city.region === filter.value);
  if (filter.type === 'affiliation') return cityCards.filter((city) => city.affiliation === filter.value);
  return cityCards.filter((city) => filter.value.includes(city.id));
}

export function MonthGameSetupWizard({ open, campaign, language, onOpenChange, onSetup }: Props) {
  const defaults = useMemo(() => getCampaignMonthSetupDefaults(campaign), [campaign]);
  const isPrologue = campaign.progress.currentMonth === 'prologue';
  const monthSetupComplete = isCampaignMonthSetupComplete(campaign);
  const title = monthSetupComplete
    ? (language === 'ko' ? '현재 월 다시 시작' : 'Restart current month')
    : (language === 'ko' ? '현재 월 게임 준비' : 'Set up current month game');
  const defaultSetups = defaults.unidentifiedTargetCities ?? (defaults.unidentifiedTargetCity ? [defaults.unidentifiedTargetCity] : []);
  const defaultSurveillanceSatelliteCardIds = (defaults.surveillanceSatelliteRegions ?? []).map(getSurveillanceSatelliteCardIdForRegion);
  const hasSurveillanceSatelliteSetup = defaultSurveillanceSatelliteCardIds.length > 0;
  const totalSteps = hasSurveillanceSatelliteSetup ? 6 : 5;
  const [step, setStep] = useState(0);
  const [unidentifiedSetups, setUnidentifiedSetups] = useState<EditableUnidentifiedSetup[]>([]);
  const [selectedSurveillanceSatelliteCardIds, setSelectedSurveillanceSatelliteCardIds] = useState<string[]>([]);
  const [initialThreatCardIds, setInitialThreatCardIds] = useState<string[]>([]);
  const [startingHands, setStartingHands] = useState<StartingHandAssignment[]>([]);
  const [selectedEventCardIds, setSelectedEventCardIds] = useState<string[]>([]);
  const [fundingLevel, setFundingLevel] = useState<number>(campaign.progress.fundingLevel);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [characterNames, setCharacterNames] = useState<Record<string, string>>({});
  const requiredPerPlayer = startingHandSizeForPlayers(players.length);
  const requiredTotal = requiredPerPlayer * players.length;
  const defaultFundingLevel = campaign.progress.fundingLevel;
  const fundingLevelChanged = fundingLevel !== defaultFundingLevel;
  const availableEventCards = useMemo(() => getDefaultAvailableEventCardsForCampaign(campaign), [campaign]);
  const requiredEventCount = getRequiredEventCardCountForFunding(fundingLevel, availableEventCards.length);
  const selectedEventCards = useMemo(
    () => availableEventCards.filter((card) => selectedEventCardIds.includes(card.id)),
    [availableEventCards, selectedEventCardIds]
  );
  const activeSelections = unidentifiedSetups.filter((setup) => setup.enabled).map(selectionFromEditable);
  const revealedRemovedCardIds = unidentifiedSetups.flatMap((setup) => setup.enabled ? setup.revealedRemovedCardIds : []);
  const changedDefault = defaultSetups.length !== unidentifiedSetups.length || unidentifiedSetups.some((setup, index) => {
    const defaultSetup = defaultSetups[index];
    const selection = selectionFromEditable(setup);
    return !defaultSetup || setup.enabled !== defaultSetup.enabled || JSON.stringify(selection.filter) !== JSON.stringify(defaultSetup.filter) || setup.hiddenRemovedCount !== defaultSetup.hiddenRemovedCount || setup.revealedRemovedCount !== (defaultSetup.revealedRemovedCount ?? 0);
  });
  const validUnidentifiedSetups = unidentifiedSetups.filter((setup) => setup.enabled).every((setup) => {
    const selection = selectionFromEditable(setup);
    const candidates = candidatesFor(selection.filter);
    const revealedIds = selection.revealedRemovedCardIds ?? [];
    return selection.hiddenRemovedCount !== undefined
      && selection.hiddenRemovedCount >= 0
      && setup.revealedRemovedCount >= 0
      && selection.hiddenRemovedCount + setup.revealedRemovedCount > 0
      && candidates.length >= selection.hiddenRemovedCount + setup.revealedRemovedCount
      && revealedIds.length === setup.revealedRemovedCount
      && revealedIds.every((cardId) => candidates.some((candidate) => candidate.id === cardId));
  }) && revealedRemovedCardIds.length === new Set(revealedRemovedCardIds).size;
  const validPlayers = players.length >= 2 && players.length <= 4 && players.every((player) => player.name.trim().length > 0);
  const selectedPrologueIdentities = players.map((player) => characterNames[player.id]).filter(Boolean);
  const validCharacters = !isPrologue || (selectedPrologueIdentities.length === players.length && new Set(selectedPrologueIdentities).size === selectedPrologueIdentities.length);
  const validEventSelection = selectedEventCardIds.length === requiredEventCount;
  const validSurveillanceSatelliteSelection = !hasSurveillanceSatelliteSetup || (
    selectedSurveillanceSatelliteCardIds.length > 0
    && selectedSurveillanceSatelliteCardIds.length <= surveillanceSatelliteCards.length
    && selectedSurveillanceSatelliteCardIds.length === new Set(selectedSurveillanceSatelliteCardIds).size
  );
  const surveillanceSatelliteStep = hasSurveillanceSatelliteSetup ? 3 : -1;
  const initialThreatStep = hasSurveillanceSatelliteSetup ? 4 : 3;
  const startingHandStep = hasSurveillanceSatelliteSetup ? 5 : 4;
  const canContinue = step === 0
    ? validPlayers && validCharacters
    : step === 1
      ? validEventSelection
      : step === 2
        ? validUnidentifiedSetups
        : step === surveillanceSatelliteStep
          ? validSurveillanceSatelliteSelection
          : step === initialThreatStep
          ? initialThreatCardIds.length === 9
          : startingHands.length === requiredTotal;

  useEffect(() => {
    if (!open) return;
    const monthlyPlayers = makePlayers(language, Math.min(4, Math.max(2, campaign.players.length || 2)), campaign.players);
    const defaultRequiredEventCount = getRequiredEventCardCountForFunding(campaign.progress.fundingLevel, availableEventCards.length);
    setStep(0);
    setPlayers(monthlyPlayers);
    setCharacterNames(Object.fromEntries(monthlyPlayers.map((player, index) => {
      const character = campaign.characters?.find((item) => item.playerId === player.id);
      return [player.id, isPrologue ? character?.roleName ?? prologueTemporaryIdentities[index] ?? prologueTemporaryIdentities[0] : character?.name ?? ''];
    })));
    setUnidentifiedSetups(defaultSetups.length ? defaultSetups.map(editableSetupFromSelection) : [editableSetupFromSelection()]);
    setSelectedSurveillanceSatelliteCardIds(defaultSurveillanceSatelliteCardIds);
    setInitialThreatCardIds([]);
    setStartingHands([]);
    setFundingLevel(campaign.progress.fundingLevel);
    setSelectedEventCardIds(availableEventCards.length === defaultRequiredEventCount ? availableEventCards.map((card) => card.id) : []);
  }, [availableEventCards, campaign.characters, campaign.players, campaign.progress.fundingLevel, defaults, isPrologue, language, open]);

  const updatePlayerCount = (count: number) => {
    setPlayers((current) => makePlayers(language, count, current));
    setStartingHands([]);
  };

  const updatePlayerName = (playerId: string, name: string) => {
    setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, name } : player));
  };

  const updateFundingLevel = (value: number) => {
    const nextFundingLevel = clampFundingLevel(value);
    setFundingLevel(nextFundingLevel);
    setSelectedEventCardIds([]);
    setStartingHands([]);
  };

  const updateSetup = (index: number, updater: (setup: EditableUnidentifiedSetup) => EditableUnidentifiedSetup) => {
    setUnidentifiedSetups((current) => current.map((setup, setupIndex) => setupIndex === index ? updater(setup) : setup));
  };

  const updateRevealedRemovedCard = (setupIndex: number, slotIndex: number, cardId: string) => {
    updateSetup(setupIndex, (current) => {
      const nextIds = current.revealedRemovedCardIds.filter((_, index) => index !== slotIndex);
      if (cardId) nextIds.splice(slotIndex, 0, cardId);
      return { ...current, revealedRemovedCardIds: nextIds };
    });
    setStartingHands([]);
  };

  const updateCityIdFilterCard = (setupIndex: number, slotIndex: number, cardId: string) => {
    updateSetup(setupIndex, (current) => {
      const nextCityIds = current.cityIds.filter((_, index) => index !== slotIndex);
      if (cardId) nextCityIds.splice(slotIndex, 0, cardId);
      const nextRevealedIds = current.revealedRemovedCardIds.filter((id) => nextCityIds.includes(id));
      return { ...current, cityIds: nextCityIds, revealedRemovedCardIds: nextRevealedIds };
    });
    setStartingHands([]);
  };

  const toggleEventCardSelection = (cardId: string) => {
    setSelectedEventCardIds((current) => {
      const next = current.includes(cardId)
        ? current.filter((selectedId) => selectedId !== cardId)
        : current.length < requiredEventCount
          ? [...current, cardId]
          : current;
      if (next !== current) setStartingHands([]);
      return next;
    });
  };

  const toggleSurveillanceSatelliteSelection = (cardId: string) => {
    setSelectedSurveillanceSatelliteCardIds((current) => {
      const next = current.includes(cardId)
        ? current.filter((selectedId) => selectedId !== cardId)
        : [...current, cardId];
      setStartingHands([]);
      return next;
    });
  };

  const finish = () => {
    const trimmedPlayers = players.map((player, index) => ({ ...player, id: `p${index + 1}`, name: player.name.trim() || defaultPlayerName(language, index) }));
    const surveillanceSatelliteSelection = hasSurveillanceSatelliteSetup ? {
      candidateCardIds: selectedSurveillanceSatelliteCardIds,
      hiddenRemovedCount: selectedSurveillanceSatelliteCardIds.length === 6 ? 1 : 0
    } : undefined;
    onSetup({
      players: trimmedPlayers,
      characters: makeCharacters(trimmedPlayers, characterNames, isPrologue),
      startingHands,
      selectedEventCardIds,
      fundingLevel,
      unidentifiedTargetCitySelections: activeSelections.length ? activeSelections : undefined,
      surveillanceSatelliteSelection,
      initialThreatCardIds
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{monthLabels[campaign.progress.currentMonth][language]} · {language === 'ko' ? `${step + 1}/${totalSteps}단계` : `Step ${step + 1} of ${totalSteps}`}</DialogDescription></DialogHeader>
        {step === 0 ? <section className="space-y-4">
          <div>
            <h3 className="font-semibold">{language === 'ko' ? '이번 달 플레이어/캐릭터 설정' : 'Monthly players and characters'}</h3>
            <p className="text-sm text-muted-foreground">{language === 'ko' ? '캠페인 기본 플레이어를 기본값으로 사용합니다. 여기서 변경한 플레이어 목록은 이후 월의 기본값으로 저장됩니다.' : 'Campaign players are prefilled. Changes here update the campaign defaults for later months.'}</p>
          </div>
          <label className="block max-w-xs space-y-1">
            <span className="text-xs text-muted-foreground">{language === 'ko' ? '이번 달 인원수' : 'Player count this month'}</span>
            <NativeSelect value={players.length} onChange={(event) => updatePlayerCount(Number(event.target.value))}>
              {playerCounts.map((count) => <option key={count} value={count}>{count}</option>)}
            </NativeSelect>
          </label>
          <label className="block max-w-xs space-y-1">
            <span className="text-xs text-muted-foreground">{language === 'ko' ? '이번 달 자금 지원 단계' : 'Funding level for this month'}</span>
            <Input type="number" min={0} max={10} value={fundingLevel} onChange={(event) => updateFundingLevel(Number(event.target.value))} />
          </label>
          <p className="text-sm text-muted-foreground">
            {language === 'ko'
              ? `게임 결과에 따른 기본값은 ${defaultFundingLevel}입니다. 룰북 보정 지침에 따라 이번 달에 사용할 값을 직접 조정할 수 있습니다.`
              : `The result-based default is ${defaultFundingLevel}. You may adjust the value for this month if applying the rulebook correction guidance.`}
          </p>
          {fundingLevelChanged ? <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
            {language === 'ko'
              ? '일반 설정과 다른 자금 지원 단계입니다. 룰북의 실수 보정 지침처럼 의도적으로 조정하는 경우에만 계속하세요.'
              : 'This funding level differs from the normal result-based setting. Continue only if you are intentionally applying the rulebook correction guidance.'}
          </p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {players.map((player) => <div key={player.id} className="grid gap-2 rounded-lg border p-3">
              <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? `플레이어 ${player.id.slice(1)} 이름` : `Player ${player.id.slice(1)} name`}</span><Input value={player.name} onChange={(event) => updatePlayerName(player.id, event.target.value)} /></label>
              {isPrologue ? (
                <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? '임시 신분증' : 'Temporary identity'}</span><NativeSelect value={characterNames[player.id] ?? prologueTemporaryIdentities[0]} onChange={(event) => setCharacterNames((current) => ({ ...current, [player.id]: event.target.value }))}>{prologueTemporaryIdentities.map((identity) => <option key={identity} value={identity}>{identity}</option>)}</NativeSelect></label>
              ) : (
                <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? '캐릭터 이름' : 'Character name'}</span><Input value={characterNames[player.id] ?? ''} placeholder={player.name} onChange={(event) => setCharacterNames((current) => ({ ...current, [player.id]: event.target.value }))} /></label>
              )}
            </div>)}
          </div>
          {!validPlayers ? <p className="text-sm text-destructive">{language === 'ko' ? '모든 플레이어 이름을 입력하세요.' : 'Enter every player name.'}</p> : null}
          {!validCharacters ? <p className="text-sm text-destructive">{language === 'ko' ? '프롤로그 임시 신분증은 플레이어마다 서로 다르게 선택하세요.' : 'Choose a different temporary identity for each prologue player.'}</p> : null}
        </section> : null}
        {step === 1 ? <section className="space-y-4">
          <div>
            <h3 className="font-semibold">{language === 'ko' ? '이벤트 카드 선택' : 'Event card selection'}</h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ko'
                ? `이번 달 자금 지원 단계는 ${fundingLevel}입니다.${fundingLevelChanged ? ` 일반 설정: ${defaultFundingLevel}.` : ''} 이번 달 플레이어 덱에 넣을 이벤트 카드 ${requiredEventCount}장을 선택하세요.`
                : `Funding level for this month is ${fundingLevel}.${fundingLevelChanged ? ` Normal setting: ${defaultFundingLevel}.` : ''} Choose ${requiredEventCount} event card(s) to include in this month's player deck.`}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {availableEventCards.map((card) => {
              const selected = selectedEventCardIds.includes(card.id);
              const disabled = !selected && selectedEventCardIds.length >= requiredEventCount;
              return <label key={card.id} className={`flex gap-3 rounded-lg border p-3 text-sm ${disabled ? 'opacity-60' : ''}`}>
                <input type="checkbox" checked={selected} disabled={disabled} onChange={() => toggleEventCardSelection(card.id)} />
                <span className="space-y-1">
                  <span className="block font-semibold">{card.name[language]}</span>
                  {card.effect?.description ? <span className="block text-muted-foreground">{card.effect.description[language]}</span> : null}
                </span>
              </label>;
            })}
          </div>
          <p className={`text-sm ${validEventSelection ? 'text-muted-foreground' : 'text-destructive'}`}>
            {language === 'ko' ? `${selectedEventCardIds.length}/${requiredEventCount}장 선택됨` : `${selectedEventCardIds.length}/${requiredEventCount} selected`}
          </p>
        </section> : null}
        {step === 2 ? <section className="space-y-4">
          <div>
            <h3 className="font-semibold">{language === 'ko' ? '미식별/시험 대상 도시 준비' : 'Unidentified/test target city setup'}</h3>
            <p className="text-sm text-muted-foreground">{language === 'ko' ? '표적 확보와 시험 저지는 게임 시작 전에 후보 도시를 제외하는 방식으로 처리합니다. 공개된 카드는 직접 선택하고, 미공개 카드는 수량만 입력하세요.' : 'Target acquisition and test prevention remove matching city candidates before the game starts. Select revealed cards directly and enter only the count for hidden cards.'}</p>
          </div>
          <div className="space-y-3">
            {unidentifiedSetups.map((setup, index) => {
              const selection = selectionFromEditable(setup);
              const candidates = candidatesFor(selection.filter);
              const revealedSlots = Array.from({ length: setup.revealedRemovedCount }, (_, slotIndex) => slotIndex);
              const cityIdFilterSlots = Array.from({ length: Math.max(setup.cityIds.length, setup.revealedRemovedCount, 1) }, (_, slotIndex) => slotIndex);
              const cityIdFilterOptions = cityCards.map((city) => ({
                value: city.id,
                label: city.name[language],
                description: city.country?.[language] ?? affiliationLabels[language][city.affiliation],
                disabled: setup.cityIds.includes(city.id)
              }));
              const revealedOptions = candidates.map((city) => ({
                value: city.id,
                label: city.name[language],
                description: city.country?.[language] ?? affiliationLabels[language][city.affiliation],
                disabled: setup.revealedRemovedCardIds.includes(city.id)
              }));
              return <div key={index} className="space-y-3 rounded-lg border p-3">
                <label className="flex gap-3 text-sm"><input type="checkbox" checked={setup.enabled} onChange={(event) => updateSetup(index, (current) => ({ ...current, enabled: event.target.checked }))} /><span>{language === 'ko' ? `도시 준비 #${index + 1} 사용` : `Use city setup #${index + 1}`}</span></label>
                {setup.enabled ? <div className="grid gap-3 md:grid-cols-4">
                  <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? '구분' : 'Type'}</span><NativeSelect value={setup.filterType} onChange={(event) => updateSetup(index, (current) => ({ ...current, filterType: event.target.value as UnidentifiedTargetCityFilter['type'] }))}><option value="region">{filterTypeLabels[language].region}</option><option value="affiliation">{filterTypeLabels[language].affiliation}</option><option value="city-ids">{filterTypeLabels[language]['city-ids']}</option></NativeSelect></label>
                  {setup.filterType === 'city-ids' ? <div className="space-y-2 md:col-span-4">
                    <p className="text-xs text-muted-foreground">{language === 'ko' ? '후보로 사용할 도시를 직접 지정합니다.' : 'Choose the exact cities to use as candidates.'}</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {cityIdFilterSlots.map((slotIndex) => {
                        const value = setup.cityIds[slotIndex] ?? '';
                        return <label key={slotIndex} className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? `지정 도시 #${slotIndex + 1}` : `Specific city #${slotIndex + 1}`}</span><SearchableSelect value={value} placeholder={language === 'ko' ? '도시 선택' : 'Select city'} searchPlaceholder={language === 'ko' ? '도시 검색...' : 'Search cities...'} emptyText={language === 'ko' ? '도시가 없습니다.' : 'No cities found.'} options={cityIdFilterOptions.map((option) => ({ ...option, disabled: option.disabled && option.value !== value }))} onChange={(cardId) => updateCityIdFilterCard(index, slotIndex, cardId)} /></label>;
                      })}
                    </div>
                  </div> : <label className="space-y-1"><span className="text-xs text-muted-foreground">{setup.filterType === 'region' ? filterTypeLabels[language].region : filterTypeLabels[language].affiliation}</span>{setup.filterType === 'region' ? <NativeSelect value={setup.region} onChange={(event) => updateSetup(index, (current) => ({ ...current, region: event.target.value as Region }))}>{regions.map((item) => <option key={item} value={item}>{regionLabels[language][item]}</option>)}</NativeSelect> : <NativeSelect value={setup.affiliation} onChange={(event) => updateSetup(index, (current) => ({ ...current, affiliation: event.target.value as Affiliation }))}>{affiliations.map((item) => <option key={item} value={item}>{affiliationLabels[language][item]}</option>)}</NativeSelect>}</label>}
                  <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? '비공개 제외 수' : 'Hidden removed count'}</span><Input type="number" min={0} value={setup.hiddenRemovedCount} onChange={(event) => updateSetup(index, (current) => ({ ...current, hiddenRemovedCount: Number(event.target.value) }))} /></label>
                  <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? '공개 제외 수' : 'Revealed removed count'}</span><Input type="number" min={0} value={setup.revealedRemovedCount} onChange={(event) => updateSetup(index, (current) => ({ ...current, revealedRemovedCount: Number(event.target.value), revealedRemovedCardIds: current.revealedRemovedCardIds.slice(0, Math.max(0, Number(event.target.value))) }))} /></label>
                  <div className="self-end rounded-lg bg-muted p-2 text-sm md:col-span-4">{language === 'ko' ? `후보 ${candidates.length}장 · 공개 제외 ${setup.revealedRemovedCardIds.length}/${setup.revealedRemovedCount}장` : `${candidates.length} candidates · ${setup.revealedRemovedCardIds.length}/${setup.revealedRemovedCount} revealed removed`}</div>
                  {revealedSlots.length ? <div className="grid gap-3 md:col-span-4 md:grid-cols-3">
                    {revealedSlots.map((slotIndex) => {
                      const value = setup.revealedRemovedCardIds[slotIndex] ?? '';
                      return <label key={slotIndex} className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? `공개 제외 카드 #${slotIndex + 1}` : `Revealed removed card #${slotIndex + 1}`}</span><SearchableSelect value={value} placeholder={language === 'ko' ? '도시 선택' : 'Select city'} searchPlaceholder={language === 'ko' ? '도시 검색...' : 'Search cities...'} emptyText={language === 'ko' ? '도시가 없습니다.' : 'No cities found.'} options={revealedOptions.map((option) => ({ ...option, disabled: option.disabled && option.value !== value }))} onChange={(cardId) => updateRevealedRemovedCard(index, slotIndex, cardId)} /></label>;
                    })}
                  </div> : null}
                </div> : null}
              </div>;
            })}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setUnidentifiedSetups((current) => [...current, editableSetupFromSelection({ enabled: true, filter: { type: 'region', value: 'asia' }, hiddenRemovedCount: 1 })])}>{language === 'ko' ? '설정 추가' : 'Add setup'}</Button>
            {unidentifiedSetups.length > 1 ? <Button type="button" variant="outline" onClick={() => setUnidentifiedSetups((current) => current.slice(0, -1))}>{language === 'ko' ? '마지막 설정 제거' : 'Remove last setup'}</Button> : null}
          </div>
          {changedDefault ? <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{defaultSetups[0]?.warningWhenChanged[language]}</p> : null}
        </section> : null}
        {step === surveillanceSatelliteStep ? <section className="space-y-4">
          <div>
            <h3 className="font-semibold">{language === 'ko' ? '감시위성 카드 준비' : 'Surveillance Satellite setup'}</h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ko'
                ? '관제소가 존재하는 대륙의 감시위성 카드를 가져옵니다. 기본값은 6월까지 생성된 유럽, 남아메리카, 아시아 관제소입니다. 선택한 카드는 맨 오른쪽 더미부터 1장씩 섞입니다.'
                : 'Take the Surveillance Satellite cards for continents with control centers. The default is Europe, South America, and Asia from the control centers created through June. Selected cards are shuffled into piles from the rightmost pile first.'}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {surveillanceSatelliteCards.map((card) => {
              const selected = selectedSurveillanceSatelliteCardIds.includes(card.id);
              return <label key={card.id} className="flex gap-3 rounded-lg border p-3 text-sm">
                <input type="checkbox" checked={selected} onChange={() => toggleSurveillanceSatelliteSelection(card.id)} />
                <span className="space-y-1">
                  <span className="block font-semibold">{card.name[language]}</span>
                  <span className="block text-muted-foreground">{surveillanceSatelliteRegionNames[card.region][language]}</span>
                </span>
              </label>;
            })}
          </div>
          <p className={`text-sm ${validSurveillanceSatelliteSelection ? 'text-muted-foreground' : 'text-destructive'}`}>
            {language === 'ko'
              ? `${selectedSurveillanceSatelliteCardIds.length}장 선택됨${selectedSurveillanceSatelliteCardIds.length === 6 ? ' · 1장은 앞면을 보지 않고 창고로 되돌립니다.' : ''}`
              : `${selectedSurveillanceSatelliteCardIds.length} selected${selectedSurveillanceSatelliteCardIds.length === 6 ? ' · 1 is returned to the depot face down.' : ''}`}
          </p>
        </section> : null}
        {step === initialThreatStep ? <section className="space-y-3"><p className="text-sm text-muted-foreground">{initialThreatCardIds.length}/9</p><InitialThreatSetupEditor selectedCardIds={initialThreatCardIds} cityCards={cityCards} threatCards={threatCards} language={language} onChange={setInitialThreatCardIds} /></section> : null}
        {step === startingHandStep ? <section className="space-y-3"><p className="text-sm text-muted-foreground">{startingHands.length}/{requiredTotal}</p><StartingHandAssignmentEditor players={players} requiredPerPlayer={requiredPerPlayer} selectedAssignments={startingHands} cityCards={cityCards} eventCards={selectedEventCards} excludedCardIds={revealedRemovedCardIds} language={language} onChange={setStartingHands} /></section> : null}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep((current) => current - 1)}>{step === 0 ? (language === 'ko' ? '취소' : 'Cancel') : (language === 'ko' ? '이전' : 'Back')}</Button><Button disabled={!canContinue} onClick={() => step === totalSteps - 1 ? finish() : setStep((current) => current + 1)}>{step === totalSteps - 1 ? (language === 'ko' ? '적용' : 'Apply setup') : (language === 'ko' ? '다음' : 'Next')}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
