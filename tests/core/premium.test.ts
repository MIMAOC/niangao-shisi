import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import { spendPremiumItem } from '../../assets/scripts/core/premium';
import type { PremiumItemConfig } from '../../assets/scripts/core/types';

const item: PremiumItemConfig = {
  id: 'refresh_order',
  name: '刷新订单券',
  pricePremiumIngots: 5,
  effect: 'refresh_order',
  dailyLimit: 10
};

const day1 = new Date(1000);
const day2 = new Date(1000 + 24 * 60 * 60 * 1000);

describe('premium currency', () => {
  it('rejects spend when premium ingots are insufficient', () => {
    const result = spendPremiumItem(createInitialGameState(1000), item, day1);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected premium purchase to be rejected');
    }
    expect(result.reason).toBe('insufficient_premium_ingots');
  });

  it('spends premium ingots and records purchase count', () => {
    const state = { ...createInitialGameState(1000), premiumIngots: 20 };
    const result = spendPremiumItem(state, item, day1);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected premium purchase to succeed');
    }
    expect(result.state.premiumIngots).toBe(15);
    expect(result.state.premiumPurchaseHistory.refresh_order).toBe(1);
  });

  it('rejects a purchase when its daily limit is reached', () => {
    const state = {
      ...createInitialGameState(1000),
      premiumIngots: 20,
      premiumPurchaseHistory: { refresh_order: 10 }
    };
    const result = spendPremiumItem(state, item, day1);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected daily purchase limit to reject the purchase');
    }
    expect(result.reason).toBe('daily_limit_reached');
  });

  it('clears the purchase count on a new day so the daily limit is really daily', () => {
    const state = {
      ...createInitialGameState(1000),
      premiumIngots: 20,
      premiumPurchaseHistory: { refresh_order: 10 }
    };
    const result = spendPremiumItem(state, item, day2);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected the daily limit to reset on a new day');
    }
    expect(result.state.premiumPurchaseHistory.refresh_order).toBe(1);
    expect(result.state.premiumPurchaseDate).not.toBe(state.premiumPurchaseDate);
  });
});
