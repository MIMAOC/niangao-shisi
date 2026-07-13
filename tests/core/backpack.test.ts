import { describe, expect, it } from 'vitest';
import { storeBoardItemInBackpack } from '../../assets/scripts/core/backpack';
import { createInitialGameState } from '../../assets/scripts/core/gameState';

describe('backpack', () => {
  it('starts with ten storage slots', () => {
    const state = createInitialGameState(1000);

    expect(state.backpackCapacity).toBe(10);
    expect(state.backpackItemIds).toEqual([]);
  });

  it('stores a board item and clears its source cell', () => {
    const state = createInitialGameState(1000);
    state.board[0].itemId = 'rice_1';

    const result = storeBoardItemInBackpack(state, 0, 2000);

    expect(result.stored).toBe(true);
    expect(result.state.backpackItemIds).toEqual(['rice_1']);
    expect(result.state.board[0].itemId).toBeNull();
  });

  it('keeps the board item in place when the backpack is full', () => {
    const state = createInitialGameState(1000);
    state.board[0].itemId = 'rice_1';
    state.backpackItemIds = Array.from({ length: state.backpackCapacity }, () => 'tea_1');

    const result = storeBoardItemInBackpack(state, 0, 2000);

    expect(result.stored).toBe(false);
    expect(result.reason).toBe('full');
    expect(result.state.board[0].itemId).toBe('rice_1');
  });
});
