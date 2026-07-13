import { pickOne } from './random';
import type { ItemConfig } from './types';

/** 备料台产出：从所有一级食材里随机挑一样。 */
export function rollBasicItem(items: ItemConfig[], random: () => number = Math.random): ItemConfig | null {
  return pickOne(items.filter((item) => item.level === 1), random);
}
