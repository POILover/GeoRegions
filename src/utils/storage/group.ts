import { DEFAULT_CURRENT_GROUP_ID } from "../group";
import { loadLocalStorage, saveLocalStorage } from "./storage";

const CURRENT_GROUP_ID_STORAGE_KEY = "geo-regions-current-group-id";

export const loadCurrentGroupId = (): string => {
    return loadLocalStorage(CURRENT_GROUP_ID_STORAGE_KEY) || DEFAULT_CURRENT_GROUP_ID;
}

export const setCurrentGroupId = (groupId: string): void => {
    saveLocalStorage(CURRENT_GROUP_ID_STORAGE_KEY, groupId);
}