import type { DivisionId } from "../types";
import { ensureStats, type StatsData } from "./stats";

// 通过策略计算某个区块的权重
export const weightDivision = (stats: StatsData, division: DivisionId, previous?: DivisionId): number => {
  const entry = ensureStats(stats, division);
  const attempts = entry.correct + entry.wrong;
  const seen = entry.seen;
  if (attempts === 0) {
    return 6.5;
  }
  const missRate = entry.wrong / attempts;
  const freshnessBoost = 1 / (seen + 1);
  let weight = 1 + missRate * 4 + freshnessBoost;
  if (seen === 0) {
    weight += 0.4;
  }
  if (previous && division === previous) {
    weight *= 0.6;
  }
  return weight;
};

// 结合概率和区块权重随机计算要获取的下一个区块的id
export const calculateNextDivision = (divisionIds: DivisionId[], stats: StatsData, previous?: DivisionId): DivisionId => {
  const weighted = divisionIds.map((division) => ({
    division,
    weight: weightDivision(stats, division, previous),
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * totalWeight;
  for (const { division, weight } of weighted) {
    threshold -= weight;
    if (threshold <= 0) {
      return division;
    }
  }
  return weighted[weighted.length - 1]?.division || divisionIds[0]!;
};