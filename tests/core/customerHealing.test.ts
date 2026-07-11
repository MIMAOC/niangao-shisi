import { describe, expect, it } from 'vitest';
import { getCustomerHealingLevel } from '../../assets/scripts/core/customerHealing';
import type { CustomerHealingLevelConfig } from '../../assets/scripts/core/types';

const levels: CustomerHealingLevelConfig[] = [
  { level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 },
  { level: 2, requiredHealingPoints: 20, rewardType: 'coins_percent', rewardValue: 1 },
  { level: 3, requiredHealingPoints: 60, rewardType: 'order_rate_percent', rewardValue: 3 }
];

describe('customer healing', () => {
  it('returns highest unlocked healing level', () => {
    expect(getCustomerHealingLevel(59, levels).level).toBe(2);
    expect(getCustomerHealingLevel(60, levels).level).toBe(3);
  });
});
