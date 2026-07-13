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

    return parsed.state;
  } catch {
    throw new Error('Invalid save payload');
  }
}
