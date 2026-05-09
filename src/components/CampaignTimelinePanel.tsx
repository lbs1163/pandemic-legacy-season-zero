import { monthLabels } from '../data/campaign/months';
import type { LanguageCode } from '../types/cards';
import type { CampaignState } from '../types/campaign';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface Props {
  campaign: CampaignState;
  language: LanguageCode;
}

const ratingLabels = {
  en: { success: 'Success', adequate: 'Adequate', failure: 'Failure' },
  ko: { success: '성공', adequate: '보통', failure: '실패' }
} as const;

export function CampaignTimelinePanel({ campaign, language }: Props) {
  const records = campaign.progress.gameRecords;
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>{language === 'ko' ? '캠페인 진행 기록' : 'Campaign timeline'}</CardTitle>
        <CardDescription>
          {language === 'ko'
            ? '프롤로그부터 12월까지 각 게임의 자금, 플레이어/캐릭터, 날짜, 평가를 기록합니다.'
            : 'Records funding, players/characters, date, and rating from Prologue through December.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {campaign.progress.nonSpoilerWarnings.map((warning) => <p key={warning} className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{warning}</p>)}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ko' ? '월' : 'Month'}</TableHead>
              <TableHead>{language === 'ko' ? '시도' : 'Attempt'}</TableHead>
              <TableHead>{language === 'ko' ? '자금' : 'Funding'}</TableHead>
              <TableHead>{language === 'ko' ? '플레이어/캐릭터' : 'Players/characters'}</TableHead>
              <TableHead>{language === 'ko' ? '플레이 날짜' : 'Play date'}</TableHead>
              <TableHead>{language === 'ko' ? '평가' : 'Rating'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length ? records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{monthLabels[record.month][language]}</TableCell>
                <TableCell>{record.attempt}</TableCell>
                <TableCell>{record.fundingLevel}</TableCell>
                <TableCell>{record.characters.length ? record.characters.map((character) => character.name).join(', ') : record.players.map((player) => player.name).join(', ')}</TableCell>
                <TableCell>{record.playedAt ?? '—'}</TableCell>
                <TableCell>{record.performanceRating ? ratingLabels[language][record.performanceRating] : '—'}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">{language === 'ko' ? '아직 기록된 게임 결과가 없습니다.' : 'No game results recorded yet.'}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}