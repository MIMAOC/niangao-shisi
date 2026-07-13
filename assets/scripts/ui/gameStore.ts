import { JsonAsset, resources, sys } from 'cc';
import { createInitialGameState } from '../core/gameState';
import { deserializeSave, serializeSave } from '../core/save';
import type { GameState } from '../core/types';

const SAVE_KEY = 'niangao-shisi-save';

/** 读存档；没有或者读坏了就开新档，并把坏档清掉，免得每次进场景都再炸一次。 */
export function loadGameState(): GameState {
  const saved = sys.localStorage.getItem(SAVE_KEY);
  if (!saved) return createInitialGameState();

  try {
    return deserializeSave(saved);
  } catch {
    sys.localStorage.removeItem(SAVE_KEY);
    return createInitialGameState();
  }
}

export function saveGameState(state: GameState): void {
  sys.localStorage.setItem(SAVE_KEY, serializeSave(state));
}

export function loadJsonConfig<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    resources.load(path, JsonAsset, (error, asset) => {
      if (error || !asset) {
        reject(error ?? new Error(`Missing resource: ${path}`));
        return;
      }
      resolve(asset.json as T);
    });
  });
}
