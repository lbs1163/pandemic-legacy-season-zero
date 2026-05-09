import { describe, expect, it } from 'vitest';
import { monthLabels } from '../data/campaign/months';
import { uiText } from '../i18n/uiText';

describe('uiText', () => {
  it('defines dismiss alert labels for every language', () => {
    expect(uiText.en.dismissAlert).toBe('Dismiss alert');
    expect(uiText.ko.dismissAlert).toBe('알림 닫기');
  });

  it('keeps reset storage alert translations available by key', () => {
    expect(uiText.en.resetStorageDone).toBe('Local saved data has been reset.');
    expect(uiText.ko.resetStorageDone).toBe('로컬 저장 데이터가 초기화되었습니다.');
  });

  it('defines translated month labels for campaign month ids', () => {
    expect(monthLabels.january.en).toBe('January');
    expect(monthLabels.january.ko).toBe('1월');
    expect(monthLabels.february.en).toBe('February');
    expect(monthLabels.february.ko).toBe('2월');
  });
});