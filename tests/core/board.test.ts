import { describe, expect, it } from 'vitest';
import { createBoard, spawnBasicItem, tryMerge } from '../../assets/scripts/core/board';
import type { ItemConfig } from '../../assets/scripts/core/types';

const items: ItemConfig[] = [
  { id: 'rice_1', name: '米粒', chain: 'rice', level: 1, nextId: 'rice_2', icon: 'icons/rice_1' },
  { id: 'rice_2', name: '米团', chain: 'rice', level: 2, nextId: null, icon: 'icons/rice_2' }
];

describe('board', () => {
  it('creates a 7x9 board by default', () => {
    expect(createBoard()).toHaveLength(63);
  });

  it('spawns a basic item into first empty cell', () => {
    const board = spawnBasicItem(createBoard(), 'rice_1');

    expect(board[0].itemId).toBe('rice_1');
  });

  it('merges identical items into next level', () => {
    let board = createBoard();
    board = spawnBasicItem(board, 'rice_1');
    board = spawnBasicItem(board, 'rice_1');

    const result = tryMerge(board, 0, 1, items);

    expect(result.merged).toBe(true);
    expect(result.board[1].itemId).toBe('rice_2');
    expect(result.board[0].itemId).toBeNull();
  });
});
