import type { CurrencyCode, CustomerType, GameState } from './types';
import { createBoard } from './board';

const customerTypes: CustomerType[] = [
  'student',
  'worker',
  'elder',
  'courier',
  'medical',
  'couple',
  'mystery'
];

export function createInitialGameState(now = Date.now()): GameState {
  return {
    board: createBoard(),
    activeOrders: [],
    coins: 0,
    premiumIngots: 0,
    experience: 0,
    healingPoints: 0,
    stamina: 60,
    shopLevel: 1,
    petStageId: 'kitten',
    petIntimacy: 0,
    customerHealingByType: Object.fromEntries(
      customerTypes.map((type) => [type, 0])
    ) as GameState['customerHealingByType'],
    premiumPurchaseHistory: {},
    unlocked: ['rice_level_2'],
    updatedAt: now
  };
}

export function addCurrency(state: GameState, code: CurrencyCode, amount: number): GameState {
  if (amount < 0) {
    throw new Error('Amount must be positive');
  }

  return { ...state, [code]: state[code] + amount, updatedAt: Date.now() };
}
