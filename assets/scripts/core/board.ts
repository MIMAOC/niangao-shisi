import type { BoardCell, ItemConfig, ItemId } from './types';

export interface MergeResult {
  merged: boolean;
  board: BoardCell[];
  reason?: 'empty_source' | 'different_items' | 'max_level' | 'invalid_index';
}

export function createBoard(size = 63): BoardCell[] {
  return Array.from({ length: size }, (_, index) => ({ index, itemId: null }));
}

export function spawnBasicItem(board: BoardCell[], itemId: ItemId): BoardCell[] {
  const next = board.map((cell) => ({ ...cell }));
  const empty = next.find((cell) => cell.itemId === null);

  if (!empty) {
    throw new Error('Board is full');
  }

  empty.itemId = itemId;
  return next;
}

export function tryMerge(
  board: BoardCell[],
  fromIndex: number,
  toIndex: number,
  items: ItemConfig[]
): MergeResult {
  if (!board[fromIndex] || !board[toIndex]) {
    return { merged: false, board, reason: 'invalid_index' };
  }

  const source = board[fromIndex];
  const target = board[toIndex];

  if (!source.itemId) {
    return { merged: false, board, reason: 'empty_source' };
  }

  if (source.itemId !== target.itemId) {
    return { merged: false, board, reason: 'different_items' };
  }

  const item = items.find((entry) => entry.id === source.itemId);
  if (!item || !item.nextId) {
    return { merged: false, board, reason: 'max_level' };
  }

  const next = board.map((cell) => ({ ...cell }));
  next[fromIndex].itemId = null;
  next[toIndex].itemId = item.nextId;

  return { merged: true, board: next };
}
