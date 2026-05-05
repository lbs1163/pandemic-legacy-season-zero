import { useEffect, useMemo, useState } from 'react';
import { cityCards } from '../data/cards/cities';
import { eventCards } from '../data/cards/events';
import type { LanguageCode } from '../types/cards';
import type { PlayerProfile } from '../types/campaign';
import type { StartingHandAssignment } from '../types/deck';
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
  }) => void;
}

const playerCounts = [2, 3, 4] as const;

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

  const requiredPerPlayer = startingHandSizeForPlayers(playerCount);
  const requiredTotal = requiredPerPlayer * playerCount;
  const trimmedCampaignName = campaignName.trim();
  const validPlayers = players.length === playerCount && players.every((player) => player.name.trim().length > 0);
  const canContinue = step === 0
    ? trimmedCampaignName.length > 0
    : step === 1
      ? validPlayers
      : startingHands.length === requiredTotal;
  const stepLabel = language === 'ko' ? `${step + 1} / 3단계` : `Step ${step + 1} of 3`;

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
  }, [existingCampaignCount, language, open]);

  const changePlayerCount = (count: number) => {
    setPlayerCount(count);
    setPlayers((current) => Array.from({ length: count }, (_, index) => current[index] ?? { id: `p${index + 1}`, name: defaultPlayerName(language, index) }));
    setStartingHands([]);
  };

  const changePlayerName = (playerId: string, name: string) => {
    setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, name } : player));
  };

  const create = () => {
    if (!canContinue) return;
    onCreate({
      campaignName: trimmedCampaignName,
      players: players.map((player) => ({ ...player, name: player.name.trim() })),
      startingHands
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
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep((current) => current - 1)}>
            {step === 0 ? (language === 'ko' ? '취소' : 'Cancel') : (language === 'ko' ? '이전' : 'Back')}
          </Button>
          <Button type="button" disabled={!canContinue} onClick={() => step === 2 ? create() : setStep((current) => current + 1)}>
            {step === 2 ? (language === 'ko' ? '생성' : 'Create') : (language === 'ko' ? '다음' : 'Next')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}