import { describe, expect, it } from 'vitest';
import { storeBoardItemInBackpack, takeBackpackItemToBoard } from '../../assets/scripts/core/backpack';
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

  it('takes a stored item back onto the first free board cell', () => {
    const state = createInitialGameState(1000);
    state.backpackItemIds = ['rice_1', 'tea_1'];

    const result = takeBackpackItemToBoard(state, 1, 2000);

    expect(result.taken).toBe(true);
    expect(result.cellIndex).toBe(0);
    expect(result.state.board[0].itemId).toBe('tea_1');
    expect(result.state.backpackItemIds).toEqual(['rice_1']);
  });

  it('never drops a taken item onto the backpack or prep station cell', () => {
    const state = createInitialGameState(1000);
    state.backpackItemIds = ['rice_1'];
    state.board.forEach((cell) => {
      if (cell.index !== state.backpackCellIndex && cell.index !== state.prepStationCellIndex) {
        cell.itemId = 'tea_1';
      }
    });

    const result = takeBackpackItemToBoard(state, 0, 2000);

    expect(result.taken).toBe(false);
    expect(result.reason).toBe('board_full');
    expect(result.state.backpackItemIds).toEqual(['rice_1']);
  });
});
