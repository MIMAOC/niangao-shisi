import { describe, expect, it } from 'vitest';
import {
  createBoard,
  hasAvailableBoardCell,
  moveBoardItem,
  moveBackpack,
  spawnBasicItem,
  tryMerge
} from '../../assets/scripts/core/board';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import type { ItemConfig } from '../../assets/scripts/core/types';

const items: ItemConfig[] = [
  { id: 'rice_1', name: '米粒', chain: 'rice', level: 1, nextId: 'rice_2', icon: 'icons/rice_1', description: '新碾的糯米。' },
  { id: 'rice_2', name: '米团', chain: 'rice', level: 2, nextId: null, icon: 'icons/rice_2', description: '揉成团的米。' }
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

  it('requires an unreserved empty cell before a prep station can generate an item', () => {
    const board = createBoard(3);
    board[1].itemId = 'rice_1';
    board[2].itemId = 'rice_1';

    expect(hasAvailableBoardCell(board, [0])).toBe(false);
    expect(hasAvailableBoardCell(board, [1])).toBe(true);
  });

  it('moves the backpack to an empty cell', () => {
    const result = moveBackpack(createBoard(), 62, 10);

    expect(result.moved).toBe(true);
    expect(result.backpackCellIndex).toBe(10);
  });

  it('pushes an occupied target item out of the backpack cell', () => {
    const board = createBoard();
    board[10].itemId = 'rice_1';

    const result = moveBackpack(board, 62, 10);

    expect(result.moved).toBe(true);
    expect(result.backpackCellIndex).toBe(10);
    expect(result.board[10].itemId).toBeNull();
    expect(result.board[3].itemId).toBe('rice_1');
    expect(result.displaced).toEqual({ itemId: 'rice_1', fromIndex: 10, toIndex: 3 });
  });

  it('swaps the backpack with the target item when every other cell is full', () => {
    const board = createBoard();
    board.forEach((cell) => {
      if (cell.index !== 62) cell.itemId = 'rice_2';
    });
    board[10].itemId = 'rice_1';

    const result = moveBackpack(board, 62, 10);

    expect(result.moved).toBe(true);
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

  it('does not merge an item with itself after a short drag', () => {
    const board = createBoard();
    board[0].itemId = 'rice_1';

    const result = tryMerge(board, 0, 0, items);

    expect(result.merged).toBe(false);
    expect(result.board[0].itemId).toBe('rice_1');
  });

  it('moves an item to an empty target cell', () => {
    const board = createBoard();
    board[0].itemId = 'rice_1';

    const result = moveBoardItem(board, 0, 8);

    expect(result.moved).toBe(true);
    expect(result.board[0].itemId).toBeNull();
    expect(result.board[8].itemId).toBe('rice_1');
  });

  // 以 8 号格为中心的九宫格：0 1 2 / 7 8 9 / 14 15 16
  it('pushes the target straight up', () => {
    const board = createBoard();
    board[0].itemId = 'rice_1';
    board[8].itemId = 'tea_1';

    const result = moveBoardItem(board, 0, 8);

    expect(result.moved).toBe(true);
    expect(result.board[8].itemId).toBe('rice_1');
    expect(result.board[1].itemId).toBe('tea_1');
    expect(result.displaced).toEqual({ itemId: 'tea_1', fromIndex: 8, toIndex: 1 });
  });

  it('skips the source cell and continues clockwise', () => {
    const board = createBoard();
    board[1].itemId = 'rice_1';
    board[8].itemId = 'tea_1';

    const result = moveBoardItem(board, 1, 8);

    expect(result.moved).toBe(true);
    expect(result.board[8].itemId).toBe('rice_1');
    // 正上方就是源格 1，顺时针走到右上角 2。
    expect(result.board[2].itemId).toBe('tea_1');
  });

  it('keeps pushing up regardless of which side the drag came from', () => {
    const board = createBoard();
    board[16].itemId = 'rice_1';
    board[8].itemId = 'tea_1';

    const result = moveBoardItem(board, 16, 8);

    expect(result.moved).toBe(true);
    expect(result.board[1].itemId).toBe('tea_1');
  });

  it('wraps clockwise past the board edge', () => {
    const board = createBoard();
    board[1].itemId = 'rice_1';
    board[0].itemId = 'tea_1';

    const result = moveBoardItem(board, 1, 0);

    expect(result.moved).toBe(true);
    expect(result.board[0].itemId).toBe('rice_1');
    // 0 在左上角：上、右上出界，右就是源格 1，于是落到右下角 8。
    expect(result.board[8].itemId).toBe('tea_1');
  });

  it('skips reserved cells while circling', () => {
    const board = createBoard();
    board[0].itemId = 'rice_1';
    board[8].itemId = 'tea_1';

    const result = moveBoardItem(board, 0, 8, [1]);

    expect(result.moved).toBe(true);
    expect(result.board[1].itemId).toBeNull();
    expect(result.board[2].itemId).toBe('tea_1');
  });

  it('expands to the next ring when the whole ring is full', () => {
    const board = createBoard();
    [0, 1, 2, 7, 9, 14, 15, 16].forEach((index) => {
      board[index].itemId = 'rice_2';
    });
    board[8].itemId = 'tea_1';
    board[7].itemId = 'rice_1';

    const result = moveBoardItem(board, 7, 8);

    expect(result.moved).toBe(true);
    expect(result.board[8].itemId).toBe('rice_1');
    // 第一圈只空出源格 7，不能用；扩到第二圈，同样从正上方顺时针找第一个空格。
    expect(result.board[3].itemId).toBe('tea_1');
  });

  it('swaps with the target only when the board has no other empty cell', () => {
    const board = createBoard();
    board.forEach((cell) => {
      cell.itemId = 'rice_2';
    });
    board[0].itemId = 'rice_1';
    board[1].itemId = 'tea_1';

    const result = moveBoardItem(board, 0, 1);

    expect(result.moved).toBe(true);
    expect(result.board[1].itemId).toBe('rice_1');
    expect(result.board[0].itemId).toBe('tea_1');
  });
});
