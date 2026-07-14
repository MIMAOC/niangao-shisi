import type { LevelConfig } from '../core/types';

export function getLevelExperienceProgress(
  experience: number,
  shopLevel: number,
  levels: LevelConfig[]
): number {
  const ordered = [...levels].sort((left, right) => left.level - right.level);
  const currentIndex = ordered.findIndex((level) => level.level === shopLevel);
  const current = ordered[currentIndex];
  const next = ordered[currentIndex + 1];
  if (!current || !next) return 1;

  const progress = (experience - current.cumulativeExperience) /
    (next.cumulativeExperience - current.cumulativeExperience);
  return Math.min(1, Math.max(0, progress));
}
