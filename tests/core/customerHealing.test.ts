import { describe, expect, it } from 'vitest';
import {
  getCustomerHealingProgress,
  getFoodHealingValue,
  getNewCustomerUnlocks
} from '../../assets/scripts/core/customerHealing';
import type { CustomerHealingConfig } from '../../assets/scripts/core/types';

const config: CustomerHealingConfig = {
  levelRequirements: [100, 220, 400],
  customers: {
    student: {
      favoriteFoodIds: ['rice_2'],
      foodHealing: { rice_2: 18, tea_2: 5 },
      unlocks: [
        { level: 2, type: 'dialogue', id: 'student_dialogue_2', title: '今天也有米团吗？' },
        { level: 3, type: 'action', id: 'student_wave', title: '开心挥手' }
      ]
    },
    worker: {
      favoriteFoodIds: ['tea_2'],
      foodHealing: { rice_2: 8, tea_2: 20 },
      unlocks: []
    }
  }
};

describe('customer healing', () => {
  it('uses increasing requirements and reports progress inside the current level', () => {
    expect(getCustomerHealingProgress(99, config)).toEqual({ level: 1, pointsIntoLevel: 99, pointsRequired: 100 });
    expect(getCustomerHealingProgress(150, config)).toEqual({ level: 2, pointsIntoLevel: 50, pointsRequired: 220 });
    expect(getCustomerHealingProgress(350, config)).toEqual({ level: 3, pointsIntoLevel: 30, pointsRequired: 400 });
  });

  it('returns different healing values for each customer and food pairing', () => {
    expect(getFoodHealingValue('student', 'rice_2', config)).toBe(18);
    expect(getFoodHealingValue('worker', 'rice_2', config)).toBe(8);
    expect(getFoodHealingValue('student', 'tea_2', config)).toBe(5);
  });

  it('throws when a customer and food pairing is missing', () => {
    expect(() => getFoodHealingValue('student', 'sweet_potato_2', config)).toThrow(
      'Missing healing value: student/sweet_potato_2'
    );
  });

  it('returns only content unlocked by newly reached levels', () => {
    expect(getNewCustomerUnlocks('student', 90, 330, config).map((unlock) => unlock.id)).toEqual([
      'student_dialogue_2',
      'student_wave'
    ]);
  });
});
