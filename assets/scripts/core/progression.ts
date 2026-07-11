import type { LevelConfig } from './types';

export function getShopLevel(experience: number, levels: LevelConfig[]): number {
  const unlockedLevels = levels
    .filter((level) => experience >= level.cumulativeExperience)
    .sort((a, b) => b.level - a.level);

  if (unlockedLevels.length === 0) {
    throw new Error('No shop level is unlocked');
  }

  return unlockedLevels[0].level;
}
