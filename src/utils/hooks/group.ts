import { computed, ref } from "vue";
import { loadCurrentGroupId, setCurrentGroupId as setLocalCurrentGroupId } from "../storage/group";
import { groups } from "../group";
import { useLanguage } from "./language";
import type { GroupId } from "../../types";
const { language } = useLanguage()
export const useGroup = () => {
  const currentGroupId = ref<GroupId>(loadCurrentGroupId());
  const currentSvgMap = computed(() => groups[currentGroupId.value]!.svg)

  const setCurrentGroupId = (groupId: GroupId) => {
    currentGroupId.value = groupId;
    setLocalCurrentGroupId(groupId);
  }

  const getGroupNameById = (groupId: GroupId) => {
    return groups[groupId]!.name[language.value] || groupId;
  }
  
  return { currentSvgMap, currentGroupId, setCurrentGroupId, getGroupNameById };
}