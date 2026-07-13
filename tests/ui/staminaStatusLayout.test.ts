import { describe, expect, it } from 'vitest';
import { getStaminaLabelOffsetY } from '../../assets/scripts/ui/staminaStatusLayout';

describe('stamina status layout', () => {
  it('centers the stamina label when the meter is full', () => {
    expect(getStaminaLabelOffsetY(100)).toBe(0);
  });

  it('keeps the stamina label above its recovery details when the meter is not full', () => {
    expect(getStaminaLabelOffsetY(99)).toBe(13);
  });
});
