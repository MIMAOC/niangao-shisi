import type { GameConfig } from './types';

export type RawGameConfig = GameConfig;

export function loadGameConfig(raw: RawGameConfig): GameConfig {
  if (raw.items.length === 0) {
    throw new Error('Config requires at least one item');
  }

  if (raw.orders.length === 0) {
    throw new Error('Config requires at least one order');
  }

  for (const item of raw.items) {
    if (item.level < 1 || item.level > 4) {
      throw new Error(`Invalid item level: ${item.id}`);
    }
  }

  return raw;
}
