import { useEffect, useState } from 'react';
import { cityCards } from '../data/cards/cities';
import { calculatePerformanceRating, getCampaignMonthSetupDefaults } from '../domain/campaignProgress';
import { monthLabels } from '../data/campaign/months';
import { formatLocalDateInputValue } from '../lib/date';
import type { LanguageCode } from '../types/cards';
import type { CampaignState, CharacterProfile, MissionResult } from '../types/campaign';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';

interface Props {
  open: boolean;
  campaign: CampaignState;
  language: LanguageCode;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { playedAt?: string; missionResults: MissionResult[]; maySouthAmericaControlCenterCityId?: string }) => void;
}

function formatCharacter(character: CharacterProfile) {
  return character.roleName ? `${character.name}(${character.roleName})` : character.name;
}

function getSovietTestMissionId(month: CampaignState['progress']['currentMonth']) {
  if (month === 'february') return 'february-mission-1';
  if (month === 'april') return 'april-mission-1';
  if (month === 'june') return 'june-mission-1';
  return undefined;
}

function getSovietTestCityIds(campaign: CampaignState): string[] {
  const sovietTestMissionId = getSovietTestMissionId(campaign.progress.currentMonth);
  if (!sovietTestMissionId) return [];

  return campaign.playerDeck.unidentifiedTargetCities
    ?.find((setup) => (setup.revealedRemovedCardIds?.length ?? 0) > 0)
    ?.revealedRemovedCardIds ?? [];
}

