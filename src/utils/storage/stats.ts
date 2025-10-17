import { loadCurrentGroupId } from "./group";
import { loadLocalStorage, saveLocalStorage } from "./storage";

const STORAGE_KEY_SUFFIX = "geo-regions-stats";

export const loadStatsStorageKey = (): string => {
    const currentGroupId = loadCurrentGroupId();
    return `${currentGroupId}-${STORAGE_KEY_SUFFIX}`;
}
export const loadStats = (): any => {
    const key = loadStatsStorageKey();
    return loadLocalStorage(key) || {};
}
export const setStats = (stats: any): void => {
    const key = loadStatsStorageKey();
    saveLocalStorage(key, stats);
}