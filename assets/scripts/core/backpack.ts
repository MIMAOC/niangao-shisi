import type { GameState } from './types';

export const INITIAL_BACKPACK_CAPACITY = 10;

export interface BackpackStoreResult {
  stored: boolean;
  state: GameState;
  reason?: 'invalid_source' | 'full';
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
