import { describe, expect, it } from 'vitest';
import { createBoard, moveBackpack, spawnBasicItem, tryMerge } from '../../assets/scripts/core/board';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import type { ItemConfig } from '../../assets/scripts/core/types';

const items: ItemConfig[] = [
  { id: 'rice_1', name: '米粒', chain: 'rice', level: 1, nextId: 'rice_2', icon: 'icons/rice_1' },
  { id: 'rice_2', name: '米团', chain: 'rice', level: 2, nextId: null, icon: 'icons/rice_2' }
];

describe('board', () => {
  it('creates a 7x9 board by default', () => {
    expect(createBoard()).toHaveLength(63);
  });

  it('places the backpack in the last cell for a new game', () => {
    expect(createInitialGameState(1000).backpackCellIndex).toBe(62);
  });

  it('spawns a basic item into first empty cell', () => {
    const board = spawnBasicItem(createBoard(), 'rice_1');

    expect(board[0].itemId).toBe('rice_1');
  });

  it('skips the backpack cell when spawning an item', () => {
    const board = createBoard(2);
    board[0].itemId = 'rice_1';

    expect(() => spawnBasicItem(board, 'rice_1', 1)).toThrow('Board is full');
  });

  it('moves the backpack to an empty cell', () => {
    const result = moveBackpack(createBoard(), 62, 10);

    expect(result.moved).toBe(true);
    expect(result.backpackCellIndex).toBe(10);
  });

  it('pushes an occupied target item into the nearest available cell', () => {
    const board = createBoard();
    board[10].itemId = 'rice_1';
    board[3].itemId = 'rice_2';
    board[9].itemId = 'rice_2';

    const result = moveBackpack(board, 62, 10);

    expect(result.moved).toBe(true);
    expect(result.backpackCellIndex).toBe(10);
    expect(result.board[11].itemId).toBe('rice_1');
    expect(result.board[10].itemId).toBeNull();
  });

  it('swaps the backpack with the target item when every other cell is full', () => {
    const board = createBoard();
    board.forEach((cell) => {
      if (cell.index !== 62) cell.itemId = 'rice_2';
    });
    board[10].itemId = 'rice_1';

    const result = moveBackpack(board, 62, 10);

    expect(result.moved).toBe(true);
    expect(result.backpackCellIndex).toBe(10);
    expect(result.board[10].itemId).toBeNull();
    expect(result.board[62].itemId).toBe('rice_1');
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
