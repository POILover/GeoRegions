export interface DivisionStats {
  seen: number;
  correct: number;
  wrong: number;
}

export interface StatsData {
  [county: string]: DivisionStats;
}

const defaultStats: DivisionStats = { seen: 0, correct: 0, wrong: 0 };

export const ensureStats = (stats: StatsData, county: string): DivisionStats => {
  return stats[county] ?? { ...defaultStats };
};