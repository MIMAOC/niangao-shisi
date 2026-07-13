import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import {
  claimStaminaAd,
  getStaminaRecoveryRemainingMs,
  recoverStamina,
  STAMINA_AD_DAILY_LIMIT,
  STAMINA_AD_REWARD,
  STAMINA_MAX,
  STAMINA_RECOVERY_INTERVAL_MS
} from '../../assets/scripts/core/stamina';

describe('stamina', () => {
  it('starts a new game at the maximum stamina', () => {
    const state = createInitialGameState(1000);

    expect(state.stamina).toBe(STAMINA_MAX);
    expect(state.staminaUpdatedAt).toBe(1000);
  });

  it('recovers one stamina every two minutes while preserving partial time', () => {
    const state = { ...createInitialGameState(0), stamina: 50, staminaUpdatedAt: 0 };
    const recovered = recoverStamina(state, STAMINA_RECOVERY_INTERVAL_MS * 2 + 30_000);

    expect(recovered.stamina).toBe(52);
    expect(recovered.staminaUpdatedAt).toBe(STAMINA_RECOVERY_INTERVAL_MS * 2);
  });

  it('caps recovery at 100 and resets the recovery timer when full', () => {
    const state = { ...createInitialGameState(0), stamina: 99, staminaUpdatedAt: 0 };
    const recovered = recoverStamina(state, STAMINA_RECOVERY_INTERVAL_MS * 5);

    expect(recovered.stamina).toBe(100);
    expect(recovered.staminaUpdatedAt).toBe(STAMINA_RECOVERY_INTERVAL_MS * 5);
  });

  it('returns the time remaining until the next point and hides it at full stamina', () => {
    const state = { ...createInitialGameState(0), stamina: 50, staminaUpdatedAt: 0 };

    expect(getStaminaRecoveryRemainingMs(state, 30_000)).toBe(90_000);
    expect(getStaminaRecoveryRemainingMs({ ...state, stamina: STAMINA_MAX }, 30_000)).toBeNull();
  });

  it('grants 25 stamina for a successful ad without exceeding the cap', () => {
    const state = { ...createInitialGameState(0), stamina: 85, staminaAdDate: '2026-07-13', staminaAdViews: 0 };
    const result = claimStaminaAd(state, new Date('2026-07-13T10:00:00'));

    expect(result.granted).toBe(true);
    expect(result.state.stamina).toBe(STAMINA_MAX);
    expect(result.state.staminaAdViews).toBe(1);
    expect(STAMINA_AD_REWARD).toBe(25);
  });

  it('does not spend an ad view when stamina is full and resets the daily count on a new date', () => {
    const full = createInitialGameState(0);
    const blocked = claimStaminaAd(full, new Date('2026-07-13T10:00:00'));
    const nextDay = claimStaminaAd(
      { ...full, stamina: 50, staminaAdDate: '2026-07-12', staminaAdViews: STAMINA_AD_DAILY_LIMIT },
      new Date('2026-07-13T10:00:00')
    );

    expect(blocked.granted).toBe(false);
    expect(blocked.state.staminaAdViews).toBe(0);
    expect(nextDay.granted).toBe(true);
    expect(nextDay.state.staminaAdViews).toBe(1);
  });

  it('blocks the ninth successful ad on the same day', () => {
    const state = {
      ...createInitialGameState(0),
      stamina: 50,
      staminaAdDate: '2026-07-13',
      staminaAdViews: STAMINA_AD_DAILY_LIMIT
    };

    expect(claimStaminaAd(state, new Date('2026-07-13T10:00:00')).granted).toBe(false);
  });
});
