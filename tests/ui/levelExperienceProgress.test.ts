import { describe, expect, it } from 'vitest';
import { getLevelExperienceProgress } from '../../assets/scripts/ui/levelExperienceProgress';

const levels = [
  { level: 1, cumulativeExperience: 0, unlocks: [] },
  { level: 2, cumulativeExperience: 30, unlocks: [] },
  { level: 3, cumulativeExperience: 75, unlocks: [] }
];

describe('level experience progress', () => {
  it('returns the current-level proportion and clamps it to the ring', () => {
    expect(getLevelExperienceProgress(-1, 1, levels)).toBe(0);
    expect(getLevelExperienceProgress(15, 1, levels)).toBe(0.5);
    expect(getLevelExperienceProgress(30, 2, levels)).toBe(0);
    expect(getLevelExperienceProgress(74, 2, levels)).toBeCloseTo(44 / 45);
    expect(getLevelExperienceProgress(100, 1, levels)).toBe(1);
  });

  it('fills the ring at the highest or an unknown level', () => {
    expect(getLevelExperienceProgress(75, 3, levels)).toBe(1);
    expect(getLevelExperienceProgress(10, 9, levels)).toBe(1);
  });
});
