import { describe, expect, it } from 'vitest';
import { formatLocalDateInputValue } from '../lib/date';

describe('date utilities', () => {
  it('formats a Date using local calendar fields for date inputs', () => {
    expect(formatLocalDateInputValue(new Date(2026, 4, 10, 1, 0))).toBe('2026-05-10');
  });
});