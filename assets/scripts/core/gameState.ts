import type { CurrencyCode, CustomerType, GameState } from './types';
import { createBoard } from './board';
import { INITIAL_BACKPACK_CAPACITY } from './backpack';

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
    backpackCellIndex: 62,
    backpackCapacity: INITIAL_BACKPACK_CAPACITY,
    backpackItemIds: [],
    prepStationCellIndex: 61,
    activeOrders: [],
    coins: 0,
    premiumIngots: 0,
    experience: 0,
    stamina: 100,
    staminaUpdatedAt: now,
    staminaAdDate: formatLocalDay(new Date(now)),
    staminaAdViews: 0,
    shopLevel: 1,
    petStageId: 'kitten',
    petIntimacy: 0,
    customerHealingByType: Object.fromEntries(
      customerTypes.map((type) => [type, 0])
    ) as GameState['customerHealingByType'],
    premiumPurchaseHistory: {},
    unlocked: ['rice_level_2', 'tea_level_2', 'sweet_potato_level_2'],
    updatedAt: now
  };
}

function formatLocalDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addCurrency(state: GameState, code: CurrencyCode, amount: number): GameState {
  if (amount < 0) {
    throw new Error('Amount must be positive');
  }

  return { ...state, [code]: state[code] + amount, updatedAt: Date.now() };
}
