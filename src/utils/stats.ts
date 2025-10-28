import type { DivisionId } from "../types";

export interface DivisionStats {
  seen: number;
  correct: number;
  wrong: number;
}

export interface StatsData {
  [division: string]: DivisionStats;
}

const defaultStats: DivisionStats = { seen: 0, correct: 0, wrong: 0 };

export const ensureStats = (stats: StatsData, division: DivisionId): DivisionStats => {
  return stats[division] ?? { ...defaultStats };
};