import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import {
  completeOrder,
  createOrderQueue,
  getOrderBoardMatch,
  isOrderRequirementMet,
  replaceCompletedOrder
} from '../../assets/scripts/core/orders';
import type { CustomerHealingConfig, ItemConfig, OrderConfig } from '../../assets/scripts/core/types';

const items: ItemConfig[] = [
  { id: 'rice_2', name: '米团', chain: 'rice', level: 2, nextId: 'rice_3', icon: '', description: '' },
  { id: 'rice_3', name: '海苔饭团', chain: 'rice', level: 3, nextId: null, icon: '', description: '' },
  { id: 'tea_2', name: '热茶', chain: 'tea', level: 2, nextId: 'tea_3', icon: '', description: '' }
];

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

  it('adds newly reached customer unlocks to the player state', () => {
    const state = {
      ...createInitialGameState(1000),
      customerHealingByType: { ...createInitialGameState(1000).customerHealingByType, student: 90 }
    };
    const config: CustomerHealingConfig = {
      levelRequirements: [100],
      customers: {
        student: {
          favoriteFoodIds: ['rice_2'],
          foodHealing: { rice_2: 18 },
          unlocks: [{ level: 2, type: 'action', id: 'student_wave', title: '开心挥手' }]
        }
      }
    };

    const result = completeOrder(state, order, 'rice_2', config);

    expect(result.unlocked).toContain('student_wave');
  });

  it('matches exact requests and allows any level three food for flexible orders', () => {
    const flexibleOrder = { ...order, requiredItemId: 'any_level_3' as const };

    expect(isOrderRequirementMet(order, 'rice_2', items)).toBe(true);
    expect(isOrderRequirementMet(order, 'tea_2', items)).toBe(false);
    expect(isOrderRequirementMet(flexibleOrder, 'rice_3', items)).toBe(true);
    expect(isOrderRequirementMet(flexibleOrder, 'rice_2', items)).toBe(false);
  });

  it('matches every requirement of a multi-food order using different board cells', () => {
    const multiFoodOrder: OrderConfig = {
      ...order,
      requirements: [
        { itemId: 'rice_2', quantity: 1 },
        { itemId: 'tea_2', quantity: 1 }
      ]
    };
    const board = [
      { index: 0, itemId: 'rice_2' },
      { index: 1, itemId: 'tea_2' },
      { index: 2, itemId: null }
    ];

    const match = getOrderBoardMatch(multiFoodOrder, board, items);

    expect(match.complete).toBe(true);
    expect(match.matchedCellIndexes).toEqual([0, 1]);
    expect(match.requirements.map((requirement) => requirement.fulfilled)).toEqual([true, true]);
  });

  it('does not reuse one board food for two quantities in the same order', () => {
    const doubleRiceOrder: OrderConfig = {
      ...order,
      requirements: [{ itemId: 'rice_2', quantity: 2 }]
    };
    const board = [
      { index: 0, itemId: 'rice_2' },
      { index: 1, itemId: null }
    ];

    const match = getOrderBoardMatch(doubleRiceOrder, board, items);

    expect(match.complete).toBe(false);
    expect(match.matchedCellIndexes).toEqual([0]);
    expect(match.requirements[0].fulfilled).toBe(false);
  });

  it('allows the same board food to mark multiple orders ready before either is submitted', () => {
    const secondOrder: OrderConfig = { ...order, id: 'O02' };
    const board = [{ index: 0, itemId: 'rice_2' }];

    expect(getOrderBoardMatch(order, board, items).complete).toBe(true);
    expect(getOrderBoardMatch(secondOrder, board, items).complete).toBe(true);
  });

  it('adds healing from every submitted food in a multi-food order', () => {
    const multiFoodOrder: OrderConfig = {
      ...order,
      requirements: [
        { itemId: 'rice_2', quantity: 1 },
        { itemId: 'tea_2', quantity: 1 }
      ]
    };
    const config: CustomerHealingConfig = {
      levelRequirements: [100],
      customers: {
        student: {
          favoriteFoodIds: ['rice_2'],
          foodHealing: { rice_2: 18, tea_2: 9 },
          unlocks: []
        }
      }
    };

    const result = completeOrder(createInitialGameState(1000), multiFoodOrder, ['rice_2', 'tea_2'], config);

    expect(result.customerHealingByType.student).toBe(27);
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
