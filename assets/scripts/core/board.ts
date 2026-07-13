import type { BoardCell, ItemConfig, ItemId } from './types';

const COLUMN_COUNT = 7;

export interface MergeResult {
  merged: boolean;
  board: BoardCell[];
  reason?: 'empty_source' | 'different_items' | 'max_level' | 'invalid_index';
}

export interface DisplacedItem {
  itemId: ItemId;
  fromIndex: number;
  toIndex: number;
}

export interface BackpackMoveResult {
  moved: boolean;
  backpackCellIndex: number;
  board: BoardCell[];
  displaced?: DisplacedItem;
  reason?: 'invalid_index';
}

export interface BoardItemMoveResult {
  moved: boolean;
  board: BoardCell[];
  displaced?: DisplacedItem;
  reason?: 'invalid_index' | 'empty_source';
}

export function createBoard(size = 63): BoardCell[] {
  return Array.from({ length: size }, (_, index) => ({ index, itemId: null }));
}

export function hasAvailableBoardCell(board: BoardCell[], reservedCellIndexes: number[] = []): boolean {
  const reserved = new Set(reservedCellIndexes);
  return board.some((cell) => cell.itemId === null && !reserved.has(cell.index));
}

export function spawnBasicItem(
  board: BoardCell[],
  itemId: ItemId,
  reservedCellIndexes: number | number[] = -1
): BoardCell[] {
  const next = board.map((cell) => ({ ...cell }));
  const reserved = new Set(Array.isArray(reservedCellIndexes) ? reservedCellIndexes : [reservedCellIndexes]);
  const empty = next.find((cell) => cell.itemId === null && !reserved.has(cell.index));

  if (!empty) {
    throw new Error('Board is full');
  }

  empty.itemId = itemId;
  return next;
}

export function moveBackpack(
  board: BoardCell[],
  fromIndex: number,
  toIndex: number,
  reservedCellIndexes: number[] = []
): BackpackMoveResult {
  if (!board[fromIndex] || !board[toIndex]) {
    return { moved: false, backpackCellIndex: fromIndex, board, reason: 'invalid_index' };
  }

  const next = board.map((cell) => ({ ...cell }));
  const targetItemId = next[toIndex].itemId;
  let displaced: DisplacedItem | undefined;
  if (targetItemId !== null) {
    let escapeIndex = findDisplacementCell(next, toIndex, fromIndex, reservedCellIndexes);
    if (escapeIndex === -1) escapeIndex = fromIndex;
    next[escapeIndex].itemId = targetItemId;
    next[toIndex].itemId = null;
    displaced = { itemId: targetItemId, fromIndex: toIndex, toIndex: escapeIndex };
  }

  return { moved: true, backpackCellIndex: toIndex, board: next, displaced };
}

export function moveBoardItem(
  board: BoardCell[],
  fromIndex: number,
  toIndex: number,
  reservedCellIndexes: number[] = []
): BoardItemMoveResult {
  if (!board[fromIndex] || !board[toIndex] || fromIndex === toIndex) {
    return { moved: false, board, reason: 'invalid_index' };
  }

  const sourceItemId = board[fromIndex].itemId;
  if (!sourceItemId) {
    return { moved: false, board, reason: 'empty_source' };
  }

  const next = board.map((cell) => ({ ...cell }));
  const targetItemId = next[toIndex].itemId;
  next[fromIndex].itemId = null;
  let displaced: DisplacedItem | undefined;
  if (targetItemId !== null) {
    // 无处可去（棋盘全满）才落回源格，也就是两者互换。
    let escapeIndex = findDisplacementCell(next, toIndex, fromIndex, reservedCellIndexes);
    if (escapeIndex === -1) escapeIndex = fromIndex;
    next[escapeIndex].itemId = targetItemId;
    displaced = { itemId: targetItemId, fromIndex: toIndex, toIndex: escapeIndex };
  }
  next[toIndex].itemId = sourceItemId;
  return { moved: true, board: next, displaced };
}

/**
 * 被挤开的食材从目标格的正上方起顺时针绕圈找空位（上、右上、右、右下、下、左下、左、左上），
 * 一圈找不到就往外扩一圈。源格不参与，否则挤压会退化成两者互换。
 */
function findDisplacementCell(
  board: BoardCell[],
  targetIndex: number,
  sourceIndex: number,
  reservedCellIndexes: number[],
  columnCount = COLUMN_COUNT
): number {
  const blocked = new Set([targetIndex, sourceIndex, ...reservedCellIndexes]);
  const rowCount = Math.ceil(board.length / columnCount);
  const targetRow = Math.floor(targetIndex / columnCount);
  const targetColumn = targetIndex % columnCount;
  const maxRing = Math.max(rowCount, columnCount);

  for (let ring = 1; ring <= maxRing; ring += 1) {
    const escape = ringCells(targetRow, targetColumn, ring, rowCount, columnCount)
      .find((index) => board[index].itemId === null && !blocked.has(index));
    if (escape !== undefined) return escape;
  }

  return -1;
}

/** 目标格外围第 ring 圈的格子，按顺时针排好序，从正上方开始。 */
function ringCells(
  targetRow: number,
  targetColumn: number,
  ring: number,
  rowCount: number,
  columnCount: number
): number[] {
  const cells: { index: number; angle: number }[] = [];

  for (let row = targetRow - ring; row <= targetRow + ring; row += 1) {
    for (let column = targetColumn - ring; column <= targetColumn + ring; column += 1) {
      const rowOffset = row - targetRow;
      const columnOffset = column - targetColumn;
      if (Math.max(Math.abs(rowOffset), Math.abs(columnOffset)) !== ring) continue;
      if (row < 0 || row >= rowCount || column < 0 || column >= columnCount) continue;

      // 正上方为 0，顺时针递增。
      const angle = Math.atan2(columnOffset, -rowOffset);
      cells.push({ index: row * columnCount + column, angle: angle < 0 ? angle + Math.PI * 2 : angle });
    }
  }

  return cells.sort((left, right) => left.angle - right.angle).map((cell) => cell.index);
}

export function tryMerge(
  board: BoardCell[],
  fromIndex: number,
  toIndex: number,
  items: ItemConfig[]
): MergeResult {
  if (!board[fromIndex] || !board[toIndex] || fromIndex === toIndex) {
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
