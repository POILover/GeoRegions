import { ref } from "vue";
import { loadCurrentGroupId, setCurrentGroupId as setLocalCurrentGroupId } from "../storage/group";

export const useGroup = () => {
  const currentGroupId = ref<string>(loadCurrentGroupId());
  const setCurrentGroupId = (groupId: string) => {
    currentGroupId.value = groupId;
    setLocalCurrentGroupId(groupId);

  }
  return { currentGroupId, setCurrentGroupId };
}