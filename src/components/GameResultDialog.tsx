import { useEffect, useState } from 'react';
import { cityCards } from '../data/cards/cities';
import { getMonthSetupDefaults } from '../domain/campaignProgress';
import { monthLabels } from '../data/campaign/months';
import { formatLocalDateInputValue } from '../lib/date';
import type { LanguageCode } from '../types/cards';
import type { CampaignState, CharacterProfile, MissionResult } from '../types/campaign';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

interface Props {
  open: boolean;
  campaign: CampaignState;
  language: LanguageCode;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { playedAt?: string; missionResults: MissionResult[] }) => void;
}

function formatCharacter(character: CharacterProfile) {
  return character.roleName ? `${character.name}(${character.roleName})` : character.name;
}

export function GameResultDialog({ open, campaign, language, onOpenChange, onSubmit }: Props) {
  const defaults = getMonthSetupDefaults(campaign.progress.currentMonth);
  const [playedAt, setPlayedAt] = useState('');
  const [missionResults, setMissionResults] = useState<MissionResult[]>([]);
  const februaryTestCityIds = campaign.progress.currentMonth === 'february'
    ? campaign.playerDeck.unidentifiedTargetCities?.[0]?.revealedRemovedCardIds ?? []
    : [];

  useEffect(() => {
    if (!open) return;
    setPlayedAt(formatLocalDateInputValue());
    setMissionResults(defaults.missions.map((mission) => ({
      missionId: mission.id,
      succeeded: mission.defaultResult ?? false,
      cityResults: mission.id === 'february-mission-1' && februaryTestCityIds.length
        ? februaryTestCityIds.map((cityCardId) => ({ cityCardId, succeeded: false }))
        : undefined
    })));
  }, [defaults.missions, februaryTestCityIds.join('|'), open]);

  const submit = () => {
    onSubmit({ playedAt: playedAt || undefined, missionResults });
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
              return <div key={mission.id} className="space-y-3 rounded-lg border p-3">
                <label className="flex items-center gap-3"><input type="checkbox" checked={result?.succeeded ?? false} onChange={(event) => setMissionResults((current) => current.map((item) => item.missionId === mission.id ? { ...item, succeeded: event.target.checked } : item))} /><span>{mission.name[language]}</span></label>
                {mission.id === 'february-mission-1' && result?.cityResults?.length ? <div className="ml-6 space-y-2 rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">{language === 'ko' ? '도시별 시험 저지 결과' : 'Test prevention by city'}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ko' ? '체크한 도시는 시험 저지 성공입니다. 체크하지 않은 도시는 감염 카드가 추가됩니다.' : 'Checked cities were successfully protected. Unchecked cities add Infection cards.'}</p>
                  {result.cityResults.map((cityResult) => {
                    const city = cityCards.find((card) => card.id === cityResult.cityCardId);
                    return <label key={cityResult.cityCardId} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={cityResult.succeeded} onChange={(event) => setMissionResults((current) => current.map((item) => item.missionId === mission.id ? { ...item, cityResults: item.cityResults?.map((currentCityResult) => currentCityResult.cityCardId === cityResult.cityCardId ? { ...currentCityResult, succeeded: event.target.checked } : currentCityResult) } : item))} /><span>{city?.name[language] ?? cityResult.cityCardId} {language === 'ko' ? '시험 저지 성공' : 'test prevented'}</span></label>;
                  })}
                </div> : null}
              </div>;
            }) : <p className="text-sm text-muted-foreground">{language === 'ko' ? '이 월의 임무 데이터는 아직 자리표시자입니다. 결과는 실패 0개로 기록됩니다.' : 'Mission data for this month is still placeholder-only; the result will record zero failed missions.'}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{language === 'ko' ? '취소' : 'Cancel'}</Button><Button onClick={submit}>{language === 'ko' ? '저장' : 'Save result'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}