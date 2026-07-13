import type { GameState } from './types';

export const STAMINA_MAX = 100;
export const STAMINA_RECOVERY_INTERVAL_MS = 120_000;
export const STAMINA_AD_REWARD = 25;
export const STAMINA_AD_DAILY_LIMIT = 8;

export interface StaminaAdResult {
  granted: boolean;
  state: GameState;
}

export function recoverStamina(state: GameState, now = Date.now()): GameState {
  if (state.stamina >= STAMINA_MAX) {
    return { ...state, stamina: STAMINA_MAX, staminaUpdatedAt: now, updatedAt: now };
  }

  const recovered = Math.floor((now - state.staminaUpdatedAt) / STAMINA_RECOVERY_INTERVAL_MS);
  if (recovered <= 0) return state;

  const stamina = Math.min(STAMINA_MAX, state.stamina + recovered);
  return {
    ...state,
    stamina,
    staminaUpdatedAt: stamina === STAMINA_MAX
      ? now
      : state.staminaUpdatedAt + recovered * STAMINA_RECOVERY_INTERVAL_MS,
    updatedAt: now
  };
}

export function getStaminaRecoveryRemainingMs(state: GameState, now = Date.now()): number | null {
  if (state.stamina >= STAMINA_MAX) return null;

  const elapsed = Math.max(0, now - state.staminaUpdatedAt);
  const remainder = elapsed % STAMINA_RECOVERY_INTERVAL_MS;
  return remainder === 0 ? STAMINA_RECOVERY_INTERVAL_MS : STAMINA_RECOVERY_INTERVAL_MS - remainder;
}

export function claimStaminaAd(state: GameState, now = new Date()): StaminaAdResult {
  const day = formatLocalDay(now);
  const normalized = state.staminaAdDate === day
    ? state
    : { ...state, staminaAdDate: day, staminaAdViews: 0 };

  if (normalized.stamina >= STAMINA_MAX || normalized.staminaAdViews >= STAMINA_AD_DAILY_LIMIT) {
    return { granted: false, state: normalized };
  }

  const stamina = Math.min(STAMINA_MAX, normalized.stamina + STAMINA_AD_REWARD);
  return {
    granted: true,
    state: {
      ...normalized,
      stamina,
      staminaUpdatedAt: stamina === STAMINA_MAX ? now.getTime() : normalized.staminaUpdatedAt,
      staminaAdViews: normalized.staminaAdViews + 1,
      updatedAt: now.getTime()
    }
  };
}

function formatLocalDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
