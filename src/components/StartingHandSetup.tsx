import { useEffect, useMemo, useState } from 'react';
import type { CityCard, EventCard, LanguageCode } from '../types/cards';
import type { PlayerProfile } from '../types/campaign';
import type { PlayerDeckState, StartingHandAssignment } from '../types/deck';
import { StartingHandAssignmentEditor } from './StartingHandAssignmentEditor';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  state: PlayerDeckState;
  players: PlayerProfile[];
  cityCards: CityCard[];
  eventCards: EventCard[];
  language: LanguageCode;
  onConfigure: (assignments: StartingHandAssignment[]) => void;
  forceEditing?: boolean;
}

export function StartingHandSetup({ state, players, cityCards, eventCards, language, onConfigure, forceEditing = false }: Props) {
  const configuredAssignments = useMemo(() => Object.values(state.cardStates)
    .filter((card) => card.zone === 'player-hand' && card.ownerPlayerId)
    .map((card) => ({ cardId: card.cardId, playerId: card.ownerPlayerId! })), [state.cardStates]);
  const [assignments, setAssignments] = useState<StartingHandAssignment[]>(configuredAssignments);
  const [editing, setEditing] = useState(forceEditing || !state.startingHand.configured);

  useEffect(() => {
    setAssignments(configuredAssignments);
    setEditing(forceEditing || !state.startingHand.configured);
  }, [configuredAssignments, forceEditing, state.startingHand.configured]);

  return (
    <Card className="xl:col-span-2">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{language === 'ko' ? '시작 손패 기록' : 'Starting hands'}</CardTitle>
        {state.startingHand.configured && !forceEditing && <Button variant="outline" type="button" onClick={() => setEditing((value) => !value)}>{editing ? (language === 'ko' ? '접기' : 'Collapse') : (language === 'ko' ? '수정' : 'Edit')}</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{assignments.length}/{state.startingHand.requiredTotal}</p>
        {!editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            {players.map((player) => (
              <div key={player.id} className="rounded-lg bg-muted p-4">
                <strong>{player.name}</strong>
                <p className="mt-2 text-sm text-muted-foreground">
                  {language === 'ko'
                    ? `시작 손패 ${configuredAssignments.filter((assignment) => assignment.playerId === player.id).length}장 설정됨`
                    : `${configuredAssignments.filter((assignment) => assignment.playerId === player.id).length} starting cards configured`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <StartingHandAssignmentEditor
              players={players}
              requiredPerPlayer={state.startingHand.requiredPerPlayer}
              selectedAssignments={assignments}
              cityCards={cityCards}
              eventCards={eventCards}
              language={language}
              onChange={setAssignments}
            />
            <Button type="button" disabled={assignments.length !== state.startingHand.requiredTotal} onClick={() => onConfigure(assignments)}>{language === 'ko' ? '시작 손패 저장' : 'Save starting hands'}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
