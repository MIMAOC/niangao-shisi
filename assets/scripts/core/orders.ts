import type { GameState, OrderConfig } from './types';

export function completeOrder(state: GameState, order: OrderConfig): GameState {
  return {
    ...state,
    coins: state.coins + order.rewards.coins,
    experience: state.experience + order.rewards.experience,
    healingPoints: state.healingPoints + order.rewards.healingPoints,
    customerHealingByType: {
      ...state.customerHealingByType,
      [order.customerType]: state.customerHealingByType[order.customerType] + order.rewards.healingPoints
    },
    updatedAt: Date.now()
  };
}
