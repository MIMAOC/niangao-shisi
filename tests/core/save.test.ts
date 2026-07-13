import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import { deserializeSave, serializeSave } from '../../assets/scripts/core/save';

describe('save', () => {
  it('restores saved game state', () => {
    const state = {
      ...createInitialGameState(1000),
      coins: 20,
      premiumIngots: 3,
      backpackCellIndex: 10,
      activeOrders: [
        { instanceId: 'O01#1', orderId: 'O01', difficulty: 'easy' },
        { instanceId: 'O04#2', orderId: 'O04', difficulty: 'normal' },
        { instanceId: 'O08#3', orderId: 'O08', difficulty: 'hard' }
      ]
    };
    const restored = deserializeSave(serializeSave(state));

    expect(restored.coins).toBe(20);
    expect(restored.premiumIngots).toBe(3);
    expect(restored.board).toHaveLength(63);
    expect(restored.backpackCellIndex).toBe(10);
    expect(restored.activeOrders).toEqual(state.activeOrders);
  });

  it('adds a backpack position when loading an old save', () => {
    const state = createInitialGameState(1000);
    const { backpackCellIndex: _backpackCellIndex, ...oldState } = state;
    const restored = deserializeSave(JSON.stringify({ version: 1, state: oldState }));

    expect(restored.backpackCellIndex).toBe(62);
  });

  it('finds an empty cell when the saved backpack position contains an item', () => {
    const state = createInitialGameState(1000);
    state.board[62].itemId = 'rice_1';
    const restored = deserializeSave(JSON.stringify({ version: 1, state }));

    expect(restored.backpackCellIndex).toBe(61);
    expect(restored.board[62].itemId).toBe('rice_1');
  });

  it('drops the retired global healing value from old saves', () => {
    const oldState = { ...createInitialGameState(1000), healingPoints: 999 };
    const restored = deserializeSave(JSON.stringify({ version: 1, state: oldState }));

    expect('healingPoints' in restored).toBe(false);
  });

  it('throws on invalid save payload', () => {
    expect(() => deserializeSave('{bad json')).toThrow('Invalid save payload');
  });

  it('throws on unsupported save version', () => {
    const payload = JSON.stringify({ version: 2, state: createInitialGameState(1000) });

    expect(() => deserializeSave(payload)).toThrow('Invalid save payload');
  });
});
