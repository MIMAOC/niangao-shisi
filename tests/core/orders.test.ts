import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import { completeOrder, createOrderQueue, replaceCompletedOrder } from '../../assets/scripts/core/orders';
import type { CustomerHealingConfig, OrderConfig } from '../../assets/scripts/core/types';

const order: OrderConfig = {
  id: 'O01',
  requiredItemId: 'rice_2',
  customerType: 'student',
  customerName: '放学学生',
  line: '想吃一点热乎的。',
  difficulty: 'easy',
  rewards: { coins: 8, experience: 3 }
};

const queueOrders: OrderConfig[] = [
  order,
  { ...order, id: 'O02', requiredItemId: 'tea_2', customerType: 'worker', customerName: '晚归上班族', difficulty: 'easy' },
  { ...order, id: 'O03', requiredItemId: 'sweet_potato_2', customerType: 'elder', customerName: '散步老人', difficulty: 'easy' },
  { ...order, id: 'O04', requiredItemId: 'rice_3', difficulty: 'normal' },
  { ...order, id: 'O05', requiredItemId: 'tea_4', difficulty: 'hard' }
];

const unlocked = ['rice_level_2', 'tea_level_2', 'sweet_potato_level_2', 'rice_level_3', 'tea_level_4'];

const healingConfig: CustomerHealingConfig = {
  levelRequirements: [100],
  customers: {
    student: { favoriteFoodIds: ['rice_2'], foodHealing: { rice_2: 18 }, unlocks: [] }
  }
};

describe('orders', () => {
  it('adds rewards and healing only to the matching customer type', () => {
    const state = createInitialGameState(1000);
    const result = completeOrder(state, order, 'rice_2', healingConfig);

    expect(result.coins).toBe(8);
    expect(result.experience).toBe(3);
    expect('healingPoints' in result).toBe(false);
    expect(result.customerHealingByType.student).toBe(18);
    expect(result.customerHealingByType.worker).toBe(0);
  });

  it('creates a sorted queue from unlocked orders with at least one easy order and no more than one hard order', () => {
    const queue = createOrderQueue(queueOrders, unlocked, () => 0.9);

    expect(queue).toHaveLength(3);
    expect(queue.map((entry) => entry.difficulty)).toEqual(['easy', 'normal', 'hard']);
    expect(new Set(queue.map((entry) => entry.orderId)).size).toBe(3);
  });

  it('replaces a completed order with a new order and sorts the whole queue again', () => {
    const queue = createOrderQueue(queueOrders, unlocked, () => 0.9);
    const next = replaceCompletedOrder(queue, queue[0].instanceId, queueOrders, unlocked, () => 0);

    expect(next).toHaveLength(3);
    expect(next.map((entry) => entry.difficulty)).toEqual(['easy', 'normal', 'hard']);
    expect(next.some((entry) => entry.orderId === queue[0].orderId)).toBe(false);
  });
});
