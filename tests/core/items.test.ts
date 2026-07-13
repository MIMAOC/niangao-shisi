import { describe, expect, it } from 'vitest';
import { rollBasicItem } from '../../assets/scripts/core/items';
import type { ItemConfig } from '../../assets/scripts/core/types';

const items: ItemConfig[] = [
  { id: 'rice_1', name: '米粒', chain: 'rice', level: 1, nextId: 'rice_2', icon: '', description: '' },
  { id: 'tea_1', name: '茶叶', chain: 'tea', level: 1, nextId: 'tea_2', icon: '', description: '' },
  { id: 'rice_2', name: '米团', chain: 'rice', level: 2, nextId: null, icon: '', description: '' }
];

describe('items', () => {
  it('only ever rolls a level one ingredient', () => {
    expect(rollBasicItem(items, () => 0)?.id).toBe('rice_1');
    expect(rollBasicItem(items, () => 0.99)?.id).toBe('tea_1');
  });

  it('returns null when no basic ingredient is configured', () => {
    expect(rollBasicItem([items[2]], () => 0)).toBeNull();
  });
});
