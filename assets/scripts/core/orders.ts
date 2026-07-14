import { getFoodHealingValue, getNewCustomerUnlocks } from './customerHealing';
import { pickOne } from './random';
import type {
  ActiveOrder,
  BoardCell,
  CustomerHealingConfig,
  GameState,
  ItemConfig,
  ItemId,
  OrderConfig,
  OrderDifficulty
} from './types';
import type { OrderRequirement } from './types';

const difficultyRank: Record<OrderDifficulty, number> = { easy: 1, normal: 2, hard: 3 };

export function completeOrder(
  state: GameState,
  order: OrderConfig,
  deliveredItemIds: ItemId | ItemId[],
  healingConfig: CustomerHealingConfig,
  now = Date.now()
): GameState {
  const previousHealing = state.customerHealingByType[order.customerType];
  const submittedIds = Array.isArray(deliveredItemIds) ? deliveredItemIds : [deliveredItemIds];
  const healingValue = submittedIds.reduce(
    (total, itemId) => total + getFoodHealingValue(order.customerType, itemId, healingConfig),
    0
  );
  const nextHealing = previousHealing + healingValue;
  const newUnlocks = getNewCustomerUnlocks(
    order.customerType,
    previousHealing,
    nextHealing,
    healingConfig
  );
  return {
    ...state,
    coins: state.coins + order.rewards.coins,
    experience: state.experience + order.rewards.experience,
    customerHealingByType: {
      ...state.customerHealingByType,
      [order.customerType]: nextHealing
    },
    unlocked: [...new Set([...state.unlocked, ...newUnlocks.map((unlock) => unlock.id)])],
    updatedAt: now
  };
}

export interface OrderRequirementMatch {
  requirement: OrderRequirement;
  matchedCellIndexes: number[];
  fulfilled: boolean;
}

export interface OrderBoardMatch {
  complete: boolean;
  matchedCellIndexes: number[];
  requirements: OrderRequirementMatch[];
}

export function getOrderRequirements(order: OrderConfig): OrderRequirement[] {
  return order.requirements?.length
    ? order.requirements
    : [{ itemId: order.requiredItemId, quantity: 1 }];
}

/**
 * 每张订单单独从棋盘找可交付食材；不会把匹配结果写回棋盘，所以同一食材可同时点亮多张订单。
 */
export function getOrderBoardMatch(
  order: OrderConfig,
  board: BoardCell[],
  items: ItemConfig[]
): OrderBoardMatch {
  const usedCellIndexes = new Set<number>();
  const requirements = [...getOrderRequirements(order)].sort((left, right) => {
    const leftWildcard = left.itemId === 'any_level_3' ? 1 : 0;
    const rightWildcard = right.itemId === 'any_level_3' ? 1 : 0;
    return leftWildcard - rightWildcard;
  });
  const matches = requirements.map((requirement) => {
    const matchedCellIndexes = board
      .filter((cell) => cell.itemId !== null && !usedCellIndexes.has(cell.index))
      .filter((cell) => cell.itemId !== null && isRequirementItem(requirement, cell.itemId, items))
      .slice(0, requirement.quantity)
      .map((cell) => cell.index);

    matchedCellIndexes.forEach((index) => usedCellIndexes.add(index));
    return {
      requirement,
      matchedCellIndexes,
      fulfilled: matchedCellIndexes.length === requirement.quantity
    };
  });

  return {
    complete: matches.every((match) => match.fulfilled),
    matchedCellIndexes: matches.flatMap((match) => match.matchedCellIndexes).sort((left, right) => left - right),
    requirements: matches
  };
}

export function isOrderRequirementMet(
  order: OrderConfig,
  deliveredItemId: ItemId,
  items: ItemConfig[]
): boolean {
  return getOrderRequirements(order).some((requirement) => (
    isRequirementItem(requirement, deliveredItemId, items)
  ));
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

function isOrderUnlocked(order: OrderConfig, unlocked: string[]): boolean {
  return getOrderRequirements(order).every((requirement) => isRequirementUnlocked(requirement, unlocked));
}

function isRequirementItem(requirement: OrderRequirement, itemId: ItemId, items: ItemConfig[]): boolean {
  if (requirement.itemId === itemId) return true;
  if (requirement.itemId !== 'any_level_3') return false;
  return (items.find((item) => item.id === itemId)?.level ?? 0) >= 3;
}

function isRequirementUnlocked(requirement: OrderRequirement, unlocked: string[]): boolean {
  if (requirement.itemId === 'any_level_3') {
    return unlocked.some((entry) => /_level_[3-9]\d*$/.test(entry));
  }

  const match = requirement.itemId.match(/^(rice|tea|sweet_potato)_(\d+)$/);
  return match ? unlocked.includes(`${match[1]}_level_${match[2]}`) : false;
}
