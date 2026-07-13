import { formatLocalDay } from './time';
import type { GameState, PremiumItemConfig } from './types';

export type PremiumSpendResult =
  | { ok: true; state: GameState }
  | { ok: false; state: GameState; reason: 'insufficient_premium_ingots' | 'daily_limit_reached' };

/** 跨天就把限购计数清零；同一天内累加。 */
export function resetPremiumPurchasesForDay(state: GameState, now = new Date()): GameState {
  const day = formatLocalDay(now);
  if (state.premiumPurchaseDate === day) return state;

  return { ...state, premiumPurchaseDate: day, premiumPurchaseHistory: {} };
}

export function spendPremiumItem(
  state: GameState,
  item: PremiumItemConfig,
  now = new Date()
): PremiumSpendResult {
  const normalized = resetPremiumPurchasesForDay(state, now);
  const boughtToday = normalized.premiumPurchaseHistory[item.id] ?? 0;

  if (item.dailyLimit !== null && boughtToday >= item.dailyLimit) {
    return { ok: false, state: normalized, reason: 'daily_limit_reached' };
  }

  if (normalized.premiumIngots < item.pricePremiumIngots) {
    return { ok: false, state: normalized, reason: 'insufficient_premium_ingots' };
  }

  return {
    ok: true,
    state: {
      ...normalized,
      premiumIngots: normalized.premiumIngots - item.pricePremiumIngots,
      premiumPurchaseHistory: {
        ...normalized.premiumPurchaseHistory,
        [item.id]: boughtToday + 1
      },
      updatedAt: now.getTime()
    }
  };
}
