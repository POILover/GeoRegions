import { computed } from "vue";
import { groups } from "../group";
import { ensureStats, type StatsData } from "../stats";
import { useGroup } from "./group";
import { useStats } from "./stats";
import { useLanguage } from "./language";
const { setStats } = useStats();
const { language } = useLanguage();
export interface WeightedDivision {
  division: string;
  weight: number;
}
const { currentGroupId } = useGroup();
export const useDivision = () => {

  const DIVISION_IDS = computed(() => Object.keys(groups[currentGroupId.value]!.divisions));
  const TOTAL_DIVISIONS = computed(() => DIVISION_IDS.value.length);

  const weightForDivision = (stats: StatsData, division: string, previous?: string): number => {
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

  const pickNextDivision = (stats: StatsData, previous?: string): string => {
    const weighted: WeightedDivision[] = DIVISION_IDS.value.map((division) => ({
      division,
      weight: weightForDivision(stats, division, previous),
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    for (const { division, weight } of weighted) {
      threshold -= weight;
      if (threshold <= 0) {
        return division;
      }
    }
    return weighted[weighted.length - 1]?.division || DIVISION_IDS.value[0]!;
  };

  const applyNextDivision = (stats: StatsData, nextDivision: string): { stats: StatsData; currentDivision: string } => {
    const nextEntry = ensureStats(stats, nextDivision);
    const statsWithSeen = {
      ...stats,
      [nextDivision]: {
        ...nextEntry,
        seen: nextEntry.seen + 1,
      },
    };
    setStats(statsWithSeen);
    return { stats: statsWithSeen, currentDivision: nextDivision };
  };

  const advanceDivision = (stats: StatsData, previousDivision?: string): { stats: StatsData; currentDivision: string } => {
    const nextDivision = pickNextDivision(stats, previousDivision);
    return applyNextDivision(stats, nextDivision);
  };
  const getDivisionNameById = (divisionId: string) => groups[currentGroupId.value]?.divisions[divisionId]?.[language.value] || divisionId

  return { DIVISION_IDS, TOTAL_DIVISIONS, getDivisionNameById, pickNextDivision, applyNextDivision, advanceDivision };
}