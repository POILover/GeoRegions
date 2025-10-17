import { computed, ref } from "vue";
import { loadCurrentGroupId, setCurrentGroupId as setLocalCurrentGroupId } from "../storage/group";
import { groups } from "../group";
import { useLanguage } from "./language";
const { language } = useLanguage()
export const useGroup = () => {
  const currentGroupId = ref<string>(loadCurrentGroupId());
  const setCurrentGroupId = (groupId: string) => {
    currentGroupId.value = groupId;
    setLocalCurrentGroupId(groupId);
  }
  const getGroupNameById = (groupId: string) => {
    return groups[groupId]!.name[language.value] || groupId;
  }
  const currentSvgMap = computed(() => groups[currentGroupId.value]!.svg)
  return { currentSvgMap, currentGroupId, setCurrentGroupId, getGroupNameById };
}