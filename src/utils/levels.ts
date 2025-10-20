export const calculateLevel = (totalPainted: number): number => {
	const base = Math.pow(30, 0.65);
	return Math.pow(totalPainted, 0.65) / base;
};

export const calculateDropletsForLevel = (level: number): number => {
	return Math.floor(level) * 500;
};

export const calculateMaxChargesForLevel = (level: number): number => {
	return 20 + (Math.floor(level) * 2);
};
