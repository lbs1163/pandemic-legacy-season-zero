# Implementation Plan

## Overview

2월 종료 후 공개되는 감염 카드 레거시 규칙을 덱 카운터에 반영한다. 2월 첫 번째 미션의 3개 시험 대상 도시별 성공/실패를 기록하고, 실패한 도시마다 해당 도시의 감염 카드를 캠페인 진행 상태에 추가한다. 이후 월 준비 시 감염 카드는 일반 위협 덱 미지 더미가 아니라 `버린 위협 카드` 구획에서 시작하며, 첫 악화로 버림 구획이 섞인 뒤에는 일반 위협 카드와 같은 위협 덱 흐름에서 드로우된다.

앱은 덱 상태만 추적하므로 감염 카드 드로우 시 질병 큐브 수를 저장하지 않고 “해당 도시에 질병 큐브 1개를 놓으세요” 안내만 표시한다.

## Types and Data

- `src/types/cards.ts`
  - `ThreatCardType = 'threat' | 'infection'` 추가.
  - `ThreatCard.threatCardType?: ThreatCardType` 추가.
  - `kind`는 기존 UI/도메인 호환성을 위해 `'threat'`로 유지.

- `src/types/campaign.ts`
  - `MissionResult.cityResults?: MissionCityResult[]` 추가.
  - `MissionCityResult = { cityCardId: string; succeeded: boolean }` 추가.
  - `CampaignProgressState.infectionCardIds: string[]` 추가.

- `src/data/cards/threats.ts`
  - 기존 `threatCards`는 `threatCardType: 'threat'`로 유지.
  - 도시별 `infectionCards` 추가.
  - `getInfectionCardIdForCity(cityCardId)`와 `getThreatCardsForCampaign(infectionCardIds)` helper 추가.

## Domain Logic

- `src/domain/campaignProgress.ts`
  - `applyGameResult`에서 현재 월이 2월이면 `february-mission-1.cityResults`를 읽고, 실패한 도시마다 감염 카드 ID를 `progress.infectionCardIds`에 누적한다.
  - `createGameDecksForMonth`에서 일반 위협 카드 9장을 기존처럼 버림 구획에 놓은 뒤, `progress.infectionCardIds`를 같은 버림 구획에 추가한다.

- `src/domain/threatDeck.ts`
  - `addThreatCardsToDiscard(state, cardIds, now?)` helper 추가.
  - 새 감염 카드처럼 기존 초기 위협 덱에 없던 카드도 `threat-discard`로 등록한다.
  - 기존 `intensifyThreatDiscard`/`recordThreatDraw` 흐름은 그대로 사용하므로, 감염 카드는 악화 이후 알려진 상단 묶음에서 일반 위협 카드처럼 처리된다.

## UI

- `src/components/GameResultDialog.tsx`
  - 2월 결과 기록 시 첫 번째 미션 아래에 2월 준비에서 공개 제외한 아프리카 3개 도시를 표시한다.
  - 각 도시 체크박스는 “시험 저지 성공”을 의미하며, 체크되지 않은 도시는 감염 카드 추가 대상이다.

- `src/components/DeckCounterDashboard.tsx`, `src/App.tsx`
  - 캠페인의 `infectionCardIds`를 반영한 위협/감염 카드 목록을 위협 덱 UI에 전달한다.

- `src/components/TurnFlowPanel.tsx`
  - 위협 공개 단계에서 감염 카드를 선택하면 질병 큐브 1개 배치 안내를 표시한다.

- `src/components/ThreatDeckPanel.tsx`
  - 감염 카드는 위협 덱 구역 목록에서 “감염 카드”로 표시한다.

## Persistence

- `src/services/localCache.ts`
  - `missionResultSchema.cityResults`를 optional로 추가한다.
  - 기존 저장 데이터에 `progress.infectionCardIds`가 없어도 `[]`로 hydrate한다.
  - 오래된 migration에서 새 progress를 만들 때도 `infectionCardIds: []`를 채운다.

## Documentation and Rules

- `src/data/rules/legacyRules.ts`
  - `legacy-infection-cards` 토글 추가.

- `docs/ko/legacy-rules.md`, `docs/en/legacy-rules.md`
  - 레거시 규칙 B/Y의 감염 카드 준비, 악화 후 드로우, 질병 큐브 안내를 문서화한다.

## Testing

- `src/__tests__/campaignProgress.test.ts`
  - 2월 첫 미션 도시별 실패가 감염 카드 ID로 누적되는지 검증.
  - 이후 월 준비 시 감염 카드가 `discardCardIds`와 `cardStates`의 `threat-discard`에 들어가는지 검증.

- `src/__tests__/threatDeck.test.ts`
  - `addThreatCardsToDiscard`가 신규 감염 카드를 버림 구획에 추가하는지 검증.

- `src/__tests__/turnFlow.test.ts`
  - 감염 카드가 악화 후 known top stack에서 일반 위협 카드처럼 드로우되는지 검증.

- `src/__tests__/campaignPersistence.test.ts`
  - 기존 저장 데이터에서 `infectionCardIds` 누락 시 `[]`로 hydrate되는지 검증.

## Validation and Commit Workflow

1. `git status --short`로 변경 파일 확인.
2. 관련 테스트와 전체 테스트 실행: `npm test`.
3. TypeScript/production build 검증: `npm run build`.
4. 변경 파일만 stage.
5. Commit message: `Add infection cards to campaign flow`.
6. `.clinerules`에 따라 현재 브랜치에 push.
7. 완료 보고에 commit hash, branch, push result, validation commands를 포함.