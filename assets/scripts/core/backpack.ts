import type { GameState } from './types';

export const INITIAL_BACKPACK_CAPACITY = 10;

export interface BackpackStoreResult {
  stored: boolean;
  state: GameState;
  reason?: 'invalid_source' | 'full';
}

export interface BackpackTakeResult {
  taken: boolean;
  state: GameState;
  cellIndex: number;
  reason?: 'empty_slot' | 'board_full';
}

export function storeBoardItemInBackpack(
  state: GameState,
  sourceIndex: number,
  now = Date.now()
): BackpackStoreResult {
  const source = state.board[sourceIndex];
  if (!source?.itemId) {
    return { stored: false, state, reason: 'invalid_source' };
  }
  if (state.backpackItemIds.length >= state.backpackCapacity) {
    return { stored: false, state, reason: 'full' };
  }

  const board = state.board.map((cell) => ({ ...cell }));
  const itemId = source.itemId;
  board[sourceIndex].itemId = null;
  return {
    stored: true,
    state: {
      ...state,
      board,
      backpackItemIds: [...state.backpackItemIds, itemId],
      updatedAt: now
    }
  };
}

export function takeBackpackItemToBoard(
  state: GameState,
  slotIndex: number,
  now = Date.now()
): BackpackTakeResult {
  const itemId = state.backpackItemIds[slotIndex];
  if (!itemId) {
    return { taken: false, state, cellIndex: -1, reason: 'empty_slot' };
  }

  const reserved = new Set([state.backpackCellIndex, state.prepStationCellIndex]);
  const target = state.board.find((cell) => cell.itemId === null && !reserved.has(cell.index));
  if (!target) {
    return { taken: false, state, cellIndex: -1, reason: 'board_full' };
  }

  const board = state.board.map((cell) => ({ ...cell }));
  board[target.index].itemId = itemId;

  return {
    taken: true,
    cellIndex: target.index,
    state: {
      ...state,
      board,
      backpackItemIds: state.backpackItemIds.filter((_, index) => index !== slotIndex),
      updatedAt: now
    }
  };
}
