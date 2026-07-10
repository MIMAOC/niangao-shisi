import { describe, expect, it } from 'vitest';
import type { CurrencyCode } from '../../assets/scripts/core/types';

describe('test harness', () => {
  it('runs TypeScript tests', () => {
    const currency: CurrencyCode = 'premiumIngots';
    expect(currency).toBe('premiumIngots');
  });
});
