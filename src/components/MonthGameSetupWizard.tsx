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
  onSetup: (input: { startingHands: StartingHandAssignment[]; unidentifiedTargetCitySelections?: UnidentifiedTargetCitySelection[]; initialThreatCardIds: string[] }) => void;
}

interface EditableUnidentifiedSetup {
  enabled: boolean;
  filterType: UnidentifiedTargetCityFilter['type'];
  region: Region;
  affiliation: Affiliation;
  hiddenRemovedCount: number;
}

const regions: Region[] = ['north-america', 'south-america', 'europe', 'africa', 'asia', 'pacific'];
const affiliations: Affiliation[] = ['allied', 'neutral', 'soviet'];
const regionLabels = { en: { 'north-america': 'North America', 'south-america': 'South America', europe: 'Europe', africa: 'Africa', asia: 'Asia', pacific: 'Pacific' }, ko: { 'north-america': '북미', 'south-america': '남미', europe: '유럽', africa: '아프리카', asia: '아시아', pacific: '태평양' } } as const;
const affiliationLabels = { en: { allied: 'Allied', neutral: 'Neutral', soviet: 'Soviet' }, ko: { allied: '서방연합', neutral: '중립', soviet: '소련' } } as const;

function startingHandSizeForPlayers(playerCount: number) { return playerCount <= 2 ? 4 : playerCount === 3 ? 3 : 2; }

function editableSetupFromSelection(selection?: { enabled: boolean; filter: UnidentifiedTargetCityFilter; hiddenRemovedCount: number }): EditableUnidentifiedSetup {
  return {
    enabled: selection?.enabled ?? false,
    filterType: selection?.filter.type ?? 'region',
    region: selection?.filter.type === 'region' ? selection.filter.value : 'asia',
    affiliation: selection?.filter.type === 'affiliation' ? selection.filter.value : 'neutral',
    hiddenRemovedCount: selection?.hiddenRemovedCount ?? 1
  };
}

function selectionFromEditable(setup: EditableUnidentifiedSetup): UnidentifiedTargetCitySelection {
  return {
    filter: setup.filterType === 'region' ? { type: 'region', value: setup.region } : { type: 'affiliation', value: setup.affiliation },
    hiddenRemovedCount: setup.hiddenRemovedCount
  };
}

function candidatesFor(filter: UnidentifiedTargetCityFilter) {
  return cityCards.filter((city) => filter.type === 'region' ? city.region === filter.value : city.affiliation === filter.value);
}

