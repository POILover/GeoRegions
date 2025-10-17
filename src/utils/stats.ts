export interface CountyStats {
  seen: number;
  correct: number;
  wrong: number;
}

export interface StatsData {
  [county: string]: CountyStats;
}
const defaultStats: CountyStats = { seen: 0, correct: 0, wrong: 0 };
export const ensureStats = (stats: StatsData, county: string): CountyStats => {
  return stats[county] ?? { ...defaultStats };
};