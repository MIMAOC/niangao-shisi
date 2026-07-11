import { describe, expect, it } from 'vitest';
import { loadGameConfig, type RawGameConfig } from '../../assets/scripts/core/config';

const rawConfig: RawGameConfig = {
  items: [
    { id: 'rice_1', name: '米粒', chain: 'rice', level: 1, nextId: 'rice_2', icon: 'icons/rice_1' },
    { id: 'rice_2', name: '米团', chain: 'rice', level: 2, nextId: null, icon: 'icons/rice_2' }
  ],
  orders: [
    {
      id: 'O01',
      requiredItemId: 'rice_2',
      customerType: 'student',
      customerName: '放学学生',
      line: '想吃一点热乎的。',
      rewards: { coins: 8, experience: 3, healingPoints: 1 }
    }
  ],
  levels: [{ level: 1, cumulativeExperience: 0, unlocks: ['rice_level_2'] }],
  petStages: [
    {
      id: 'kitten',
      unlockShopLevel: 1,
      acceptedFoodIds: ['sheep_milk'],
      bonus: { type: 'bring_item', value: 1 }
    }
  ],
  petFoods: [{ id: 'sheep_milk', name: '羊奶', priceCoins: 5, intimacyGain: 3, allowedStages: ['kitten'] }],
  customerHealing: {
    student: [{ level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 }],
    worker: [{ level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 }],
    elder: [{ level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 }],
    courier: [{ level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 }],
    medical: [{ level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 }],
    couple: [{ level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 }],
    mystery: [{ level: 1, requiredHealingPoints: 0, rewardType: 'none', rewardValue: 0 }]
  },
  premiumItems: [
    { id: 'refresh_order', name: '刷新订单券', pricePremiumIngots: 5, effect: 'refresh_order', dailyLimit: 10 }
  ]
};

describe('loadGameConfig', () => {
  it('returns typed config when required arrays are present', () => {
    const config = loadGameConfig(rawConfig);

    expect(config.items).toHaveLength(2);
    expect(config.orders[0].id).toBe('O01');
    expect(config.premiumItems[0].pricePremiumIngots).toBe(5);
  });

  it('throws when an item has invalid level', () => {
    const invalid = structuredClone(rawConfig);
    invalid.items[0].level = 0;

    expect(() => loadGameConfig(invalid)).toThrow('Invalid item level: rice_1');
  });
});