export function GameResultDialog({ open, campaign, language, onOpenChange, onSubmit }: Props) {
  const defaults = getCampaignMonthSetupDefaults(campaign);
  const [playedAt, setPlayedAt] = useState('');
  const [missionResults, setMissionResults] = useState<MissionResult[]>([]);
  const [maySouthAmericaControlCenterCityId, setMaySouthAmericaControlCenterCityId] = useState('');
  const sovietTestMissionId = getSovietTestMissionId(campaign.progress.currentMonth);
  const sovietTestCityIds = getSovietTestCityIds(campaign);
  const southAmericaCities = cityCards.filter((city) => city.region === 'south-america');
  const resultRating = calculatePerformanceRating(missionResults);
  const requiresMaySouthAmericaControlCenterCity = campaign.progress.currentMonth === 'may'
    && campaign.progress.currentAttempt === 1
    && resultRating === 'failure';

  useEffect(() => {
    if (!open) return;
    setPlayedAt(formatLocalDateInputValue());
    setMaySouthAmericaControlCenterCityId('');
    setMissionResults(defaults.missions.map((mission) => ({
      missionId: mission.id,
      succeeded: mission.id === sovietTestMissionId && sovietTestCityIds.length ? false : mission.defaultResult ?? false,
      cityResults: mission.id === sovietTestMissionId && sovietTestCityIds.length
        ? sovietTestCityIds.map((cityCardId) => ({ cityCardId, succeeded: false }))
        : undefined
    })));
  }, [defaults.missions, sovietTestCityIds.join('|'), sovietTestMissionId, open]);

  const submit = () => {
    onSubmit({
      playedAt: playedAt || undefined,
      missionResults,
      maySouthAmericaControlCenterCityId: requiresMaySouthAmericaControlCenterCity ? maySouthAmericaControlCenterCityId : undefined
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{language === 'ko' ? '게임 결과 기록' : 'Record game result'}</DialogTitle>
          <DialogDescription>{monthLabels[campaign.progress.currentMonth][language]} · {language === 'ko' ? `${campaign.progress.currentAttempt}번째 시도` : `Attempt ${campaign.progress.currentAttempt}`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-2"><span className="text-sm font-medium">{language === 'ko' ? '플레이 날짜' : 'Play date'}</span><Input type="date" value={playedAt} onChange={(event) => setPlayedAt(event.target.value)} /></label>
          {campaign.characters?.length ? <div className="rounded-lg border p-3 text-sm"><div className="font-semibold">{language === 'ko' ? '현재 캐릭터' : 'Current characters'}</div><p className="mt-1 text-muted-foreground">{campaign.characters.map(formatCharacter).join(', ')}</p></div> : null}
          <div className="space-y-2">
            <h3 className="font-semibold">{language === 'ko' ? '임무 결과' : 'Mission results'}</h3>
            {defaults.missions.length ? defaults.missions.map((mission) => {
              const result = missionResults.find((item) => item.missionId === mission.id);
              const isSovietTestMission = mission.id === sovietTestMissionId && Boolean(result?.cityResults?.length);
              return <div key={mission.id} className="space-y-3 rounded-lg border p-3">
                <label className="flex items-center gap-3"><input type="checkbox" checked={result?.succeeded ?? false} disabled={isSovietTestMission} onChange={(event) => setMissionResults((current) => current.map((item) => item.missionId === mission.id ? { ...item, succeeded: event.target.checked } : item))} /><span>{mission.name[language]}</span></label>
                {mission.description ? <p className="ml-6 text-xs text-muted-foreground">{mission.description[language]}</p> : null}
                {isSovietTestMission && result?.cityResults?.length ? <div className="ml-6 space-y-2 rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">{language === 'ko' ? '도시별 시험 저지 결과' : 'Test prevention by city'}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ko' ? '체크한 도시는 시험 저지 성공입니다. 1곳 이상 성공하면 임무 성공이며, 체크하지 않은 도시는 감염 카드가 추가됩니다.' : 'Checked cities were successfully protected. Preventing at least 1 city succeeds the mission. Unchecked cities add Infection cards.'}</p>
                  {result.cityResults.map((cityResult) => {
                    const city = cityCards.find((card) => card.id === cityResult.cityCardId);
                    return <label key={cityResult.cityCardId} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={cityResult.succeeded} onChange={(event) => setMissionResults((current) => current.map((item) => {
                      if (item.missionId !== mission.id) return item;
                      const cityResults = item.cityResults?.map((currentCityResult) => currentCityResult.cityCardId === cityResult.cityCardId ? { ...currentCityResult, succeeded: event.target.checked } : currentCityResult);
                      return { ...item, cityResults, succeeded: cityResults?.some((currentCityResult) => currentCityResult.succeeded) ?? false };
                    }))} /><span>{city?.name[language] ?? cityResult.cityCardId} {language === 'ko' ? '시험 저지 성공' : 'test prevented'}</span></label>;
                  })}
                </div> : null}
              </div>;
            }) : <p className="text-sm text-muted-foreground">{language === 'ko' ? '이 월의 임무 데이터는 아직 자리표시자입니다. 결과는 실패 0개로 기록됩니다.' : 'Mission data for this month is still placeholder-only; the result will record zero failed missions.'}</p>}
          </div>
          {requiresMaySouthAmericaControlCenterCity ? <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-amber-950">{language === 'ko' ? '남아메리카 관제소 도시' : 'South America control center city'}</span>
              <NativeSelect value={maySouthAmericaControlCenterCityId} onChange={(event) => setMaySouthAmericaControlCenterCityId(event.target.value)}>
                <option value="">{language === 'ko' ? '도시 선택' : 'Select a city'}</option>
                {southAmericaCities.map((city) => <option key={city.id} value={city.id}>{city.name[language]}</option>)}
              </NativeSelect>
            </label>
            <p className="text-xs text-amber-900">
              {language === 'ko'
                ? '5월 1차 시도 실패 시, 이번 준비에서 비공개로 제외했던 남아메리카 도시를 입력하세요. 2차 시도에서 임무 #3이 #3A로 바뀝니다.'
                : 'After failing the first May attempt, enter the hidden South America city removed during setup. Mission #3 changes to #3A on the second attempt.'}
            </p>
          </div> : null}
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{language === 'ko' ? '취소' : 'Cancel'}</Button><Button disabled={requiresMaySouthAmericaControlCenterCity && !maySouthAmericaControlCenterCityId} onClick={submit}>{language === 'ko' ? '저장' : 'Save result'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}