import { useEffect, useMemo, useState } from 'react';
import { cityCards } from '../data/cards/cities';
import { threatCards } from '../data/cards/threats';
import { monthLabels } from '../data/campaign/months';
import { getDefaultAvailableEventCardsForMonth, getMonthSetupDefaults } from '../domain/campaignProgress';
import type { Affiliation, LanguageCode, Region } from '../types/cards';
import type { CampaignState } from '../types/campaign';
import type { StartingHandAssignment, UnidentifiedTargetCityFilter, UnidentifiedTargetCitySelection } from '../types/deck';
import { InitialThreatSetupEditor } from './InitialThreatSetupEditor';
import { StartingHandAssignmentEditor } from './StartingHandAssignmentEditor';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';

interface Props {
  open: boolean;
  campaign: CampaignState;
  language: LanguageCode;
  onOpenChange: (open: boolean) => void;
  onSetup: (input: { startingHands: StartingHandAssignment[]; unidentifiedTargetCitySelection?: UnidentifiedTargetCitySelection; initialThreatCardIds: string[] }) => void;
}

const regions: Region[] = ['north-america', 'south-america', 'europe', 'africa', 'asia', 'pacific'];
const affiliations: Affiliation[] = ['allied', 'neutral', 'soviet'];
const regionLabels = { en: { 'north-america': 'North America', 'south-america': 'South America', europe: 'Europe', africa: 'Africa', asia: 'Asia', pacific: 'Pacific' }, ko: { 'north-america': '북미', 'south-america': '남미', europe: '유럽', africa: '아프리카', asia: '아시아', pacific: '태평양' } } as const;
const affiliationLabels = { en: { allied: 'Allied', neutral: 'Neutral', soviet: 'Soviet' }, ko: { allied: '서방연합', neutral: '중립', soviet: '소련' } } as const;

function startingHandSizeForPlayers(playerCount: number) { return playerCount <= 2 ? 4 : playerCount === 3 ? 3 : 2; }

