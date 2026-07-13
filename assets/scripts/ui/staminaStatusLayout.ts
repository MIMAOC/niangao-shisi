import { STAMINA_MAX } from '../core/stamina';

export function getStaminaLabelOffsetY(stamina: number): number {
  return stamina >= STAMINA_MAX ? 0 : 13;
}
