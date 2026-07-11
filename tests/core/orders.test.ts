import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import { completeOrder } from '../../assets/scripts/core/orders';
import type { OrderConfig } from '../../assets/scripts/core/types';

const order: OrderConfig = {
  id: 'O01',
  requiredItemId: 'rice_2',
  customerType: 'student',
  customerName: '放学学生',
  line: '想吃一点热乎的。',
  rewards: { coins: 8, experience: 3, healingPoints: 1 }
};

describe('orders', () => {
  it('adds rewards and customer healing points when order is completed', () => {
    const state = createInitialGameState(1000);
    const result = completeOrder(state, order);

    expect(result.coins).toBe(8);
    expect(result.experience).toBe(3);
    expect(result.healingPoints).toBe(1);
    expect(result.customerHealingByType.student).toBe(1);
  });
});
