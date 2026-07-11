import type { GameState, PremiumItemConfig } from './types';

export type PremiumSpendResult =
  | { ok: true; state: GameState }
  | { ok: false; state: GameState; reason: 'insufficient_premium_ingots' | 'daily_limit_reached' };

export function spendPremiumItem(state: GameState, item: PremiumItemConfig): PremiumSpendResult {
  const boughtToday = state.premiumPurchaseHistory[item.id] ?? 0;
  if (item.dailyLimit !== null && boughtToday >= item.dailyLimit) {
    return { ok: false, state, reason: 'daily_limit_reached' };
  }

  if (state.premiumIngots < item.pricePremiumIngots) {
    return { ok: false, state, reason: 'insufficient_premium_ingots' };
  }

  return {
    ok: true,
    state: {
      ...state,
      premiumIngots: state.premiumIngots - item.pricePremiumIngots,
      premiumPurchaseHistory: {
        ...state.premiumPurchaseHistory,
        [item.id]: boughtToday + 1
      },
      updatedAt: Date.now()
    }
  };
}
