import { describe, expect, it } from 'vitest';
import { addCurrency, createInitialGameState } from '../../assets/scripts/core/gameState';

describe('game state', () => {
  it('starts with reserved premium ingot balance', () => {
    const state = createInitialGameState(1000);

    expect(state.premiumIngots).toBe(0);
    expect(state.coins).toBe(0);
    expect(state.stamina).toBe(100);
    expect(state.prepStationCellIndex).not.toBe(state.backpackCellIndex);
    expect(state.board[state.prepStationCellIndex].itemId).toBeNull();
  });

  it('adds coins without mutating original state', () => {
    const state = createInitialGameState(1000);
    const next = addCurrency(state, 'coins', 8);

    expect(next.coins).toBe(8);
    expect(state.coins).toBe(0);
  });
});
