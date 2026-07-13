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
    if (typeof state.staminaUpdatedAt !== 'number') {
      state.staminaUpdatedAt = state.updatedAt;
    }
    if (typeof state.staminaAdDate !== 'string' || typeof state.staminaAdViews !== 'number') {
      state.staminaAdDate = formatLocalDay(new Date(state.updatedAt));
      state.staminaAdViews = 0;
    }
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

function formatLocalDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