export function MonthGameSetupWizard({ open, campaign, language, onOpenChange, onSetup }: Props) {
  const defaults = getMonthSetupDefaults(campaign.progress.currentMonth);
  const defaultSetups = defaults.unidentifiedTargetCities ?? (defaults.unidentifiedTargetCity ? [defaults.unidentifiedTargetCity] : []);
  const [step, setStep] = useState(0);
  const [unidentifiedSetups, setUnidentifiedSetups] = useState<EditableUnidentifiedSetup[]>([]);
  const [initialThreatCardIds, setInitialThreatCardIds] = useState<string[]>([]);
  const [startingHands, setStartingHands] = useState<StartingHandAssignment[]>([]);
  const requiredPerPlayer = startingHandSizeForPlayers(campaign.players.length);
  const requiredTotal = requiredPerPlayer * campaign.players.length;
  const eventCards = useMemo(() => getDefaultAvailableEventCardsForMonth(campaign.progress.currentMonth), [campaign.progress.currentMonth]);
  const activeSelections = unidentifiedSetups.filter((setup) => setup.enabled).map(selectionFromEditable);
  const changedDefault = defaultSetups.length !== unidentifiedSetups.length || unidentifiedSetups.some((setup, index) => {
    const defaultSetup = defaultSetups[index];
    const selection = selectionFromEditable(setup);
    return !defaultSetup || setup.enabled !== defaultSetup.enabled || JSON.stringify(selection.filter) !== JSON.stringify(defaultSetup.filter) || setup.hiddenRemovedCount !== defaultSetup.hiddenRemovedCount;
  });
  const validUnidentifiedSetups = activeSelections.every((selection) => {
    const candidates = candidatesFor(selection.filter);
    return selection.hiddenRemovedCount !== undefined && selection.hiddenRemovedCount > 0 && candidates.length >= selection.hiddenRemovedCount;
  });
  const canContinue = step === 0 ? validUnidentifiedSetups : step === 1 ? initialThreatCardIds.length === 9 : startingHands.length === requiredTotal;

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setUnidentifiedSetups(defaultSetups.length ? defaultSetups.map(editableSetupFromSelection) : [editableSetupFromSelection()]);
    setInitialThreatCardIds([]);
    setStartingHands([]);
  }, [defaults, open]);

  const updateSetup = (index: number, updater: (setup: EditableUnidentifiedSetup) => EditableUnidentifiedSetup) => {
    setUnidentifiedSetups((current) => current.map((setup, setupIndex) => setupIndex === index ? updater(setup) : setup));
  };

  const finish = () => {
    onSetup({
      startingHands,
      unidentifiedTargetCitySelections: activeSelections.length ? activeSelections : undefined,
      initialThreatCardIds
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{language === 'ko' ? '현재 월 게임 준비' : 'Set up current month game'}</DialogTitle><DialogDescription>{monthLabels[campaign.progress.currentMonth][language]} · {language === 'ko' ? `${step + 1}/3단계` : `Step ${step + 1} of 3`}</DialogDescription></DialogHeader>
        {step === 0 ? <section className="space-y-4">
          <div>
            <h3 className="font-semibold">{language === 'ko' ? '미식별/시험 대상 도시 준비' : 'Unidentified/test target city setup'}</h3>
            <p className="text-sm text-muted-foreground">{language === 'ko' ? '표적 확보와 시험 저지는 모두 게임 시작 전에 후보 도시 중 지정 수를 비공개 제외하는 방식으로 처리합니다.' : 'Both target acquisition and test prevention remove the configured number of matching city candidates before the game starts.'}</p>
          </div>
          <div className="space-y-3">
            {unidentifiedSetups.map((setup, index) => {
              const selection = selectionFromEditable(setup);
              const candidates = candidatesFor(selection.filter);
              return <div key={index} className="space-y-3 rounded-lg border p-3">
                <label className="flex gap-3 text-sm"><input type="checkbox" checked={setup.enabled} onChange={(event) => updateSetup(index, (current) => ({ ...current, enabled: event.target.checked }))} /><span>{language === 'ko' ? `도시 준비 #${index + 1} 사용` : `Use city setup #${index + 1}`}</span></label>
                {setup.enabled ? <div className="grid gap-3 md:grid-cols-4">
                  <NativeSelect value={setup.filterType} onChange={(event) => updateSetup(index, (current) => ({ ...current, filterType: event.target.value as UnidentifiedTargetCityFilter['type'] }))}><option value="region">{language === 'ko' ? '대륙' : 'Region'}</option><option value="affiliation">{language === 'ko' ? '세력' : 'Affiliation'}</option></NativeSelect>
                  {setup.filterType === 'region' ? <NativeSelect value={setup.region} onChange={(event) => updateSetup(index, (current) => ({ ...current, region: event.target.value as Region }))}>{regions.map((item) => <option key={item} value={item}>{regionLabels[language][item]}</option>)}</NativeSelect> : <NativeSelect value={setup.affiliation} onChange={(event) => updateSetup(index, (current) => ({ ...current, affiliation: event.target.value as Affiliation }))}>{affiliations.map((item) => <option key={item} value={item}>{affiliationLabels[language][item]}</option>)}</NativeSelect>}
                  <label className="space-y-1"><span className="text-xs text-muted-foreground">{language === 'ko' ? '비공개 제외 수' : 'Hidden removed count'}</span><Input type="number" min={1} value={setup.hiddenRemovedCount} onChange={(event) => updateSetup(index, (current) => ({ ...current, hiddenRemovedCount: Number(event.target.value) }))} /></label>
                  <div className="rounded-lg bg-muted p-2 text-sm">{language === 'ko' ? `후보 ${candidates.length}장` : `${candidates.length} candidates`}</div>
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
        {step === 1 ? <section className="space-y-3"><p className="text-sm text-muted-foreground">{initialThreatCardIds.length}/9</p><InitialThreatSetupEditor selectedCardIds={initialThreatCardIds} cityCards={cityCards} threatCards={threatCards} language={language} onChange={setInitialThreatCardIds} /></section> : null}
        {step === 2 ? <section className="space-y-3"><p className="text-sm text-muted-foreground">{startingHands.length}/{requiredTotal}</p><StartingHandAssignmentEditor players={campaign.players} requiredPerPlayer={requiredPerPlayer} selectedAssignments={startingHands} cityCards={cityCards} eventCards={eventCards} language={language} onChange={setStartingHands} /></section> : null}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep((current) => current - 1)}>{step === 0 ? (language === 'ko' ? '취소' : 'Cancel') : (language === 'ko' ? '이전' : 'Back')}</Button><Button disabled={!canContinue} onClick={() => step === 2 ? finish() : setStep((current) => current + 1)}>{step === 2 ? (language === 'ko' ? '적용' : 'Apply setup') : (language === 'ko' ? '다음' : 'Next')}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
