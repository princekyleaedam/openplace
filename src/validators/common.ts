export function validateSeason(season: string): boolean {
	return season === "s0";
}

export function validateTileCoordinates(tileX: number, tileY: number): boolean {
	return Number.isInteger(tileX) && Number.isInteger(tileY);
}

export function validatePixelCoordinates(x: number, y: number): boolean {
	return Number.isInteger(x) && Number.isInteger(y) &&
		   x >= 0 && x < 1000 &&
		   y >= 0 && y < 1000;
}

export function validatePaginationPage(page: number): boolean {
	return Number.isInteger(page) && page >= 0;
}
