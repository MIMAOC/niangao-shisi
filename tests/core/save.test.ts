import { describe, expect, it } from 'vitest';
import { PREP_STATION_ID, storePrepStationInBackpack } from '../../assets/scripts/core/backpack';
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

  it('adds a prep station position when loading an old save', () => {
    const state = createInitialGameState(1000);
    const { prepStationCellIndex: _prepStationCellIndex, ...oldState } = state;
    const restored = deserializeSave(JSON.stringify({ version: 1, state: oldState }));

    expect(restored.prepStationCellIndex).not.toBe(restored.backpackCellIndex);
    expect(restored.board[restored.prepStationCellIndex].itemId).toBeNull();
  });

  it('leaves the prep station in the backpack instead of dragging it back onto the board', () => {
    const state = storePrepStationInBackpack(createInitialGameState(1000), 2000).state;

    const restored = deserializeSave(serializeSave(state));

    expect(restored.prepStationCellIndex).toBe(-1);
    expect(restored.backpackItemIds).toEqual([PREP_STATION_ID]);
  });

  it('initializes ten empty backpack slots when loading a pre-storage save', () => {
    const state = createInitialGameState(1000);
    const {
      backpackCapacity: _backpackCapacity,
      backpackItemIds: _backpackItemIds,
      ...oldState
    } = state;
    const restored = deserializeSave(JSON.stringify({ version: 1, state: oldState }));

    expect(restored.backpackCapacity).toBe(10);
    expect(restored.backpackItemIds).toEqual([]);
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

  it('uses the save timestamp when an old save has no stamina recovery timestamp', () => {
    const state = createInitialGameState(1000);
    const { staminaUpdatedAt: _staminaUpdatedAt, ...oldState } = state;
    const restored = deserializeSave(JSON.stringify({ version: 1, state: oldState }));

    expect(restored.staminaUpdatedAt).toBe(1000);
  });

  it('initializes the daily ad counter when loading a pre-ad save', () => {
    const state = createInitialGameState(1000);
    const { staminaAdDate: _staminaAdDate, staminaAdViews: _staminaAdViews, ...oldState } = state;
    const restored = deserializeSave(JSON.stringify({ version: 1, state: oldState }));

    expect(restored.staminaAdDate).toBe('1970-01-01');
    expect(restored.staminaAdViews).toBe(0);
  });

  it('throws on invalid save payload', () => {
    expect(() => deserializeSave('{bad json')).toThrow('Invalid save payload');
  });

  it('throws when the saved board is not the expected size, instead of silently misaligning cells', () => {
    const state = { ...createInitialGameState(1000), board: createInitialGameState(1000).board.slice(0, 40) };

    expect(() => deserializeSave(JSON.stringify({ version: 1, state }))).toThrow('Invalid save payload');
  });

  it('keeps the daily premium purchase date across a save round trip', () => {
    const restored = deserializeSave(serializeSave(createInitialGameState(1000)));

    expect(restored.premiumPurchaseDate).toBe('1970-01-01');
  });

  it('backfills the premium purchase date for a pre-limit save', () => {
    const state = createInitialGameState(1000);
    const { premiumPurchaseDate: _premiumPurchaseDate, ...oldState } = state;
    const restored = deserializeSave(JSON.stringify({ version: 1, state: oldState }));

    expect(restored.premiumPurchaseDate).toBe('1970-01-01');
  });

  it('throws on unsupported save version', () => {
    const payload = JSON.stringify({ version: 2, state: createInitialGameState(1000) });

    expect(() => deserializeSave(payload)).toThrow('Invalid save payload');
  });
});
