import { useGroup } from "../hooks/group";
import { loadLocalStorage, saveLocalStorage } from "../storage/storage";

const STORAGE_KEY_SUFFIX = "geo-regions-stats";
const { currentGroupId: currentGroupIdRef } = useGroup();

const loadStatsStorageKey = (): string => {
  const currentGroupId = currentGroupIdRef.value;
  return `${currentGroupId}-${STORAGE_KEY_SUFFIX}`;
}

export const useStats = () => {
  const loadStats = (): any => {
    const key = loadStatsStorageKey();
    return loadLocalStorage(key) || {};
  }
  const setStats = (stats: any): void => {
    const key = loadStatsStorageKey();
    saveLocalStorage(key, stats);
  }
  return { loadStats, setStats };
}