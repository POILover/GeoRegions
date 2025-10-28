import { computed } from "vue";
import { groups } from "../group";
import { useGroup } from "./group";
import { useLanguage } from "./language";
import type { DivisionId } from "../../types";
const { language } = useLanguage();
const { currentGroupId } = useGroup();

export const useDivision = () => {
  const DIVISION_IDS = computed(() => Object.keys(groups[currentGroupId.value]!.divisions) as DivisionId[]);
  const TOTAL_DIVISIONS = computed(() => DIVISION_IDS.value.length);

  const getDivisionNameById = (divisionId: DivisionId) => groups[currentGroupId.value]?.divisions[divisionId]?.[language.value] || divisionId

  return { DIVISION_IDS, TOTAL_DIVISIONS, getDivisionNameById };
}