export function MonthGameSetupWizard({ open, campaign, language, onOpenChange, onSetup }: Props) {
  const defaults = getMonthSetupDefaults(campaign.progress.currentMonth);
  const [step, setStep] = useState(0);
  const [unidentifiedTargetEnabled, setUnidentifiedTargetEnabled] = useState(false);
  const [filterType, setFilterType] = useState<UnidentifiedTargetCityFilter['type']>('region');
  const [region, setRegion] = useState<Region>('asia');
  const [affiliation, setAffiliation] = useState<Affiliation>('neutral');
  const [hiddenRemovedCount, setHiddenRemovedCount] = useState(1);
  const [initialThreatCardIds, setInitialThreatCardIds] = useState<string[]>([]);
  const [startingHands, setStartingHands] = useState<StartingHandAssignment[]>([]);
  const requiredPerPlayer = startingHandSizeForPlayers(campaign.players.length);
  const requiredTotal = requiredPerPlayer * campaign.players.length;
  const eventCards = useMemo(() => getDefaultAvailableEventCardsForMonth(campaign.progress.currentMonth), [campaign.progress.currentMonth]);
  const filter: UnidentifiedTargetCityFilter = filterType === 'region' ? { type: 'region', value: region } : { type: 'affiliation', value: affiliation };
  const candidates = cityCards.filter((city) => filter.type === 'region' ? city.region === filter.value : city.affiliation === filter.value);
  const changedDefault = defaults.unidentifiedTargetCity && (unidentifiedTargetEnabled !== defaults.unidentifiedTargetCity.enabled || JSON.stringify(filter) !== JSON.stringify(defaults.unidentifiedTargetCity.filter) || hiddenRemovedCount !== defaults.unidentifiedTargetCity.hiddenRemovedCount);
  const canContinue = step === 0 ? (!unidentifiedTargetEnabled || (candidates.length >= hiddenRemovedCount && hiddenRemovedCount > 0)) : step === 1 ? initialThreatCardIds.length === 9 : startingHands.length === requiredTotal;

  useEffect(() => {
    if (!open) return;
    setStep(0);
    const setup = defaults.unidentifiedTargetCity;
    setUnidentifiedTargetEnabled(setup?.enabled ?? false);
    setFilterType(setup?.filter.type ?? 'region');
    setRegion(setup?.filter.type === 'region' ? setup.filter.value : 'asia');
    setAffiliation(setup?.filter.type === 'affiliation' ? setup.filter.value : 'neutral');
    setHiddenRemovedCount(setup?.hiddenRemovedCount ?? 1);
    setInitialThreatCardIds([]);
    setStartingHands([]);
  }, [defaults, open]);

  const finish = () => {
    onSetup({
      startingHands,
      unidentifiedTargetCitySelection: unidentifiedTargetEnabled ? { filter, hiddenRemovedCount } : undefined,
      initialThreatCardIds
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{language === 'ko' ? '현재 월 게임 준비' : 'Set up current month game'}</DialogTitle><DialogDescription>{monthLabels[campaign.progress.currentMonth][language]} · {language === 'ko' ? `${step + 1}/3단계` : `Step ${step + 1} of 3`}</DialogDescription></DialogHeader>
        {step === 0 ? <section className="space-y-4">
          <label className="flex gap-3 rounded-lg border p-3"><input type="checkbox" checked={unidentifiedTargetEnabled} onChange={(event) => setUnidentifiedTargetEnabled(event.target.checked)} /><span>{language === 'ko' ? '미식별 표적 도시 준비 사용' : 'Use unidentified target city setup'}</span></label>
          {unidentifiedTargetEnabled ? <div className="grid gap-3 md:grid-cols-4">
            <NativeSelect value={filterType} onChange={(event) => setFilterType(event.target.value as UnidentifiedTargetCityFilter['type'])}><option value="region">{language === 'ko' ? '대륙' : 'Region'}</option><option value="affiliation">{language === 'ko' ? '세력' : 'Affiliation'}</option></NativeSelect>
            {filterType === 'region' ? <NativeSelect value={region} onChange={(event) => setRegion(event.target.value as Region)}>{regions.map((item) => <option key={item} value={item}>{regionLabels[language][item]}</option>)}</NativeSelect> : <NativeSelect value={affiliation} onChange={(event) => setAffiliation(event.target.value as Affiliation)}>{affiliations.map((item) => <option key={item} value={item}>{affiliationLabels[language][item]}</option>)}</NativeSelect>}
            <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? '비공개 제외 수' : 'Hidden removed count'}</span><Input type="number" min={1} value={hiddenRemovedCount} onChange={(event) => setHiddenRemovedCount(Number(event.target.value))} /></label>
            <div className="rounded-lg bg-muted p-2 text-sm">{language === 'ko' ? `후보 ${candidates.length}장` : `${candidates.length} candidates`}</div>
          </div> : null}
          {changedDefault ? <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{defaults.unidentifiedTargetCity?.warningWhenChanged[language]}</p> : null}
        </section> : null}
        {step === 1 ? <section className="space-y-3"><p className="text-sm text-muted-foreground">{initialThreatCardIds.length}/9</p><InitialThreatSetupEditor selectedCardIds={initialThreatCardIds} cityCards={cityCards} threatCards={threatCards} language={language} onChange={setInitialThreatCardIds} /></section> : null}
        {step === 2 ? <section className="space-y-3"><p className="text-sm text-muted-foreground">{startingHands.length}/{requiredTotal}</p><StartingHandAssignmentEditor players={campaign.players} requiredPerPlayer={requiredPerPlayer} selectedAssignments={startingHands} cityCards={cityCards} eventCards={eventCards} language={language} onChange={setStartingHands} /></section> : null}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep((current) => current - 1)}>{step === 0 ? (language === 'ko' ? '취소' : 'Cancel') : (language === 'ko' ? '이전' : 'Back')}</Button><Button disabled={!canContinue} onClick={() => step === 2 ? finish() : setStep((current) => current + 1)}>{step === 2 ? (language === 'ko' ? '적용' : 'Apply setup') : (language === 'ko' ? '다음' : 'Next')}</Button></div>
      </DialogContent>
    </Dialog>
  );
}