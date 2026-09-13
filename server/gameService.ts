import { DatabaseSync } from 'node:sqlite';

export interface LevelConfig {
  level: number;
  name: string;
  minCtz: number;
  tapMultiplier: number;
  maxEnergyBonus: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, name: 'Beginner', minCtz: 0, tapMultiplier: 1, maxEnergyBonus: 0 },
  { level: 2, name: 'Starter', minCtz: 5000, tapMultiplier: 1.5, maxEnergyBonus: 200 },
  { level: 3, name: 'Explorer', minCtz: 25000, tapMultiplier: 2, maxEnergyBonus: 500 },
  { level: 4, name: 'Pro', minCtz: 100000, tapMultiplier: 3, maxEnergyBonus: 1000 },
  { level: 5, name: 'Expert', minCtz: 500000, tapMultiplier: 4, maxEnergyBonus: 2000 },
  { level: 6, name: 'Master', minCtz: 2000000, tapMultiplier: 5, maxEnergyBonus: 3500 },
  { level: 7, name: 'Legend', minCtz: 10000000, tapMultiplier: 8, maxEnergyBonus: 5000 },
];

export const DAILY_REWARDS = [100, 200, 300, 500, 750, 1000, 2500];

export function getLevelForCtz(totalEarned: number): LevelConfig {
  let matched = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalEarned >= lvl.minCtz) {
      matched = lvl;
    } else {
      break;
    }
  }
  return matched;
}

export function getNextLevel(currentLevel: number): LevelConfig | null {
  return LEVELS.find(l => l.level === currentLevel + 1) || null;
}

/**
 * Calculates current regenerated energy based on elapsed server timestamp.
 */
export function calculateRegeneratedEnergy(
  storedEnergy: number,
  maxEnergy: number,
  lastUpdated: number,
  regenSecondsPerUnit: number = 1
): { currentEnergy: number; newLastUpdated: number; secondsUntilFull: number } {
  const now = Date.now();
  if (storedEnergy >= maxEnergy) {
    return {
      currentEnergy: maxEnergy,
      newLastUpdated: now,
      secondsUntilFull: 0,
    };
  }

  const elapsedMs = Math.max(0, now - lastUpdated);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const unitsGained = Math.floor(elapsedSeconds / regenSecondsPerUnit);

  if (unitsGained <= 0) {
    const energyNeeded = maxEnergy - storedEnergy;
    const secondsRemaining = energyNeeded * regenSecondsPerUnit - (elapsedSeconds % regenSecondsPerUnit);
    return {
      currentEnergy: storedEnergy,
      newLastUpdated: lastUpdated,
      secondsUntilFull: Math.max(0, secondsRemaining),
    };
  }

  const newEnergy = Math.min(maxEnergy, storedEnergy + unitsGained);
  const remainderMs = elapsedMs % (regenSecondsPerUnit * 1000);
  const newLastUpdated = now - remainderMs;

  const energyNeeded = Math.max(0, maxEnergy - newEnergy);
  const secondsUntilFull = energyNeeded * regenSecondsPerUnit;

  return {
    currentEnergy: newEnergy,
    newLastUpdated,
    secondsUntilFull,
  };
}

export function getSetting(db: DatabaseSync, key: string, fallback: string): string {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}
