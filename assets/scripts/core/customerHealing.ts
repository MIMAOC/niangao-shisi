import type { CustomerHealingLevelConfig } from './types';

export function getCustomerHealingLevel(
  points: number,
  levels: CustomerHealingLevelConfig[]
): CustomerHealingLevelConfig {
  const unlockedLevels = levels
    .filter((level) => points >= level.requiredHealingPoints)
    .sort((a, b) => b.level - a.level);

  if (unlockedLevels.length === 0) {
    throw new Error('No customer healing level is unlocked');
  }

  return unlockedLevels[0];
}
