import { getFoodHealingValue } from './customerHealing';
import type {
  ActiveOrder,
  CustomerHealingConfig,
  GameState,
  ItemId,
  OrderConfig,
  OrderDifficulty
} from './types';

const difficultyRank: Record<OrderDifficulty, number> = { easy: 1, normal: 2, hard: 3 };

export function completeOrder(
  state: GameState,
  order: OrderConfig,
  deliveredItemId: ItemId,
  healingConfig: CustomerHealingConfig
): GameState {
  const healingValue = getFoodHealingValue(order.customerType, deliveredItemId, healingConfig);
  return {
    ...state,
    coins: state.coins + order.rewards.coins,
    experience: state.experience + order.rewards.experience,
    customerHealingByType: {
      ...state.customerHealingByType,
      [order.customerType]: state.customerHealingByType[order.customerType] + healingValue
    },
    updatedAt: Date.now()
  };
}

export function createOrderQueue(
  orders: OrderConfig[],
  unlocked: string[],
  random: () => number = Math.random
): ActiveOrder[] {
  const eligible = orders.filter((order) => isOrderUnlocked(order, unlocked));
  const selected: ActiveOrder[] = [];

  while (selected.length < 3) {
    const next = selectOrder(eligible, selected, random);
    if (!next) throw new Error('Not enough eligible orders to create queue');
    selected.push(next);
  }

  return sortOrderQueue(selected);
}

export function replaceCompletedOrder(
  activeOrders: ActiveOrder[],
  completedInstanceId: string,
  orders: OrderConfig[],
  unlocked: string[],
  random: () => number = Math.random
): ActiveOrder[] {
  const remaining = activeOrders.filter((order) => order.instanceId !== completedInstanceId);
  if (remaining.length === activeOrders.length) return sortOrderQueue(activeOrders);

  const eligible = orders.filter((order) => isOrderUnlocked(order, unlocked));
  const next = selectOrder(eligible, remaining, random);
  if (!next) throw new Error('Not enough eligible orders to replace completed order');

  return sortOrderQueue([...remaining, next]);
}

export function sortOrderQueue(queue: ActiveOrder[]): ActiveOrder[] {
  return [...queue].sort((left, right) => difficultyRank[left.difficulty] - difficultyRank[right.difficulty]);
}

function selectOrder(
  eligible: OrderConfig[],
  existing: ActiveOrder[],
  random: () => number
): ActiveOrder | null {
  const occupiedIds = new Set(existing.map((order) => order.orderId));
  const hasEasy = existing.some((order) => order.difficulty === 'easy');
  const hardCount = existing.filter((order) => order.difficulty === 'hard').length;
  const candidates = eligible.filter(
    (order) => !occupiedIds.has(order.id) && (order.difficulty !== 'hard' || hardCount === 0)
  );
  const requiredDifficulty: OrderDifficulty | null = hasEasy ? pickDifficulty(random()) : 'easy';
  const sameDifficulty = candidates.filter((order) => order.difficulty === requiredDifficulty);
  const fallback = candidates.filter((order) => order.difficulty !== 'hard' || hardCount === 0);
  const picked = pickOne(sameDifficulty.length > 0 ? sameDifficulty : fallback, random);

  if (!picked) return null;
  return {
    instanceId: `${picked.id}#${existing.length + 1}`,
    orderId: picked.id,
    difficulty: picked.difficulty
  };
}

function pickDifficulty(value: number): OrderDifficulty {
  if (value < 0.5) return 'easy';
  if (value < 0.85) return 'normal';
  return 'hard';
}

function pickOne<T>(values: T[], random: () => number): T | null {
  if (values.length === 0) return null;
  return values[Math.min(Math.floor(random() * values.length), values.length - 1)];
}

function isOrderUnlocked(order: OrderConfig, unlocked: string[]): boolean {
  if (order.requiredItemId === 'any_level_3') {
    return unlocked.some((entry) => /_level_[3-9]\d*$/.test(entry));
  }

  const match = order.requiredItemId.match(/^(rice|tea|sweet_potato)_(\d+)$/);
  return match ? unlocked.includes(`${match[1]}_level_${match[2]}`) : false;
}
