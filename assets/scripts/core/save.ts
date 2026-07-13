import type { GameState } from './types';
import { INITIAL_BACKPACK_CAPACITY, PREP_STATION_ID } from './backpack';
import { BOARD_SIZE } from './board';
import { formatLocalDay } from './time';

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
    // 棋盘长度必须对得上，否则格子索引会静默错位到别的格上——比直接崩还难查。
    if (
      parsed.version !== SAVE_VERSION ||
      !Array.isArray(parsed.state?.board) ||
      parsed.state.board.length !== BOARD_SIZE
    ) {
      throw new Error('Invalid save payload');
    }

    const stateWithLegacyHealing = parsed.state as GameState & { healingPoints?: number };
    const { healingPoints: _retiredHealingPoints, ...state } = stateWithLegacyHealing;
    const savedDay = formatLocalDay(new Date(state.updatedAt));

    if (typeof state.staminaUpdatedAt !== 'number') {
      state.staminaUpdatedAt = state.updatedAt;
    }
    if (typeof state.staminaAdDate !== 'string' || typeof state.staminaAdViews !== 'number') {
      state.staminaAdDate = savedDay;
      state.staminaAdViews = 0;
    }
    if (typeof state.premiumPurchaseDate !== 'string') {
      state.premiumPurchaseDate = savedDay;
    }
    if (typeof state.backpackCapacity !== 'number') {
      state.backpackCapacity = INITIAL_BACKPACK_CAPACITY;
    }
    if (!Array.isArray(state.backpackItemIds)) {
      state.backpackItemIds = [];
    }

    state.backpackCellIndex = resolveFixtureCell(state.board, state.backpackCellIndex);

    const prepStationInBackpack = state.backpackItemIds.includes(PREP_STATION_ID);
    if (!prepStationInBackpack) {
      state.prepStationCellIndex = resolveFixtureCell(
        state.board,
        state.prepStationCellIndex,
        state.backpackCellIndex
      );
    }

    return state;
  } catch {
    throw new Error('Invalid save payload');
  }
}

/**
 * 设施必须站在一个空格上，且不能和另一台设施重叠。存档里的位置站不住时，
 * 从棋盘末尾往前找一个空格；整盘塞满就返回 -1，由渲染层降级处理。
 */
function resolveFixtureCell(
  board: GameState['board'],
  savedIndex: number,
  otherFixtureIndex = -1
): number {
  const saved = board[savedIndex];
  if (saved?.itemId === null && savedIndex !== otherFixtureIndex) {
    return savedIndex;
  }

  const empty = [...board]
    .reverse()
    .find((cell) => cell.itemId === null && cell.index !== otherFixtureIndex);
  return empty?.index ?? -1;
}
