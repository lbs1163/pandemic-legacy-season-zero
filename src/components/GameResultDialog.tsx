import { useEffect, useState } from 'react';
import { getMonthSetupDefaults } from '../domain/campaignProgress';
import { monthLabels } from '../data/campaign/months';
import { formatLocalDateInputValue } from '../lib/date';
import type { LanguageCode } from '../types/cards';
import type { CampaignState, MissionResult } from '../types/campaign';
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

export function GameResultDialog({ open, campaign, language, onOpenChange, onSubmit }: Props) {
  const defaults = getMonthSetupDefaults(campaign.progress.currentMonth);
  const [playedAt, setPlayedAt] = useState('');
  const [missionResults, setMissionResults] = useState<MissionResult[]>([]);

  useEffect(() => {
    if (!open) return;
    setPlayedAt(formatLocalDateInputValue());
    setMissionResults(defaults.missions.map((mission) => ({ missionId: mission.id, succeeded: mission.defaultResult ?? false })));
  }, [defaults.missions, open]);

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
          {campaign.characters?.length ? <div className="rounded-lg border p-3 text-sm"><div className="font-semibold">{language === 'ko' ? '현재 캐릭터' : 'Current characters'}</div><p className="mt-1 text-muted-foreground">{campaign.characters.map((character) => character.name).join(', ')}</p></div> : null}
          <div className="space-y-2">
            <h3 className="font-semibold">{language === 'ko' ? '임무 결과' : 'Mission results'}</h3>
            {defaults.missions.length ? defaults.missions.map((mission) => {
              const result = missionResults.find((item) => item.missionId === mission.id);
              return <label key={mission.id} className="flex items-center gap-3 rounded-lg border p-3"><input type="checkbox" checked={result?.succeeded ?? false} onChange={(event) => setMissionResults((current) => current.map((item) => item.missionId === mission.id ? { ...item, succeeded: event.target.checked } : item))} /><span>{mission.name[language]}</span></label>;
            }) : <p className="text-sm text-muted-foreground">{language === 'ko' ? '이 월의 임무 데이터는 아직 자리표시자입니다. 결과는 실패 0개로 기록됩니다.' : 'Mission data for this month is still placeholder-only; the result will record zero failed missions.'}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>{language === 'ko' ? '취소' : 'Cancel'}</Button><Button onClick={submit}>{language === 'ko' ? '저장' : 'Save result'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}