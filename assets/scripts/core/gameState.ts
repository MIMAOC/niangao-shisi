import type { CurrencyCode, CustomerType, GameState } from './types';
import { createBoard, BOARD_SIZE } from './board';
import { INITIAL_BACKPACK_CAPACITY } from './backpack';
import { formatLocalDay } from './time';

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
  const day = formatLocalDay(new Date(now));

  return {
    board: createBoard(),
    backpackCellIndex: BOARD_SIZE - 1,
    backpackCapacity: INITIAL_BACKPACK_CAPACITY,
    backpackItemIds: [],
    prepStationCellIndex: BOARD_SIZE - 2,
    activeOrders: [],
    coins: 0,
    premiumIngots: 0,
    experience: 0,
    stamina: 100,
    staminaUpdatedAt: now,
    staminaAdDate: day,
    staminaAdViews: 0,
    shopLevel: 1,
    petStageId: 'kitten',
    petIntimacy: 0,
    customerHealingByType: Object.fromEntries(
      customerTypes.map((type) => [type, 0])
    ) as GameState['customerHealingByType'],
    premiumPurchaseDate: day,
    premiumPurchaseHistory: {},
    unlocked: ['rice_level_2', 'tea_level_2', 'sweet_potato_level_2'],
    updatedAt: now
  };
}

export function addCurrency(
  state: GameState,
  code: CurrencyCode,
  amount: number,
  now = Date.now()
): GameState {
  if (amount < 0) {
    throw new Error('Amount must be positive');
  }

  return { ...state, [code]: state[code] + amount, updatedAt: now };
}
