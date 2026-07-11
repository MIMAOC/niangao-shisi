import { describe, expect, it } from 'vitest';
import { getShopLevel } from '../../assets/scripts/core/progression';
import type { LevelConfig } from '../../assets/scripts/core/types';

const levels: LevelConfig[] = [
  { level: 1, cumulativeExperience: 0, unlocks: [] },
  { level: 2, cumulativeExperience: 30, unlocks: [] },
  { level: 3, cumulativeExperience: 75, unlocks: [] }
];

describe('progression', () => {
  it('calculates shop level from cumulative experience', () => {
    expect(getShopLevel(74, levels)).toBe(2);
    expect(getShopLevel(75, levels)).toBe(3);
  });
});
