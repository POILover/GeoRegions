export const loadLocalStorage = (key: string) => {
	return JSON.parse(localStorage.getItem(key) || 'null');
}

export const saveLocalStorage = (key: string, value: any) => {
	localStorage.setItem(key, JSON.stringify(value));
}
