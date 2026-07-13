import type { CustomerHealingConfig, CustomerType, CustomerUnlockConfig, ItemId } from './types';

export interface CustomerHealingProgress {
  level: number;
  pointsIntoLevel: number;
  pointsRequired: number;
}

export function getCustomerHealingProgress(
  points: number,
  config: CustomerHealingConfig
): CustomerHealingProgress {
  let cumulative = 0;

  for (let index = 0; index < config.levelRequirements.length; index += 1) {
    const required = config.levelRequirements[index];
    if (points < cumulative + required) {
      return { level: index + 1, pointsIntoLevel: points - cumulative, pointsRequired: required };
    }
    cumulative += required;
  }

  return { level: config.levelRequirements.length + 1, pointsIntoLevel: 0, pointsRequired: 0 };
}

export function getFoodHealingValue(
  customerType: CustomerType,
  foodId: ItemId,
  config: CustomerHealingConfig
): number {
  const value = config.customers[customerType]?.foodHealing[foodId];
  if (value === undefined) {
    throw new Error(`Missing healing value: ${customerType}/${foodId}`);
  }
  return value;
}

export function getNewCustomerUnlocks(
  customerType: CustomerType,
  previousPoints: number,
  nextPoints: number,
  config: CustomerHealingConfig
): CustomerUnlockConfig[] {
  const previousLevel = getCustomerHealingProgress(previousPoints, config).level;
  const nextLevel = getCustomerHealingProgress(nextPoints, config).level;
  return (config.customers[customerType]?.unlocks ?? []).filter(
    (unlock) => unlock.level > previousLevel && unlock.level <= nextLevel
  );
}
