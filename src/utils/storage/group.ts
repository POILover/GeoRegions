import { loadLocalStorage, saveLocalStorage } from "./storage";

const CURRENT_GROUP_ID_STORAGE_KEY = "geo-regions-current-group-id";
const DEFAULT_CURRENT_GROUP_ID = "../assets/countries/uk.svg"; // 向原作者致敬, 默认国家是英国

export const loadCurrentGroupId = (): string => {
    return loadLocalStorage(CURRENT_GROUP_ID_STORAGE_KEY) || DEFAULT_CURRENT_GROUP_ID;
}

export const setCurrentGroupId = (groupId: string): void => {
    saveLocalStorage(CURRENT_GROUP_ID_STORAGE_KEY, groupId);
}