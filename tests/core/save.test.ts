import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import { deserializeSave, serializeSave } from '../../assets/scripts/core/save';

describe('save', () => {
  it('restores saved game state', () => {
    const state = { ...createInitialGameState(1000), coins: 20, premiumIngots: 3 };
    const restored = deserializeSave(serializeSave(state));

    expect(restored.coins).toBe(20);
    expect(restored.premiumIngots).toBe(3);
    expect(restored.board).toHaveLength(63);
  });

  it('throws on invalid save payload', () => {
    expect(() => deserializeSave('{bad json')).toThrow('Invalid save payload');
  });

  it('throws on unsupported save version', () => {
    const payload = JSON.stringify({ version: 2, state: createInitialGameState(1000) });

    expect(() => deserializeSave(payload)).toThrow('Invalid save payload');
  });
});
