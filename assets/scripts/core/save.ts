import type { GameState } from './types';

const SAVE_VERSION = 1;

interface SaveEnvelope {
  version: number;
  state: GameState;
}

export function serializeSave(state: GameState): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, state };
  return JSON.stringify(envelope);
}

export function deserializeSave(payload: string): GameState {
  try {
    const parsed = JSON.parse(payload) as SaveEnvelope;
    if (parsed.version !== SAVE_VERSION || !Array.isArray(parsed.state.board)) {
      throw new Error('Invalid save payload');
    }

    const stateWithLegacyHealing = parsed.state as GameState & { healingPoints?: number };
    const { healingPoints: _retiredHealingPoints, ...state } = stateWithLegacyHealing;
    const savedIndex = state.backpackCellIndex;
    const savedCell = state.board[savedIndex];
    if (savedCell?.itemId === null) {
      return state;
    }

    const emptyCell = [...state.board].reverse().find((cell) => cell.itemId === null);
    return { ...state, backpackCellIndex: emptyCell?.index ?? -1 };
  } catch {
    throw new Error('Invalid save payload');
  }
}
