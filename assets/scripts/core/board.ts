import type { BoardCell, ItemConfig, ItemId } from './types';

export interface MergeResult {
  merged: boolean;
  board: BoardCell[];
  reason?: 'empty_source' | 'different_items' | 'max_level' | 'invalid_index';
}

export interface BackpackMoveResult {
  moved: boolean;
  backpackCellIndex: number;
  board: BoardCell[];
  reason?: 'invalid_index';
}

export function createBoard(size = 63): BoardCell[] {
  return Array.from({ length: size }, (_, index) => ({ index, itemId: null }));
}

export function spawnBasicItem(board: BoardCell[], itemId: ItemId, backpackCellIndex = -1): BoardCell[] {
  const next = board.map((cell) => ({ ...cell }));
  const empty = next.find((cell) => cell.itemId === null && cell.index !== backpackCellIndex);

  if (!empty) {
    throw new Error('Board is full');
  }

  empty.itemId = itemId;
  return next;
}

export function moveBackpack(
  board: BoardCell[],
  fromIndex: number,
  toIndex: number
): BackpackMoveResult {
  if (!board[fromIndex] || !board[toIndex]) {
    return { moved: false, backpackCellIndex: fromIndex, board, reason: 'invalid_index' };
  }

  const next = board.map((cell) => ({ ...cell }));
  const targetItemId = next[toIndex].itemId;
  if (targetItemId !== null) {
    const emptyIndex = findNearestEmptyCell(next, toIndex);
    if (emptyIndex === -1) {
      return { moved: false, backpackCellIndex: fromIndex, board };
    }
    next[emptyIndex].itemId = targetItemId;
    next[toIndex].itemId = null;
  }

  return { moved: true, backpackCellIndex: toIndex, board: next };
}

function findNearestEmptyCell(board: BoardCell[], targetIndex: number, columnCount = 7): number {
  const targetRow = Math.floor(targetIndex / columnCount);
  const targetColumn = targetIndex % columnCount;

  return board
    .filter((cell) => cell.itemId === null && cell.index !== targetIndex)
    .sort((left, right) => {
      const leftDistance = gridDistance(left.index, targetRow, targetColumn, columnCount);
      const rightDistance = gridDistance(right.index, targetRow, targetColumn, columnCount);
      return leftDistance - rightDistance || left.index - right.index;
    })[0]?.index ?? -1;
}

function gridDistance(index: number, targetRow: number, targetColumn: number, columnCount: number): number {
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  return (row - targetRow) ** 2 + (column - targetColumn) ** 2;
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
