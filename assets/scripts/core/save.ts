import type { GameState } from './types';
import { INITIAL_BACKPACK_CAPACITY, PREP_STATION_ID } from './backpack';

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
    if (typeof state.backpackCapacity !== 'number') {
      state.backpackCapacity = INITIAL_BACKPACK_CAPACITY;
    }
    if (!Array.isArray(state.backpackItemIds)) {
      state.backpackItemIds = [];
    }
    const savedIndex = state.backpackCellIndex;
    const savedCell = state.board[savedIndex];
    if (savedCell?.itemId !== null) {
      const emptyCell = [...state.board].reverse().find((cell) => cell.itemId === null);
      state.backpackCellIndex = emptyCell?.index ?? -1;
    }

    const prepStationIndex = state.prepStationCellIndex;
    const prepStationCell = state.board[prepStationIndex];
    const prepStationInBackpack = state.backpackItemIds.includes(PREP_STATION_ID);
    if (
      !prepStationInBackpack &&
      (prepStationCell?.itemId !== null || prepStationIndex === state.backpackCellIndex)
    ) {
      const emptyCell = [...state.board]
        .reverse()
        .find((cell) => cell.itemId === null && cell.index !== state.backpackCellIndex);
      state.prepStationCellIndex = emptyCell?.index ?? -1;
    }
    return state;
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
