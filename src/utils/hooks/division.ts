import { computed } from "vue";
import { groups } from "../group";
import { ensureStats, type StatsData } from "../stats";
import { setStats } from "../storage/stats";
import { useGroup } from "./group";

export interface WeightedCounty {
  county: string;
  weight: number;
}
const { currentGroupId } = useGroup();
export const useDivision = () => {

  const DIVISION_IDS = computed(() => Object.keys(groups.find(group => group.id === currentGroupId.value)?.divisions || {}));
  const TOTAL_DIVISIONS = computed(() => DIVISION_IDS.value.length);

  const weightForCounty = (stats: StatsData, county: string, previous?: string): number => {
    const entry = ensureStats(stats, county);
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
    if (previous && county === previous) {
      weight *= 0.6;
    }
    return weight;
  };

  const pickNextCounty = (stats: StatsData, previous?: string): string => {
    const weighted: WeightedCounty[] = DIVISION_IDS.value.map((county) => ({
      county,
      weight: weightForCounty(stats, county, previous),
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    for (const { county, weight } of weighted) {
      threshold -= weight;
      if (threshold <= 0) {
        return county;
      }
    }
    // 确保总是返回一个县
    return weighted[weighted.length - 1]?.county || DIVISION_IDS.value[0]!;
  };

  const applyNextCounty = (stats: StatsData, nextCounty: string): { stats: StatsData; currentCounty: string } => {
    const nextEntry = ensureStats(stats, nextCounty);
    const statsWithSeen = {
      ...stats,
      [nextCounty]: {
        ...nextEntry,
        seen: nextEntry.seen + 1,
      },
    };
    setStats(statsWithSeen);
    return { stats: statsWithSeen, currentCounty: nextCounty };
  };

  const advanceDivision = (stats: StatsData, previousCounty?: string): { stats: StatsData; currentCounty: string } => {
    const nextCounty = pickNextCounty(stats, previousCounty);
    return applyNextCounty(stats, nextCounty);
  };
  return { DIVISION_IDS, TOTAL_DIVISIONS, pickNextCounty, applyNextCounty, advanceDivision };
}