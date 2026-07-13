import { describe, expect, it } from 'vitest';
import { loadGameConfig, type RawGameConfig } from '../../assets/scripts/core/config';

const rawConfig: RawGameConfig = {
  items: [
    { id: 'rice_1', name: '米粒', chain: 'rice', level: 1, nextId: 'rice_2', icon: 'icons/rice_1', description: '新碾的糯米。' },
    { id: 'rice_2', name: '米团', chain: 'rice', level: 2, nextId: null, icon: 'icons/rice_2', description: '揉成团的米。' }
  ],
  orders: [
    {
      id: 'O01',
      requiredItemId: 'rice_2',
      customerType: 'student',
      customerName: '放学学生',
      line: '想吃一点热乎的。',
      difficulty: 'easy',
      rewards: { coins: 8, experience: 3 }
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
    levelRequirements: [100, 220, 400, 650, 1000, 1500, 2200, 3100, 4200],
    customers: {
      student: {
        favoriteFoodIds: ['rice_2'],
        foodHealing: { rice_2: 18 },
        unlocks: []
      }
    }
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
